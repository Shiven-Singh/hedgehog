import type { Section } from './types.js';

/** Collapse whitespace so verbatim checks survive the irregular spacing in EDGAR text. */
export function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** True when `quote` appears verbatim in `haystack`, ignoring whitespace differences. */
export function appearsVerbatim(quote: string, haystack: string): boolean {
  const q = normalize(quote);
  if (q.length < 12) return false; // too short to be a meaningful citation
  return normalize(haystack).includes(q);
}

/**
 * Split a contract into addressable sections of roughly `target` characters,
 * breaking only on blank lines so clause boundaries stay intact.
 */
export function splitSections(text: string, target = 1500): Section[] {
  const paras = text.split(/\n\s*\n/);
  const out: Section[] = [];
  let buf = '';
  let start = 0;
  let cursor = 0;
  const flush = () => {
    if (!buf.trim()) return;
    out.push({ id: `S${String(out.length + 1).padStart(3, '0')}`, text: buf.trim(), start });
    buf = '';
  };
  for (const p of paras) {
    if (buf === '') start = cursor;
    buf += (buf ? '\n\n' : '') + p;
    cursor += p.length + 2;
    if (buf.length >= target) flush();
  }
  flush();
  return out;
}
