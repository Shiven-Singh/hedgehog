import fs from 'node:fs';
import path from 'node:path';

// Read at build time from the committed run. Nothing here touches the network.
const ROOT = path.join(process.cwd(), '..');

export type Verdict = 'ABSOLUTE' | 'QUALIFIED' | 'NOT_FOUND';

export interface Finding {
  clauseType: string;
  verdict: Verdict;
  verdictLabel: string;
  note: string;
  quote: string | null;
  quoteAt: string | null;
  overrideQuote: string | null;
  overrideAt: string | null;
  citationWithheld: boolean;
}

export interface Contract {
  id: string;
  title: string;
  sourceTitle: string;
  chars: number;
  findings: Finding[];
}

export interface Review {
  label: string;
  model: string;
  contracts: Contract[];
}

/** Null when no review has been run yet, so the page can show an empty state. */
export function getReview(): Review | null {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'results/solution/report.json'), 'utf8');
    const parsed = JSON.parse(raw) as Review;
    return parsed.contracts?.length ? parsed : null;
  } catch {
    return null;
  }
}

/** The improvement changelog, read straight off disk. */
export function getChangelog(): string {
  return fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
}

export const CLAUSE_ORDER = ['Anti-Assignment', 'Change Of Control', 'Exclusivity'];

/** Short form used in the summary table, where the full sentence will not fit. */
export const SHORT: Record<Verdict, string> = {
  ABSOLUTE: 'Unqualified',
  QUALIFIED: 'Qualified',
  NOT_FOUND: 'Not found',
};

/** CUAD titles are EDGAR filenames; the same tidy-up the CLI applies. */
function readable(raw: string): string {
  const titleCase = (w: string) =>
    /^[A-Z0-9,.&-]+$/.test(w) && w.length > 3 ? w.charAt(0) + w.slice(1).toLowerCase() : w;
  const parts = raw.split('_').filter(Boolean);
  const company = (parts[0] ?? raw)
    .replace(/,/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .map(titleCase)
    .join(' ')
    .trim();
  const kind = parts
    .filter((p) => /agreement|licen[cs]e/i.test(p))
    .map((p) =>
      p.replace(/[-.]/g, ' ').replace(/\b(ex|10|8|k|q|f|s|sb|a|drs|on)\b/gi, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim(),
    )
    .filter(Boolean)
    .pop();
  const pretty = kind ? kind.split(' ').map((w) => titleCase(w.charAt(0).toUpperCase() + w.slice(1))).join(' ') : '';
  return pretty ? `${company}: ${pretty}` : company;
}

/** The contracts queued for review, readable before anything has been run. */
export function getPendingContracts(): { id: string; title: string; chars: number }[] {
  const raw = fs.readFileSync(path.join(ROOT, 'cases/cases.json'), 'utf8');
  const parsed = JSON.parse(raw) as { contracts: { id: string; title: string; chars: number }[] };
  return parsed.contracts.map((c) => ({ ...c, title: readable(c.title) }));
}
