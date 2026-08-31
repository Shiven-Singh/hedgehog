import fs from 'node:fs';
import type { Case, Contract, RunManifest, RunResult } from './types.js';
import { normalize, splitSections } from './sections.js';

// Turns a run into the thing a person actually reads. Every quoted passage is
// followed by the section it came from, so the reviewer can go and check it, which
// is the entire point of quoting rather than summarising.

const VERDICT: Record<string, string> = {
  ABSOLUTE: 'Present, unqualified',
  QUALIFIED: 'Present, subject to an exception',
  NOT_FOUND: 'Not found',
};

/** Where in the contract a quoted passage sits, so the reviewer can find it. */
function locate(quote: string, text: string): string {
  const sections = splitSections(text);
  const needle = normalize(quote).slice(0, 80);
  const hit = sections.find((s) => normalize(s.text).includes(needle));
  return hit ? hit.id : 'not located';
}

function memoFor(contract: Contract, rows: { cs: Case; r: RunResult }[], text: string): string {
  const lines: string[] = [];
  lines.push(`## ${contract.title}`);
  lines.push('');

  const undetermined: string[] = [];

  for (const { cs, r } of rows) {
    const f = r.finding;
    lines.push(`### ${cs.clauseType}`);
    lines.push('');
    lines.push(`**${VERDICT[f.characterization] ?? f.characterization}**`);
    lines.push('');
    if (f.note) {
      lines.push(f.note);
      lines.push('');
    }
    if (f.quote) {
      lines.push(`> ${f.quote.replace(/\s+/g, ' ').trim()}`);
      lines.push('');
      lines.push(`*Contract text, ${locate(f.quote, text)}.*`);
      lines.push('');
    }
    if (f.overrideQuote) {
      lines.push('The following passage qualifies the clause above:');
      lines.push('');
      lines.push(`> ${f.overrideQuote.replace(/\s+/g, ' ').trim()}`);
      lines.push('');
      lines.push(`*Contract text, ${locate(f.overrideQuote, text)}.*`);
      lines.push('');
    }
    if (f.characterization === 'NOT_FOUND' || /withheld/.test(f.note)) {
      undetermined.push(cs.clauseType);
    }
  }

  if (undetermined.length > 0) {
    lines.push('### Requires a reader');
    lines.push('');
    lines.push(
      `No finding is recorded for ${undetermined.join(', ')}. That means the review did not ` +
        `locate the clause, not that the contract is silent on the point. These should be read by hand.`,
    );
    lines.push('');
  }

  return lines.join('\n');
}

const STYLE = `
:root { color-scheme: light; }
body { margin: 0; background: #faf9f7; color: #1a1a1a;
  font: 16px/1.6 Charter, Georgia, 'Times New Roman', serif; }
main { max-width: 46rem; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
h1 { font-size: 1.9rem; margin: 0 0 .3rem; letter-spacing: -0.01em; }
h2 { font-size: 1.3rem; margin: 3.5rem 0 .2rem; padding-top: 1.4rem;
  border-top: 1px solid #ddd8d0; }
h3 { font-size: 1rem; margin: 2rem 0 .4rem; text-transform: uppercase;
  letter-spacing: .07em; color: #6b6257;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
p { margin: .6rem 0; }
blockquote { margin: .9rem 0 .4rem; padding: .1rem 0 .1rem 1.1rem;
  border-left: 2px solid #b8a888; color: #33302b; }
em { color: #857c70; font-size: .85rem; font-style: normal;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
strong { font-weight: 600; }
.lede { color: #5c554b; margin-bottom: 2.5rem; }
.caveat { margin-top: 4rem; padding: 1.1rem 1.3rem; background: #f2efe9;
  border-left: 3px solid #b8a888; font-size: .9rem; color: #4a443c; }
@media print { body { background: #fff; } main { padding: 0; } }
`;

/** A deliberately small markdown subset; the memo only uses these. */
function toHtml(title: string, md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

  const body = md
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3>${inline(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2>${inline(line.slice(3))}</h2>`;
      if (line.startsWith('> ')) return `<blockquote>${inline(line.slice(2))}</blockquote>`;
      if (line.trim() === '') return '';
      return `<p>${inline(line)}</p>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><main>
<h1>${esc(title)}</h1>
<p class="lede">Clause review prepared for due diligence. Every finding is quoted from
the source contract and located by section so that it can be checked.</p>
${body}
<div class="caveat"><strong>This is decision support, not advice.</strong> Findings are
produced by an automated review and must be confirmed by a qualified reviewer before
they are relied on. A passage recorded as absent means the review did not find it, not
that the contract is silent on the point.</div>
</main></body></html>`;
}

export function buildReport(label: string): void {
  const { contracts, cases } = JSON.parse(fs.readFileSync('cases/cases.json', 'utf8')) as {
    contracts: Contract[];
    cases: Case[];
  };
  const manifest = JSON.parse(fs.readFileSync(`results/${label}/manifest.json`, 'utf8')) as RunManifest;
  const byCase = new Map(manifest.results.map((r) => [r.caseId, r]));

  const parts: string[] = [];
  for (const c of contracts) {
    const text = fs.readFileSync(c.path, 'utf8');
    const rows = cases.filter((cs) => cs.contractId === c.id).map((cs) => ({ cs, r: byCase.get(cs.id)! }));
    parts.push(memoFor(c, rows, text));
  }

  const title = 'Clause review';
  const md = `# ${title}\n\n` + parts.join('\n');
  fs.writeFileSync(`results/${label}/report.md`, md);
  fs.writeFileSync(`results/${label}/report.html`, toHtml(title, parts.join('\n')));
  console.log(`wrote results/${label}/report.md and report.html (${contracts.length} contracts)`);
}
