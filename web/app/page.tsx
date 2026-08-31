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
  const absolute = review.contracts.flatMap((c) => c.findings).filter((f) => f.verdict === 'ABSOLUTE').length;
  const notFound = review.contracts.flatMap((c) => c.findings).filter((f) => f.verdict === 'NOT_FOUND').length;

  return (
    <main className="max-w-6xl px-8 py-20 md:px-16 md:py-24">
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

      <section className="mt-14 grid gap-12 lg:grid-cols-[1fr_16rem]">
        <div>
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
                    <td key={clause} className="py-4 pr-4 whitespace-nowrap">
                      <span
                        className={
                          v === 'QUALIFIED' ? 'chip chip-flag' : v === 'NOT_FOUND' ? 'chip chip-none' : 'chip chip-clear'
                        }
                      >
                        {SHORT[v]}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
          {qualified} of the {total * CLAUSE_ORDER.length} clauses examined are qualified by language
          elsewhere in the same agreement, which is the finding a reviewer most needs and the one most
          easily missed on a first reading.
        </p>

        <RunButton />
        </div>

        <aside className="lg:sticky lg:top-12 lg:self-start">
          <h2 className="label">What the review found</h2>
          <dl className="mt-5 grid gap-4">
            <div className="border-t border-rule pt-3">
              <dt className="label">Needs attention</dt>
              <dd className="mt-1 text-2xl text-flag">{qualified}</dd>
              <dd className="mt-0.5 text-[0.8125rem] leading-snug text-ink-faint">
                clauses qualified by language elsewhere in the same agreement
              </dd>
            </div>
            <div className="border-t border-rule pt-3">
              <dt className="label">Stands as written</dt>
              <dd className="mt-1 text-2xl text-clear">{absolute}</dd>
              <dd className="mt-0.5 text-[0.8125rem] leading-snug text-ink-faint">
                clauses with nothing limiting them
              </dd>
            </div>
            <div className="border-t border-rule pt-3">
              <dt className="label">Not located</dt>
              <dd className="mt-1 text-2xl text-ink-faint">{notFound}</dd>
              <dd className="mt-0.5 text-[0.8125rem] leading-snug text-ink-faint">
                read these by hand; absence here is not proof of absence
              </dd>
            </div>
            <div className="border-t border-rule pt-3">
              <dt className="label">Citations withheld</dt>
              <dd className="mt-1 text-2xl">{withheld}</dd>
              <dd className="mt-0.5 text-[0.8125rem] leading-snug text-ink-faint">
                quotes that could not be matched to the contract word for word, so were not printed
              </dd>
            </div>
          </dl>
        </aside>
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
