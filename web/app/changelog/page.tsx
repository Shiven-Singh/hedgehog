import Link from 'next/link';
import { getChangelog } from '@/lib/review';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/** Small renderer for the subset of markdown the changelog actually uses. */
function render(md: string): string {
  const out: string[] = [];
  const lines = md.split('\n');
  let para: string[] = [];
  let table: string[][] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    const [head, ...body] = table;
    out.push(
      `<div class="tablewrap"><table><thead><tr>${head!
        .map((c) => `<th>${inline(c)}</th>`)
        .join('')}</tr></thead><tbody>${body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`,
    );
    table = [];
  };

  for (const line of lines) {
    if (line.startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      table.push(cells);
      continue;
    }
    flushTable();

    if (line.startsWith('## ')) { flushPara(); out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith('# ')) { flushPara(); out.push(`<h1>${inline(line.slice(2))}</h1>`); }
    else if (line.trim() === '') flushPara();
    else para.push(line.trim());
  }
  flushPara();
  flushTable();
  return out.join('\n');
}

export default function Page() {
  return (
    <main className="max-w-4xl px-8 py-20 md:px-16 md:py-24">
      <Link
        href="/"
        className="label no-print underline decoration-rule underline-offset-4 hover:decoration-ink"
      >
        ← Clause review
      </Link>
      <article className="prose mt-8" dangerouslySetInnerHTML={{ __html: render(getChangelog()) }} />
    </main>
  );
}
