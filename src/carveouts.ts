import type { ClauseType } from './types.js';

/**
 * Override language inserted into real CUAD contracts, because CUAD labels where
 * a clause sits and says nothing about whether a later passage undoes it.
 *
 * These are deliberately written without signal words. An earlier version opened
 * every one of them with "Notwithstanding any provision of this Agreement", and a
 * single prompt with the whole contract in context found all nine out of nine, so
 * the task measured nothing. See CHANGELOG.md.
 *
 * These work by redefinition instead. Nothing says "except" or "notwithstanding".
 * Each one narrows what the operative clause covers by asserting that some class
 * of transaction was never within its scope in the first place, which is how a
 * competent drafter would actually bury an exception.
 */
export const CARVE_OUTS: Record<ClauseType, { heading: string; text: string }> = {
  'Anti-Assignment': {
    heading: 'Corporate Reorganisations.',
    text:
      'The parties acknowledge that the transfer of this Agreement to a successor entity in connection with ' +
      'a merger, consolidation, or the sale of all or substantially all of the assets or equity of a party ' +
      'constitutes a continuation of the existing contractual relationship and not an assignment, transfer or ' +
      'delegation for the purposes of this Agreement. The consent requirements set out in this Agreement have ' +
      'no application to any such transaction, and no notice to the other party is required in respect of it.',
  },
  'Change Of Control': {
    heading: 'Continuity of Ownership.',
    text:
      'For the purposes of this Agreement, a transaction in which the ultimate beneficial ownership of a party ' +
      'remains substantially unchanged, including any internal reorganisation, recapitalisation, or transaction ' +
      'effected solely to alter the jurisdiction of incorporation of that party, does not constitute a change of ' +
      'control, an acquisition, or a transfer of control of that party. The rights and obligations arising under ' +
      'this Agreement upon a change of control have no application to any such transaction.',
  },
  Exclusivity: {
    heading: 'Pre-existing Arrangements.',
    text:
      'The parties acknowledge that any product, service, territory or customer relationship in existence as at ' +
      'the Effective Date lies outside the scope of the undertakings given under this Agreement in respect of ' +
      'exclusivity, restricted dealing, or minimum commitment. The continuation, renewal or expansion of any such ' +
      'arrangement by either party is permitted and shall not constitute a breach of this Agreement.',
  },
};

/**
 * Insert the override at a paragraph boundary in the final third of the document.
 * Real exceptions are scattered; ours sit late, which is a documented limitation
 * rather than a hidden one.
 */
export function injectCarveOut(text: string, clause: ClauseType): { text: string; inserted: string } {
  const { heading, text: body } = CARVE_OUTS[clause];
  const inserted = `${heading} ${body}`;
  const anchor = Math.floor(text.length * 0.78);
  const idx = text.indexOf('\n\n', anchor);
  const at = idx === -1 ? text.length : idx;
  return { text: text.slice(0, at) + `\n\n${inserted}\n` + text.slice(at), inserted };
}
