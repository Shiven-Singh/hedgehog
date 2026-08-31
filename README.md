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
| Citations printed in the memo | 21 | 20 to 21 |
| Of those, unlocatable in the contract | **3** | **0, in all four runs** |
| Prompt tokens per question | 8,800 | **3,259 to 3,870** |

The model does not misquote less. It goes wrong at much the same rate either way. What
changed is that the wrong ones are caught before they reach the page, and then recovered
rather than simply dropped.

Ranges rather than single figures, because these models take no temperature parameter and
four runs of the identical configuration gave four different answers. Characterisation moved
eight points between them. The citation count did not move at all, because it rests on a
string comparison rather than on the model, and that is the whole argument for building it
this way.

`CHANGELOG.md` has the full sequence, including the three things that did not work.

## How it works

Three changes from the baseline.

**One call per contract.** The baseline sends the same forty pages three times over to
answer three questions about it. Asking all three together costs a third as much.

**Every quote is checked against the source.** A quoted passage is looked for in the
contract, and if it is not there, character for character, it does not get printed. That
check is a string comparison. It always terminates, it cannot be argued with, and it does
not ask the model to assess its own work. It costs nothing and it is the reason the
zero in the table above can be stated as a fact.

**What fails the check goes back.** The offending text is handed to the model with a
request for the real passage, up to twice. On this set that recovered both citations that
would otherwise have been dropped, at a third more in tokens. Whether that trade is worth
paying depends on whether a gap or a bill costs the firm more, so it is a default you can
turn off with `HEDGEHOG_NO_REPAIR=1`, not a decision baked in.

The memo ends with a section headed "Requires a reader" listing what the review could
not establish. A tool that admits its gaps is more useful to a lawyer than one that
fills them in.

## The review

`npm run report` writes the review three ways: `report.md`, a self-contained `report.html`,
and `report.json` for anything that wants to render it itself. The `web/` directory holds a
small Next.js front end that does exactly that, with a summary chart across the eight
agreements and a page for each. It reads the committed results, so it needs no key to
look at, and it carries a button that re-runs the review for anyone who has one. That button
shells out to the same command the reproduction guide documents rather than reimplementing
the pipeline behind a form.

## Running it

`REPRODUCE.md` has the commands. The short version is that every model response is
cached and committed, so `npm ci && npm run score` reproduces every number in the
changelog offline, with no API key and no cost.

## What is new, and what is not

Every line of this repository was written during the competition window, starting from an
empty directory. Nothing was carried in from earlier work. The git history runs from the
first commit to the last within the submission period.

Two things pre-date it and are not mine. The CUAD dataset, which is credited below. And
the model, which is called over its public API. Everything else, the case construction,
the inserted overrides, the baseline, the solution, the scorer, the memo and the front
end, was built here.

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
