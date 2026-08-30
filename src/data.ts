import fs from 'node:fs';
import path from 'node:path';
import { CLAUSE_TYPES, type Case, type ClauseType, type Contract } from './types.js';
import { injectCarveOut } from './carveouts.js';
import { appearsVerbatim } from './sections.js';

const RAW = 'data/raw/CUAD_v1/CUAD_v1.json';
const OUT_DIR = 'cases';
const CONTRACTS_DIR = path.join(OUT_DIR, 'contracts');

const MIN_CHARS = 25_000;
const MAX_CHARS = 70_000;
const N_CONTRACTS = 8;

const slug = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const categoryOf = (id: string) => id.split('__').slice(1).join('__');

interface Cuad {
  data: { title: string; paragraphs: { context: string; qas: { id: string; answers: { text: string }[] }[] }[] }[];
}

export function prepareData(): void {
  if (!fs.existsSync(RAW)) {
    throw new Error(`Missing ${RAW}. Run scripts/fetch-cuad.sh first.`);
  }
  const cuad: Cuad = JSON.parse(fs.readFileSync(RAW, 'utf8'));

  // 1. Score every contract on the three target clause types.
  const scored = cuad.data.map((d) => {
    const p = d.paragraphs[0]!;
    const spans: Record<string, string[]> = {};
    for (const qa of p.qas) spans[categoryOf(qa.id)] = qa.answers.map((a) => a.text);
    const present = CLAUSE_TYPES.filter((c) => (spans[c] ?? []).length > 0).length;
    return { title: d.title, context: p.context, spans, present };
  });

  // 2. Deliberately mix contracts where all three clauses exist with ones where
  //    only two do, so the eval contains genuine absences and can measure whether
  //    the system invents a clause that is not there.
  const band = scored.filter((c) => c.context.length >= MIN_CHARS && c.context.length <= MAX_CHARS);
  const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);
  const all3 = band.filter((c) => c.present === 3).sort(byTitle).slice(0, N_CONTRACTS / 2);
  const only2 = band.filter((c) => c.present === 2).sort(byTitle).slice(0, N_CONTRACTS / 2);
  const chosen = [...all3, ...only2].sort(byTitle);

  if (chosen.length < N_CONTRACTS) {
    throw new Error(`Only found ${chosen.length} contracts in band; need ${N_CONTRACTS}`);
  }

  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  const contracts: Contract[] = [];
  const cases: Case[] = [];

  chosen.forEach((c, ci) => {
    const id = slug(c.title);
    let text = c.context;
    const injected: Partial<Record<ClauseType, string>> = {};

    // 3. Inject an override into half the (contract, clause) pairs, deterministically.
    CLAUSE_TYPES.forEach((clause, cli) => {
      const hasClause = (c.spans[clause] ?? []).length > 0;
      if (!hasClause) return;
      if ((ci + cli) % 2 !== 0) return;
      const r = injectCarveOut(text, clause);
      text = r.text;
      injected[clause] = r.inserted;
    });

    const file = path.join(CONTRACTS_DIR, `${id}.txt`);
    fs.writeFileSync(file, text);
    contracts.push({ id, title: c.title, path: file, chars: text.length });

    CLAUSE_TYPES.forEach((clause) => {
      const goldSpans = c.spans[clause] ?? [];
      const carve = injected[clause];
      cases.push({
        id: `${id}::${clause}`,
        contractId: id,
        clauseType: clause,
        truth: {
          goldSpans,
          carveOut: carve ? { sectionRef: 'injected', text: carve } : null,
          expected: goldSpans.length === 0 ? 'NOT_FOUND' : carve ? 'QUALIFIED' : 'ABSOLUTE',
        },
      });
    });
  });

  // 4. Integrity check: every gold span must survive injection verbatim.
  let bad = 0;
  for (const cs of cases) {
    const text = fs.readFileSync(path.join(CONTRACTS_DIR, `${cs.contractId}.txt`), 'utf8');
    for (const g of cs.truth.goldSpans) {
      if (g.length >= 12 && !appearsVerbatim(g, text)) bad++;
    }
    if (cs.truth.carveOut && !appearsVerbatim(cs.truth.carveOut.text, text)) bad++;
  }
  if (bad > 0) throw new Error(`${bad} ground-truth spans did not survive injection`);

  fs.writeFileSync(path.join(OUT_DIR, 'cases.json'), JSON.stringify({ contracts, cases }, null, 2));

  const dist = cases.reduce<Record<string, number>>((a, c) => {
    a[c.truth.expected] = (a[c.truth.expected] ?? 0) + 1;
    return a;
  }, {});
  console.log(`contracts: ${contracts.length}`);
  console.log(`cases:     ${cases.length}`);
  console.log(`expected:  ${JSON.stringify(dist)}`);
  console.log(`integrity: all ground-truth spans verified verbatim`);
  console.log(`written:   ${path.join(OUT_DIR, 'cases.json')}`);
}
