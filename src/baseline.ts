import fs from 'node:fs';
import type { Case, Characterization, Contract, Finding, RunManifest, RunResult } from './types.js';
import { call, mapLimit, MODEL } from './llm.js';
import { appearsVerbatim } from './sections.js';
import { extractJson } from './parse.js';

// The simple baseline: one direct prompt with the whole contract in context, no
// tools, no second pass, no verification of any kind. It is what most people
// would build first, and it is deliberately not a straw man. Same model, same
// output schema, same twenty four cases as the agent gets.

const SYSTEM = `You are assisting a junior associate with due diligence on an acquisition.

For the clause type you are asked about, decide which of these is true:

  ABSOLUTE  the clause is present and nothing else in the contract limits it
  QUALIFIED the clause is present but another passage creates an exception to it
  NOT_FOUND the contract does not contain this clause

Reply with this JSON and nothing else:

{
  "characterization": "ABSOLUTE" | "QUALIFIED" | "NOT_FOUND",
  "quote": "verbatim text of the operative clause, or null",
  "overrideQuote": "verbatim text of the passage creating the exception, or null",
  "note": "one or two sentences for the reviewer"
}

Quotes must be copied from the contract word for word. Do not paraphrase them.`;

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

export async function runBaseline(): Promise<void> {
  const { contracts, cases } = JSON.parse(fs.readFileSync('cases/cases.json', 'utf8')) as {
    contracts: Contract[];
    cases: Case[];
  };
  const byId = new Map(contracts.map((c) => [c.id, c]));
  const texts = new Map(contracts.map((c) => [c.id, fs.readFileSync(c.path, 'utf8')]));

  const results = await mapLimit(cases, 6, async (cs): Promise<RunResult> => {
    const text = texts.get(cs.contractId)!;
    const r = await call('baseline', {
      system: SYSTEM,
      contents: [
        { role: 'user', parts: [{ text: `CONTRACT:\n\n${text}\n\nClause type: ${cs.clauseType}` }] },
      ],
      maxTokens: 4000,
    });

    let finding: Finding;
    try {
      finding = coerce(extractJson(r.text), cs.clauseType);
    } catch {
      finding = {
        clauseType: cs.clauseType,
        characterization: 'NOT_FOUND',
        quote: null,
        overrideQuote: null,
        note: 'the response could not be parsed',
      };
    }

    process.stdout.write(r.cached ? 'c' : '.');
    return {
      caseId: cs.id,
      finding,
      quoteVerified: finding.quote ? appearsVerbatim(finding.quote, text) : true,
      overrideQuoteVerified: finding.overrideQuote ? appearsVerbatim(finding.overrideQuote, text) : true,
      usage: r.usage,
      wallMs: r.wallMs,
      toolCalls: 0,
    };
  });
  process.stdout.write('\n');

  const manifest: RunManifest = {
    label: 'baseline',
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
  fs.mkdirSync('results/baseline', { recursive: true });
  fs.writeFileSync('results/baseline/manifest.json', JSON.stringify(manifest, null, 2));
  console.log(
    `baseline: ${results.length} cases, ` +
      `${manifest.totals.promptTokens.toLocaleString()} prompt tokens, ` +
      `${manifest.totals.outputTokens.toLocaleString()} output tokens`,
  );
}
