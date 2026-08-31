import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReview, CLAUSE_ORDER, type Finding } from '@/lib/review';

export function generateStaticParams() {
  return (getReview()?.contracts ?? []).map((c) => ({ id: c.id }));
}

function Citation({ at }: { at: string | null }) {
  if (!at) return null;
  return <p className="label mt-1 pl-7">Contract text, {at}</p>;
}

function Clause({ finding }: { finding: Finding }) {
  const heading = finding.clauseType === 'Change Of Control' ? 'Change of control' : finding.clauseType;
  return (
    <section className="mt-12 first:mt-10">
      <h3 className="label">{heading}</h3>
      <p className="mt-2 text-[1.0625rem] font-semibold">{finding.verdictLabel}</p>

      {finding.note && (
        <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">{finding.note}</p>
      )}

      {finding.quote && (
        <>
          <p className="quote">{finding.quote.replace(/\s+/g, ' ').trim()}</p>
          <Citation at={finding.quoteAt} />
        </>
      )}

      {finding.citationWithheld && (
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-flag">
          The supporting passage has been withheld. The review identified it but could not match it
          to the contract word for word, and an unverifiable citation is worse than none.
        </p>
      )}

      {finding.overrideQuote && (
        <>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed">
            The clause above is qualified by the following passage.
          </p>
          <p className="quote">{finding.overrideQuote.replace(/\s+/g, ' ').trim()}</p>
          <Citation at={finding.overrideAt} />
        </>
      )}
    </section>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = getReview();
  const contract = review?.contracts.find((c) => c.id === id);
  if (!review || !contract) notFound();

  const ordered = CLAUSE_ORDER.map((c) => contract.findings.find((f) => f.clauseType === c)).filter(
    (f): f is Finding => Boolean(f),
  );
  const notFoundClauses = ordered.filter((f) => f.verdict === 'NOT_FOUND');
  const withheldClauses = ordered.filter((f) => f.citationWithheld);

  return (
    <main className="max-w-3xl px-8 py-20 md:px-16 md:py-24">
      <Link
        href="/"
        className="label no-print underline decoration-rule underline-offset-4 hover:decoration-ink"
      >
        ← All agreements
      </Link>

      <header className="mt-8 border-b border-rule-strong pb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{contract.title}</h1>
        <p className="label mt-4">
          {contract.chars.toLocaleString('en-GB')} characters · {contract.sourceTitle}
        </p>
      </header>

      {ordered.map((f) => (
        <Clause key={f.clauseType} finding={f} />
      ))}

      {(notFoundClauses.length > 0 || withheldClauses.length > 0) && (
        <section className="mt-16 border-t border-rule pt-8">
          <h3 className="label">Requires a reader</h3>
          {notFoundClauses.length > 0 && (
            <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
              No clause was located for{' '}
              {notFoundClauses.map((f) => f.clauseType.toLowerCase()).join(', ')}. That is not the
              same as the contract being silent on the point, and it should be confirmed by hand.
            </p>
          )}
          {withheldClauses.length > 0 && (
            <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
              A citation was withheld for{' '}
              {withheldClauses.map((f) => f.clauseType.toLowerCase()).join(', ')}. The finding itself
              stands; it is the supporting passage that needs locating.
            </p>
          )}
        </section>
      )}

      <footer className="mt-20 border-t border-rule pt-6">
        <p className="text-[0.875rem] leading-relaxed text-ink-faint">
          This is decision support and not advice. Findings must be confirmed by a qualified reviewer
          before they are relied upon. Prepared with {review.model}.
        </p>
      </footer>
    </main>
  );
}
