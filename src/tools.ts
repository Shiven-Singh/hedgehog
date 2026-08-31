import type { Section } from './types.js';
import { normalize, splitSections } from './sections.js';
import type { Tool } from './llm.js';

// Two tools, not ten. The agent needs to find candidate passages and then read
// them properly; everything else it can reason about from what it has read.

export const TOOLS: Tool[] = [
  {
    name: 'search_contract',
    description:
      'Search the contract for a phrase and get back the sections that contain it, ' +
      'each with a short snippet. Use it to find a clause, and then again to look for ' +
      'language elsewhere that might override the clause you found.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A word or short phrase to look for.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_section',
    description: 'Read one section of the contract in full, by its identifier, for example S014.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'A section identifier returned by search_contract.' },
      },
      required: ['id'],
    },
  },
];

export function runTool(name: string, args: Record<string, unknown>, sections: Section[]): string {
  if (name === 'search_contract') {
    const q = normalize(String(args['query'] ?? ''));
    if (!q) return 'Empty query.';
    const hits = sections.filter((s) => normalize(s.text).includes(q));
    if (hits.length === 0) return `No section contains "${args['query']}".`;
    return hits
      .slice(0, 8)
      .map((s) => {
        const i = normalize(s.text).indexOf(q);
        return `${s.id}: ...${s.text.replace(/\s+/g, ' ').slice(Math.max(0, i - 120), i + 240)}...`;
      })
      .join('\n\n');
  }

  if (name === 'read_section') {
    const id = String(args['id'] ?? '').toUpperCase();
    const s = sections.find((x) => x.id === id);
    return s ? `${s.id}:\n\n${s.text}` : `No section ${id}. Sections run S001 to ${sections.at(-1)?.id}.`;
  }

  return `Unknown tool ${name}.`;
}

export const sectionsFor = (text: string): Section[] => splitSections(text);
