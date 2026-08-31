import fs from 'node:fs';
import type { Case, Characterization, Contract, Finding, RunManifest, RunResult } from './types.js';
import { call, mapLimit, MODEL, type Content } from './llm.js';
import { appearsVerbatim } from './sections.js';
import { extractJson } from './parse.js';
import { TOOLS, runTool, sectionsFor } from './tools.js';

// The whole design sits in the second stage of this prompt. Finding the clause
// is the easy half and the baseline already does it. What the baseline cannot do
// is notice that the clause it found is undone somewhere else, so the agent is
// told to go and look, and given the tools to do it.

const SYSTEM = `You are helping a junior associate with due diligence on an acquisition.

You will be asked about one clause type in one contract. Work in two stages and do
not skip the second one.

First, find the clause. Search for the language that would create it, then read the
sections you find in full rather than judging them from a snippet.

Second, find out whether anything overrides it. Contracts routinely restrict something
in one place and then permit it in another. Search for the language that creates
exceptions, such as "notwithstanding", "except", "provided that", "shall not apply"
and "subject to", and search for the subject matter of the clause turning up a second
time somewhere else. Read anything promising in full. An exception buried twenty pages
away is still an exception.

Only once you have done both, answer with this JSON and nothing else:

{
  "characterization": "ABSOLUTE" | "QUALIFIED" | "NOT_FOUND",
  "quote": "verbatim text of the operative clause, or null",
  "overrideQuote": "verbatim text of the passage creating the exception, or null",
  "note": "one or two sentences for the reviewer"
}

ABSOLUTE means the clause is present and nothing else in the contract limits it.
QUALIFIED means the clause is present but another passage creates an exception.
NOT_FOUND means the contract does not contain this clause at all.

Quotes must be copied word for word from the contract. If you cannot find the clause,
say NOT_FOUND rather than offering your best guess.`;

const MAX_TURNS = 10;

function coerce(raw: unknown, clauseType: Case['clauseType']): Finding {
  const o = (raw ?? {}) as Record<string, unknown>;
  const c = String(o['characterization'] ?? '').toUpperCase();
  const characterization: Characterization =
    c === 'ABSOLUTE' || c === 'QUALIFIED' || c === 'NOT_FOUND' ? c : 'NOT_FOUND';
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    clauseType,
    characterization,
    quote: str(o['quote']),
    overrideQuote: str(o['overrideQuote']),
    note: String(o['note'] ?? ''),
  };
}

async function solveCase(label: string, cs: Case, text: string): Promise<RunResult> {
  const sections = sectionsFor(text);
  const contents: Content[] = [
    {
      role: 'user',
      parts: [
        {
          text:
            `Clause type: ${cs.clauseType}\n\n` +
            `The contract is split into ${sections.length} sections, S001 to ${sections.at(-1)?.id}. ` +
            `Use the tools to read it.`,
        },
      ],
    },
  ];

  let toolCalls = 0;
  let wallMs = 0;
  const usage = { promptTokens: 0, outputTokens: 0, thoughtTokens: 0 };
  let finding: Finding | null = null;

  for (let turn = 0; turn < MAX_TURNS && !finding; turn++) {
    const r = await call(label, { system: SYSTEM, contents, tools: TOOLS, maxTokens: 4000 });
    wallMs += r.wallMs;
    usage.promptTokens += r.usage.promptTokens;
    usage.outputTokens += r.usage.outputTokens;
    usage.thoughtTokens += r.usage.thoughtTokens;

    const calls = r.parts.filter((p) => p.functionCall);
    if (calls.length > 0) {
      contents.push({ role: 'model', parts: calls });
      contents.push({
        role: 'user',
        parts: calls.map((p) => {
          toolCalls++;
          const fc = p.functionCall!;
          return { functionResponse: { name: fc.name, response: { result: runTool(fc.name, fc.args, sections) } } };
        }),
      });
      continue;
    }

    try {
      finding = coerce(extractJson(r.text), cs.clauseType);
    } catch {
      // No tool call and no usable JSON. Ask once, plainly, then give up.
      if (turn >= MAX_TURNS - 2) break;
      contents.push({ role: 'model', parts: [{ text: r.text.slice(0, 500) }] });
      contents.push({ role: 'user', parts: [{ text: 'Reply with the JSON object only.' }] });
    }
  }

  finding ??= {
    clauseType: cs.clauseType,
    characterization: 'NOT_FOUND',
    quote: null,
    overrideQuote: null,
    note: 'the agent did not reach a conclusion within the turn limit',
  };

  process.stdout.write('.');
  return {
    caseId: cs.id,
    finding,
    quoteVerified: finding.quote ? appearsVerbatim(finding.quote, text) : true,
    overrideQuoteVerified: finding.overrideQuote ? appearsVerbatim(finding.overrideQuote, text) : true,
    usage,
    wallMs,
    toolCalls,
  };
}

export async function runAgent(label: string): Promise<void> {
  const { contracts, cases } = JSON.parse(fs.readFileSync('cases/cases.json', 'utf8')) as {
    contracts: Contract[];
    cases: Case[];
  };
  const texts = new Map(contracts.map((c) => [c.id, fs.readFileSync(c.path, 'utf8')]));

  const results = await mapLimit(cases, 3, (cs) => solveCase(label, cs, texts.get(cs.contractId)!));
  process.stdout.write('\n');

  const manifest: RunManifest = {
    label,
    model: MODEL,
    startedAt: new Date().toISOString(),
    results,
    totals: {
      promptTokens: results.reduce((a, r) => a + r.usage.promptTokens, 0),
      outputTokens: results.reduce((a, r) => a + r.usage.outputTokens + r.usage.thoughtTokens, 0),
      wallMs: Math.max(...results.map((r) => r.wallMs)),
      cases: results.length,
    },
  };
  fs.mkdirSync(`results/${label}`, { recursive: true });
  fs.writeFileSync(`results/${label}/manifest.json`, JSON.stringify(manifest, null, 2));
  console.log(
    `${label}: ${results.length} cases, ${results.reduce((a, r) => a + r.toolCalls, 0)} tool calls, ` +
      `${manifest.totals.promptTokens.toLocaleString()} prompt tokens`,
  );
}
