import fs from 'node:fs';
import path from 'node:path';
import type { Case, RunManifest } from './types.js';

// Scores any run against the frozen cases. Reads only what is already on disk,
// so it works offline with no key, which is how a reviewer checks the numbers.

export interface Scores {
  label: string;
  model: string;
  cases: number;
  accuracy: number;
  falseAbsolute: { n: number; of: number };
  inventedClause: { n: number; of: number };
  missedClause: { n: number; of: number };
  unverifiedQuote: { n: number; of: number };
  promptTokens: number;
  outputTokens: number;
}

export function scoreRun(manifest: RunManifest, cases: Case[]): Scores {
  const truth = new Map(cases.map((c) => [c.id, c.truth.expected]));

  let correct = 0;
  let falseAbsolute = 0;
  let qualified = 0;
  let invented = 0;
  let absent = 0;
  let missed = 0;
  let present = 0;
  let unverified = 0;
  let quoted = 0;

  for (const r of manifest.results) {
    const expected = truth.get(r.caseId)!;
    const got = r.finding.characterization;
    if (expected === got) correct++;

    // The headline number. A clause reported as unconditional when something
    // later in the contract overrides it is the error that costs money.
    if (expected === 'QUALIFIED') {
      qualified++;
      if (got === 'ABSOLUTE') falseAbsolute++;
    }
    if (expected === 'NOT_FOUND') {
      absent++;
      if (got !== 'NOT_FOUND') invented++;
    }
    if (expected !== 'NOT_FOUND') {
      present++;
      if (got === 'NOT_FOUND') missed++;
    }
    if (r.finding.quote) {
      quoted++;
      if (!r.quoteVerified) unverified++;
    }
  }

  return {
    label: manifest.label,
    model: manifest.model,
    cases: manifest.results.length,
    accuracy: correct / manifest.results.length,
    falseAbsolute: { n: falseAbsolute, of: qualified },
    inventedClause: { n: invented, of: absent },
    missedClause: { n: missed, of: present },
    unverifiedQuote: { n: unverified, of: quoted },
    promptTokens: manifest.totals.promptTokens,
    outputTokens: manifest.totals.outputTokens,
  };
}

const pct = (n: number, of: number) => (of === 0 ? 'n/a' : `${((n / of) * 100).toFixed(0)}% (${n}/${of})`);

export function scoreAll(): void {
  const { cases } = JSON.parse(fs.readFileSync('cases/cases.json', 'utf8')) as { cases: Case[] };

  const runs = fs
    .readdirSync('results', { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join('results', d.name, 'manifest.json')))
    .map((d) => JSON.parse(fs.readFileSync(path.join('results', d.name, 'manifest.json'), 'utf8')) as RunManifest)
    .sort((a, b) => (a.label === 'baseline' ? -1 : b.label === 'baseline' ? 1 : a.label.localeCompare(b.label)));

  if (runs.length === 0) {
    console.log('No runs found under results/. Run the baseline first.');
    return;
  }

  const scored = runs.map((r) => scoreRun(r, cases));

  console.log();
  console.log('| Run | Characterisation accuracy | False absolute | Invented clause | Missed clause | Unverified quote |');
  console.log('|---|---|---|---|---|---|');
  for (const s of scored) {
    console.log(
      `| ${s.label} | ${(s.accuracy * 100).toFixed(0)}% | ${pct(s.falseAbsolute.n, s.falseAbsolute.of)} ` +
        `| ${pct(s.inventedClause.n, s.inventedClause.of)} | ${pct(s.missedClause.n, s.missedClause.of)} ` +
        `| ${pct(s.unverifiedQuote.n, s.unverifiedQuote.of)} |`,
    );
  }
  console.log();
  console.log('False absolute is the headline: a clause reported as unconditional when the');
  console.log('contract overrides it elsewhere. Lower is better on every column.');
  console.log();

  fs.writeFileSync('results/scores.json', JSON.stringify(scored, null, 2));
}
