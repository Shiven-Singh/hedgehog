import fs from 'node:fs';
import { CLAUSE_TYPES, type Case, type Characterization, type Contract, type Finding, type RunManifest, type RunResult } from './types.js';
import { call, mapLimit, MODEL, type Content } from './llm.js';
import { appearsVerbatim } from './sections.js';
import { extractJson } from './parse.js';

// One change from the baseline: ask about all three clause types in a single call
// instead of sending the same forty pages three times over.
//
// It was made to save tokens and it cut them threefold, but it also took the
// misquoting rate from three in twenty one to zero, which was not the point of it
// and is the most useful thing this project found. See CHANGELOG.md.
//
// Two further changes were tried and are kept here behind flags because both made
// things worse. HEDGEHOG_STRICT=1 adds a sterner instruction about copying quotes
// exactly; it fixed nothing and cost accuracy. HEDGEHOG_REPAIR=1 sends unverifiable
// quotes back to be corrected; it fired six times, added a third to the token bill
// and changed no measure at all.
//
// Quotes are still checked against the contract, and anything that cannot be found
// is withheld rather than shown. That check costs nothing and it is what lets the
// number above be stated as a fact rather than an impression.

const SYSTEM = `You are helping a junior associate with due diligence on an acquisition.

You will be given one contract and asked about several clause types at once. For each
one, decide which of these is true:

  ABSOLUTE  the clause is present and nothing else in the contract limits it
  QUALIFIED the clause is present but another passage creates an exception to it
  NOT_FOUND the contract does not contain this clause

Reply with this JSON and nothing else:

{
  "findings": [
    {
      "clauseType": "the clause type you were asked about",
      "characterization": "ABSOLUTE" | "QUALIFIED" | "NOT_FOUND",
      "quote": "verbatim text of the operative clause, or null",
      "overrideQuote": "verbatim text of the passage creating the exception, or null",
      "note": "one or two sentences for the reviewer"
    }
  ]
}

Quotes must be copied from the contract word for word. Do not paraphrase them.`;

// Kept for the ablation. Setting HEDGEHOG_STRICT=1 puts this back on.
const STRICT_TAIL = `

Every quote must be copied from the contract character for character. Do not tidy up
the spacing, do not join two passages together, and do not paraphrase. If you cannot
reproduce a passage exactly, leave the quote null and say so in the note.`;

const PROMPT = process.env.HEDGEHOG_STRICT === '1' ? SYSTEM + STRICT_TAIL : SYSTEM;
const REPAIRS_ON = process.env.HEDGEHOG_REPAIR === '1';

const MAX_REPAIR_ROUNDS = 2;

function coerce(raw: unknown): Finding[] {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(o['findings']) ? o['findings'] : [];
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return list.map((item) => {
    const f = (item ?? {}) as Record<string, unknown>;
    const c = String(f['characterization'] ?? '').toUpperCase();
    const characterization: Characterization =
      c === 'ABSOLUTE' || c === 'QUALIFIED' || c === 'NOT_FOUND' ? c : 'NOT_FOUND';
    const asked = String(f['clauseType'] ?? '');
    return {
      clauseType: (CLAUSE_TYPES.find((t) => t.toLowerCase() === asked.toLowerCase()) ?? CLAUSE_TYPES[0]),
      characterization,
      quote: str(f['quote']),
      overrideQuote: str(f['overrideQuote']),
      note: String(f['note'] ?? ''),
    };
  });
}

/** Which quotes in a finding cannot be found in the contract. */
function badQuotes(f: Finding, text: string): string[] {
  const bad: string[] = [];
  if (f.quote && !appearsVerbatim(f.quote, text)) bad.push(f.quote);
  if (f.overrideQuote && !appearsVerbatim(f.overrideQuote, text)) bad.push(f.overrideQuote);
  return bad;
}

