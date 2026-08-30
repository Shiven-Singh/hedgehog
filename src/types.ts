export const CLAUSE_TYPES = ['Anti-Assignment', 'Change Of Control', 'Exclusivity'] as const;
export type ClauseType = (typeof CLAUSE_TYPES)[number];

/** What the system concluded about a clause after reading the whole contract. */
export type Characterization = 'ABSOLUTE' | 'QUALIFIED' | 'NOT_FOUND';

export interface Section {
  id: string;      // S001, S002, ...
  text: string;
  start: number;   // char offset into the contract
}

export interface Contract {
  id: string;      // slug
  title: string;
  path: string;    // cases/contracts/<id>.txt
  chars: number;
}

export interface GroundTruth {
  /** Attorney-labelled spans from CUAD for this clause type. */
  goldSpans: string[];
  /** Present only where we injected an override. */
  carveOut: { sectionRef: string; text: string } | null;
  expected: Characterization;
}

export interface Case {
  id: string;              // <contractId>::<clauseType>
  contractId: string;
  clauseType: ClauseType;
  truth: GroundTruth;
}

/** One clause finding produced by the baseline or the agent. */
export interface Finding {
  clauseType: ClauseType;
  characterization: Characterization;
  /** Verbatim quote of the operative clause, or null when NOT_FOUND. */
  quote: string | null;
  /** Verbatim quote of the language that overrides it, when QUALIFIED. */
  overrideQuote: string | null;
  /** Free-text reasoning shown to the reviewer. */
  note: string;
}

export interface RunResult {
  caseId: string;
  finding: Finding;
  /** Verbatim-verification outcome for the quotes above. */
  quoteVerified: boolean;
  overrideQuoteVerified: boolean;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
  wallMs: number;
  toolCalls: number;
}

export interface RunManifest {
  label: string;            // 'baseline' | 'iter-01' | ...
  model: string;
  startedAt: string;
  results: RunResult[];
  totals: { costUsd: number; wallMs: number; cases: number };
}
