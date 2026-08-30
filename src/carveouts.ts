import type { ClauseType } from './types.js';

/**
 * Synthetic override language, one per clause type.
 *
 * These are INJECTED into real CUAD contracts to create ground truth for the
 * override-detection task. CUAD labels where a clause is, but not whether some
 * other passage silently qualifies it, so that half of the ground truth does
 * not exist and has to be manufactured. See README for the honest caveat: an
 * injected carve-out is probably easier to find than one that grew naturally.
 */
export const CARVE_OUTS: Record<ClauseType, { heading: string; text: string }> = {
  'Anti-Assignment': {
    heading: 'Permitted Transfers.',
    text:
      'Notwithstanding any provision of this Agreement restricting assignment, delegation or transfer, ' +
      'either party may assign this Agreement in its entirety, without the prior written consent of the other party, ' +
      'to an Affiliate or in connection with a merger, consolidation, corporate reorganization, or the sale of all or ' +
      'substantially all of its assets or equity to which this Agreement relates, provided that the assigning party ' +
      'gives written notice of such assignment within thirty (30) days following its effective date.',
  },
  'Change Of Control': {
    heading: 'Change of Control Exception.',
    text:
      'Notwithstanding any provision of this Agreement granting a right of termination or requiring consent upon a ' +
      'change of control, no such right or consent requirement shall arise where the surviving or acquiring entity was ' +
      'an Affiliate of the transferring party immediately prior to the transaction, or where the transaction is effected ' +
      'solely to change the jurisdiction of incorporation of the transferring party.',
  },
  Exclusivity: {
    heading: 'Scope of Exclusivity.',
    text:
      'Notwithstanding any exclusivity, minimum commitment or restrictive covenant set forth in this Agreement, nothing ' +
      'herein shall prevent either party from continuing to market, sell, license or distribute any product or service ' +
      'that it offered prior to the Effective Date, or from engaging any counterparty in a territory in which the other ' +
      'party does not maintain an active commercial presence as of the date of such engagement.',
  },
};

/**
 * Insert the override at a paragraph boundary in the final third of the document,
 * deterministically. Real carve-outs are scattered; ours sit late, which is a
 * documented limitation rather than a hidden one.
 */
export function injectCarveOut(text: string, clause: ClauseType): { text: string; inserted: string } {
  const { heading, text: body } = CARVE_OUTS[clause];
  const inserted = `${heading} ${body}`;
  const anchor = Math.floor(text.length * 0.78);
  const idx = text.indexOf('\n\n', anchor);
  const at = idx === -1 ? text.length : idx;
  return { text: text.slice(0, at) + `\n\n${inserted}\n` + text.slice(at), inserted };
}
