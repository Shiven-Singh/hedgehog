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
