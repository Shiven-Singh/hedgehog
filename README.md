# Hedgehog

A contract will tell you in clause 8 that neither party may assign the agreement
without written consent. Twelve pages later it will tell you that, notwithstanding
clause 8, assignment to an affiliate in connection with a merger requires no consent
at all. Both sentences are in the document. Only the second one is the answer.

Hedgehog finds the clause you asked about and then goes looking for whatever qualifies
it. Each clause comes back as absolute, qualified or absent, with both passages quoted
so that the reviewer can check the work rather than take it on trust.

## Who it is for

A junior associate running due diligence on an acquisition. Forty agreements arrive and
the same handful of questions has to be answered about each one. Is assignment restricted.
Does a change of control trigger anything. Is there an exclusivity undertaking. At present
that means reading every contract from end to end and building the summary chart by hand.

The mistake that costs money is rarely a clause that was missed altogether. It is a clause
reported without the exception that guts it, because the reviewer then prices the deal on
a restriction which does not actually bind.

## Why not simply extract the clause

Extraction is close to solved, and it is the wrong target. A system that finds clause 8 and
stops has answered correctly and uselessly. The interesting failure is the one where the
answer looks right, and it is also the failure that published benchmarks do not measure,
since they label where a clause sits and not whether something further on undoes it.

The headline metric here is therefore the false absolute rate: how often a clause is
reported as unconditional when an override exists elsewhere in the same document.

## The evaluation

Eight contracts, three clause types, twenty four cases. The set was frozen before any of
the reasoning code was written and has not been touched since. It breaks down as eleven
absolute, nine qualified and four genuine absences, and those four matter, because they
are what catches a system inventing a clause that is not there.

Both the baseline and the agent are given the same cases, the same model and the same
output schema. The baseline is a single direct prompt with the whole contract in context
and no verification of any kind, which is what most people would build first and is a fair
thing to be measured against.

## Reproducing the result

Every model response is cached to disk by a hash of the request, and the cache is committed
to this repository. Current Claude models no longer accept a temperature parameter, so a
recorded transcript is the only means of making the evaluation deterministic. The practical
effect is that anyone can clone this repository, run the scorer offline without an API key,
and arrive at the same numbers.

Exact commands, versions, runtimes and costs are in `REPRODUCE.md`.

## Data and licence

The evaluation uses the Contract Understanding Atticus Dataset (CUAD) v1, created by
The Atticus Project and released under CC BY 4.0. The source is at
<https://zenodo.org/records/4595826>.

The eight contracts under `cases/contracts/` are redistributed from CUAD under that licence
and **they have been modified**. Synthetic override clauses were inserted into some of them
in order to create ground truth for the override detection task, which CUAD does not label.
Every insertion is recorded in `cases/cases.json` and the templates sit in `src/carveouts.ts`.
These copies are consequently fit for reproducing this evaluation and for nothing else.

An injected carve out is in all likelihood easier to spot than one which grew naturally over
several rounds of drafting, so the figures here should be read as an upper bound.

## Status

Work in progress. The improvement log is in `CHANGELOG.md`.