async function solveContract(
  label: string,
  contract: Contract,
  text: string,
): Promise<{ findings: Finding[]; usage: RunResult['usage']; wallMs: number; repairs: number }> {
  const contents: Content[] = [
    {
      role: 'user',
      parts: [{ text: `CONTRACT:\n\n${text}\n\nClause types: ${CLAUSE_TYPES.join(', ')}` }],
    },
  ];

  const usage = { promptTokens: 0, outputTokens: 0, thoughtTokens: 0 };
  let wallMs = 0;
  let findings: Finding[] = [];
  let repairs = 0;

  const maxRounds = REPAIRS_ON ? MAX_REPAIR_ROUNDS : 0;
  for (let round = 0; round <= maxRounds; round++) {
    const r = await call(label, { system: PROMPT, contents, maxTokens: 6000 });
    wallMs += r.wallMs;
    usage.promptTokens += r.usage.promptTokens;
    usage.outputTokens += r.usage.outputTokens;
    usage.thoughtTokens += r.usage.thoughtTokens;

    try {
      findings = coerce(extractJson(r.text));
    } catch {
      findings = [];
    }

    // The feedback loop. Anything that cannot be located in the source goes back
    // with the offending text attached, rather than being quietly accepted.
    const failures = findings.flatMap((f) => badQuotes(f, text).map((q) => ({ clause: f.clauseType, quote: q })));
    if (findings.length > 0 && failures.length === 0) break;
    if (round === maxRounds) break;

    repairs++;
    contents.push({ role: 'model', parts: [{ text: r.text.slice(0, 2000) }] });
    contents.push({
      role: 'user',
      parts: [
        {
          text:
            findings.length === 0
              ? 'That was not valid JSON in the shape requested. Reply with the JSON object only.'
              : `These quotes do not appear in the contract:\n\n` +
                failures.map((f) => `- ${f.clause}: "${f.quote.slice(0, 200)}"`).join('\n') +
                `\n\nFind the passage you meant and copy it exactly, character for character. ` +
                `If no such passage exists, set that quote to null and say so in the note. ` +
                `Reply with the complete JSON object again.`,
        },
      ],
    });
  }

  // Anything still unverifiable after the repair rounds is dropped rather than shown.
  for (const f of findings) {
    if (f.quote && !appearsVerbatim(f.quote, text)) {
      f.note = `${f.note} [quote withheld: could not be located in the contract]`.trim();
      f.quote = null;
    }
    if (f.overrideQuote && !appearsVerbatim(f.overrideQuote, text)) {
      f.note = `${f.note} [override quote withheld: could not be located in the contract]`.trim();
      f.overrideQuote = null;
    }
  }

  return { findings, usage, wallMs, repairs };
}

export async function runSolution(label: string): Promise<void> {
  const { contracts, cases } = JSON.parse(fs.readFileSync('cases/cases.json', 'utf8')) as {
    contracts: Contract[];
    cases: Case[];
  };
  const texts = new Map(contracts.map((c) => [c.id, fs.readFileSync(c.path, 'utf8')]));

  const perContract = await mapLimit(contracts, 6, async (c) => {
    const out = await solveContract(label, c, texts.get(c.id)!);
    process.stdout.write('.');
    return { id: c.id, ...out };
  });
  process.stdout.write('\n');

  const results: RunResult[] = [];
  for (const cs of cases) {
    const got = perContract.find((p) => p.id === cs.contractId)!;
    const text = texts.get(cs.contractId)!;
    const finding =
      got.findings.find((f) => f.clauseType === cs.clauseType) ??
      ({
        clauseType: cs.clauseType,
        characterization: 'NOT_FOUND',
        quote: null,
        overrideQuote: null,
        note: 'the model returned no finding for this clause type',
      } satisfies Finding);

    // Cost is shared across the three clause types answered in the same call.
    const share = (n: number) => Math.round(n / CLAUSE_TYPES.length);
    results.push({
      caseId: cs.id,
      finding,
      quoteVerified: finding.quote ? appearsVerbatim(finding.quote, text) : true,
      overrideQuoteVerified: finding.overrideQuote ? appearsVerbatim(finding.overrideQuote, text) : true,
      usage: {
        promptTokens: share(got.usage.promptTokens),
        outputTokens: share(got.usage.outputTokens),
        thoughtTokens: share(got.usage.thoughtTokens),
      },
      wallMs: Math.round(got.wallMs / CLAUSE_TYPES.length),
      toolCalls: got.repairs,
    });
  }

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
    `${label}: ${results.length} cases, ${perContract.reduce((a, p) => a + p.repairs, 0)} repair rounds, ` +
      `${manifest.totals.promptTokens.toLocaleString()} prompt tokens`,
  );
}
