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

export function getReview(): Review {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'results/solution/report.json'), 'utf8'));
}

export const CLAUSE_ORDER = ['Anti-Assignment', 'Change Of Control', 'Exclusivity'];

/** Short form used in the summary table, where the full sentence will not fit. */
export const SHORT: Record<Verdict, string> = {
  ABSOLUTE: 'Unqualified',
  QUALIFIED: 'Qualified',
  NOT_FOUND: 'Not found',
};
