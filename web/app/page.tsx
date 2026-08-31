import Link from 'next/link';
import RunButton from './RunButton';
import { getReview, CLAUSE_ORDER, SHORT, type Verdict } from '@/lib/review';

// Read from disk on every request, so the page reflects a re-run rather than a
// snapshot taken when the server started.
export const dynamic = 'force-dynamic';

export default function Page() {
  const review = getReview();
  const total = review.contracts.length;
  const qualified = review.contracts.flatMap((c) => c.findings).filter((f) => f.verdict === 'QUALIFIED').length;
  const withheld = review.contracts.flatMap((c) => c.findings).filter((f) => f.citationWithheld).length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-20 md:py-28">
      <header className="border-b border-rule-strong pb-8">
        <p className="label">Due diligence</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Clause review</h1>
        <p className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          Three questions were put to each of {total} commercial agreements. Every finding below is
          quoted from the source contract and located by section, so that it can be checked rather
          than taken on trust. Where a passage could not be matched to the contract word for word,
          it has been withheld and marked as such.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="label">Summary</h2>
        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule">
              <th className="label py-3 pr-4 font-normal">Agreement</th>
              {CLAUSE_ORDER.map((c) => (
                <th key={c} className="label py-3 pr-4 font-normal whitespace-nowrap">
                  {c === 'Change Of Control' ? 'Change of control' : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {review.contracts.map((contract) => (
              <tr key={contract.id} className="border-b border-rule align-baseline">
                <td className="py-4 pr-6">
                  <Link
                    href={`/contract/${contract.id}/`}
                    className="underline decoration-rule decoration-1 underline-offset-4 hover:decoration-ink"
                  >
                    {contract.title}
                  </Link>
                </td>
                {CLAUSE_ORDER.map((clause) => {
                  const f = contract.findings.find((x) => x.clauseType === clause);
                  const v = (f?.verdict ?? 'NOT_FOUND') as Verdict;
                  return (
                    <td key={clause} className="py-4 pr-4 text-[0.9375rem] whitespace-nowrap">
                      <span className={v === 'QUALIFIED' ? 'text-flag' : v === 'NOT_FOUND' ? 'text-ink-faint' : ''}>
                        {SHORT[v]}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink-soft">
          {qualified} of the {total * CLAUSE_ORDER.length} clauses examined are qualified by language
          elsewhere in the same agreement, which is the finding a reviewer most needs and the one most
          easily missed on a first reading. {withheld === 0 ? 'No citation was withheld.' : `${withheld} citation${withheld === 1 ? ' was' : 's were'} withheld as unverifiable.`}
        </p>

        <RunButton />
      </section>

      <footer className="mt-20 border-t border-rule pt-6">
        <p className="text-[0.875rem] leading-relaxed text-ink-faint">
          This is decision support and not advice. Findings are produced by an automated review and
          must be confirmed by a qualified reviewer before they are relied upon. A clause recorded as
          absent means the review did not find it, not that the contract is silent on the point.
          Prepared with {review.model}.
        </p>
      </footer>
    </main>
  );
}
