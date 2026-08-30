import fs from 'node:fs';
import path from 'node:path';
import type { Case, Characterization, Contract, Finding, RunManifest, RunResult } from './types.js';
import { callClaude, textOf, MODEL } from './llm.js';
import { appearsVerbatim } from './sections.js';
import { extractJson } from './parse.js';

/**
 * The simple baseline: one direct prompt, the whole contract in context, no tools,
 * no verification, no second pass. This is what a competent person builds first and
 * it is the comparison the agent has to beat. It is deliberately not a straw man:
 * same model, same effort, same output schema, same 24 cases.
 */

const SYSTEM_INSTRUCTIONS = `You are assisting a junior associate with M&A due diligence.

For the requested clause type, decide which of these is true and reply with JSON only:

  ABSOLUTE  - the clause is present and nothing else in the contract limits it
  QUALIFIED - the clause is present but another passage creates an exception to it
  NOT_FOUND - the contract does not contain this clause

Reply with exactly this JSON shape and nothing else:

{
  "characterization": "ABSOLUTE" | "QUALIFIED" | "NOT_FOUND",
  "quote": "<verbatim text of the operative clause, or null>",
  "overrideQuote": "<verbatim text of the passage that creates the exception, or null>",
  "note": "<one or two sentences for the reviewer>"
}

Quotes must be copied verbatim from the contract. Do not paraphrase them.`;

function coerceFinding(raw: unknown, clauseType: Case['clauseType']): Finding {
  const o = (raw ?? {}) as Record<string, unknown>;
  const c = String(o['characterization'] ?? 'NOT_FOUND').toUpperCase();
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

  const results: RunResult[] = [];
  let totalCost = 0;
  let totalWall = 0;

  for (const cs of cases) {
    const contract = byId.get(cs.contractId)!;
    const text = fs.readFileSync(contract.path, 'utf8');

    const r = await callClaude('baseline', {
      system: [
        { type: 'text', text: SYSTEM_INSTRUCTIONS },
        // Cached: the same contract is asked about once per clause type.
        { type: 'text', text: `CONTRACT:\n\n${text}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: `Clause type: ${cs.clauseType}` }],
      maxTokens: 4000,
    });

    let finding: Finding;
    try {
      finding = coerceFinding(extractJson(textOf(r.message)), cs.clauseType);
    } catch {
      finding = {
        clauseType: cs.clauseType,
        characterization: 'NOT_FOUND',
        quote: null,
        overrideQuote: null,
        note: 'response could not be parsed',
      };
    }

    results.push({
      caseId: cs.id,
      finding,
      quoteVerified: finding.quote ? appearsVerbatim(finding.quote, text) : true,
      overrideQuoteVerified: finding.overrideQuote ? appearsVerbatim(finding.overrideQuote, text) : true,
      usage: r.usage,
      wallMs: r.wallMs,
      toolCalls: 0,
    });
    totalCost += r.usage.costUsd;
    totalWall += r.wallMs;
    process.stdout.write(`${r.cached ? 'c' : '.'}`);
  }
  process.stdout.write('\n');

  const manifest: RunManifest = {
    label: 'baseline',
    model: MODEL,
    startedAt: new Date().toISOString(),
    results,
    totals: { costUsd: totalCost, wallMs: totalWall, cases: results.length },
  };
  fs.mkdirSync('results/baseline', { recursive: true });
  fs.writeFileSync('results/baseline/manifest.json', JSON.stringify(manifest, null, 2));
  console.log(`baseline: ${results.length} cases, $${totalCost.toFixed(4)}, ${(totalWall / 1000).toFixed(1)}s`);
}
