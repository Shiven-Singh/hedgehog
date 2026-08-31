# Hedgehog

Clause review for due diligence, where every finding is quoted from the contract and
located by section, and anything the tool cannot verify is withheld rather than printed.

Built for the micro1 Agentic Workflows Hackathon, August 2026.

## Who it is for

A junior associate running due diligence on an acquisition. Forty agreements arrive and
the same handful of questions has to be answered about each one. Is assignment
restricted. Does a change of control trigger anything. Is there an exclusivity
undertaking. At present that means reading every contract from end to end and building
the summary chart by hand.

## What we set out to prove, and why it was wrong

The premise was that a contract will restrict something in clause 8 and then permit it
in clause 22, and that a model would find the first and miss the second. Hedgehog would
catch the exception the reviewer would otherwise price the deal without.

It turns out models do not miss them. We hid nine exceptions across eight real contracts
and a single plain prompt found all nine and quoted the right passage every time. So we
rewrote every one of them to strip out the signal words, narrowing the operative clause
by asserting the transaction was never within its scope rather than announcing an
exception. Nine out of nine again.

Override detection inside a contract that fits in the model's context is solved, and no
amount of engineering on top of it was going to show an improvement.

## What is actually broken

Quoting. Three passages in twenty one could not be found in the source document. Not
invented outright, but tidied, spliced together, lightly reworded. For a memo whose
entire purpose is that a reviewer can go and check it, a citation that cannot be located
is worse than no citation at all, because it reads as diligence.

So that became the problem worth solving, and the two numbers this project moves are:

| | Baseline | Hedgehog |
|---|---|---|
| Unlocatable citations printed in the memo | 3 of 21 | **0 of 19** |
| Prompt tokens per question | 8,800 | **2,950** |

The model does not misquote less. It produced two unlocatable quotes out of twenty one
against the baseline's three, which is the same rate on a sample this size. What changed
is that they no longer reach the page, which is why the denominator moves from 21 to 19
and why both figures are printed rather than one.

`CHANGELOG.md` has the full sequence, including the three things that did not work.

## How it works

Two changes from the baseline, and nothing else.

**One call per contract.** The baseline sends the same forty pages three times over to
answer three questions about it. Asking all three together costs a third as much.

**Every quote is checked against the source.** A quoted passage is looked for in the
contract, and if it is not there, character for character, it is withheld and the memo
says so. That check is a string comparison. It always terminates, it cannot be argued
with, and it does not ask the model to assess its own work.

The memo ends with a section headed "Requires a reader" listing what the review could
not establish. A tool that admits its gaps is more useful to a lawyer than one that
fills them in.

## The review

`npm run report` writes the review three ways: `report.md`, a self-contained `report.html`,
and `report.json` for anything that wants to render it itself. The `web/` directory holds a
small Next.js front end that does exactly that, with a summary chart across the eight
agreements and a page for each. It is a static export built from the committed results, so
it needs no key and no server of its own.

## Running it

`REPRODUCE.md` has the commands. The short version is that every model response is
cached and committed, so `npm ci && npm run score` reproduces every number in the
changelog offline, with no API key and no cost.

## Tools used

Written with Claude Code as the coding agent, calling Gemini 3.7 Flash through the
Generative Language REST API at runtime. Agent transcripts are under `trajectories/`,
one JSON line per exchange, with the full request and response for every call.

## Data and licence

The evaluation uses the Contract Understanding Atticus Dataset (CUAD) v1, created by
The Atticus Project and released under CC BY 4.0, from
<https://zenodo.org/records/4595826>.

The eight contracts under `cases/contracts/` are redistributed under that licence and
**they have been modified**: synthetic override clauses were inserted into some of them
to create ground truth for a task CUAD does not label. Every insertion is recorded in
`cases/cases.json` and the templates are in `src/carveouts.ts`. These copies are fit for
reproducing this evaluation and nothing else.

An inserted carve out is in all likelihood easier to spot than one that grew naturally
over several rounds of drafting, so those figures should be read as an upper bound.

## What the evaluation does not establish

The characterisation accuracy column is not trustworthy and no decision here rests on
it. The case set assumes a contract with no inserted override has none, which is untrue
of real commercial agreements: the Conformis, Berkshire Hills and Ambassador Eyewear
contracts each contain genuine carve outs that CUAD does not label. The model found them
and the scorer marked it wrong for doing so.

The two headline measures avoid this. Whether a quoted passage appears in the source is
a string comparison, and token count is arithmetic. Neither depends on the labelling.
