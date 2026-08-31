# Solution video, script

Five minutes. Screen recording with voiceover, no camera. Read it slowly; the word count
is pitched for an unhurried pace rather than a full five minutes of talking.

Every figure below has been checked against the manifests in `results/`.

---

## 0:00 to 0:40 — The problem

**On screen:** a contract open in an editor. Scroll to an anti-assignment clause and pause.
Then scroll a long way down and pause on a later passage.

> A contract will tell you here that neither party may assign the agreement without written
> consent. And then, twenty pages further on, it will tell you that a transfer to a successor
> in a merger was never an assignment in the first place.
>
> Both sentences are in the document. Only the second one is the answer. A junior associate
> running due diligence has forty of these to get through, and the mistake that costs money
> is not the clause they miss. It is the clause they report without the exception that guts it.
>
> So I built something to catch the exception. There was nothing to catch.

---

## 0:40 to 1:20 — The baseline, and the surprise

**On screen:** `CHANGELOG.md`, the top two rows.

> The baseline is one prompt with the whole contract in it. No tools, no checking. I hid
> nine exceptions across eight real contracts, so I knew exactly where the answers were.
>
> It found all nine. Quoted the right passage every time.
>
> I assumed I had made them too obvious, so I rewrote every one to strip out the signal
> words. No "notwithstanding", no "except". Each one narrows the clause by claiming the
> transaction was never in scope, which is how you would actually bury one.
>
> Nine out of nine again. A model reading a contract that fits in its context does not miss
> the exception, and the honest move was to stop defending that and go and look at what the
> runs were actually getting wrong.

---

## 1:20 to 2:30 — What was broken, and a full run

**On screen:** terminal, `npm run solution` then `npm run report`. Switch to the front end
on localhost, show the summary chart, click into the Conformis agreement.

> What they were getting wrong was quoting. Three passages in twenty one could not be found
> in the source document. Not invented outright. Tidied, spliced together, lightly reworded.
> In a memo whose whole purpose is that somebody can check it, a citation you cannot find is
> worse than none, because it reads as diligence.
>
> Here is a full run. Eight agreements, three questions each. Twenty seconds.
>
> And this is what comes out. The one thing a reviewer actually wants to know: which of these
> clauses does not mean what it appears to mean. Sixteen of the twenty four are qualified by
> something elsewhere in the same document.
>
> Click into one and you get the working. Each clause, the passage quoted, and the section it
> came from so you can go and check it. Here is the restriction, and here, further down the
> same agreement, is the language that undoes it.

---

## 2:30 to 3:10 — The comparison

**On screen:** `npm run score`, table filling the frame.

> Two numbers moved.
>
> The baseline prints twenty one citations and three of them cannot be found in the contract.
> Hedgehog prints twenty, and all twenty can be found. Zero, in four separate runs.
>
> And the cost per question drops from eight thousand eight hundred tokens to just under
> four thousand. Two and a quarter times cheaper.
>
> The honest version of the first number: the model does not misquote less. It goes wrong at
> about the same rate either way. What changed is that the wrong ones are caught before they
> reach the page.

---

## 3:10 to 3:55 — What each change actually bought

**On screen:** `src/solution.ts`, on the verification block.

> Three changes, and they cost very different amounts.
>
> Asking all three questions in one call instead of three is where the saving comes from. The
> baseline was sending the same forty pages three times over.
>
> Checking every quote against the contract before printing it is free. It is a string search.
> It always terminates and it never asks the model to assess its own work. That check is why
> the zero in that table is a fact rather than an impression.
>
> And repairing what fails the check costs a third more in tokens, and on this set it rescued
> both of the citations that would otherwise have been dropped. That one is a genuine trade,
> so it is a flag rather than a decision I made for the firm.

---

## 3:55 to 4:45 — What I got wrong, and the lesson

**On screen:** `CHANGELOG.md`, scrolled to the closing section, then the four variance rows.

> Now the part I would rather not put on camera.
>
> An earlier version of this changelog said the repair loop fired six times and corrected
> nothing. It fires twice, and it recovers both of the citations that would otherwise have been
> dropped. I nearly deleted the one component that was doing the job.
>
> I found that by regenerating every experiment I had already dismissed, and noticing the
> numbers disagreed with what I had written down.
>
> And then I ran the final configuration four more times. Characterisation came out at
> sixty three per cent, sixty seven, seventy one, and seventy one. Same inputs, same prompt,
> same model. These models take no temperature parameter, so nothing can be pinned, and every
> single-run accuracy figure I had quoted all day was noise wearing a decimal point.
>
> One number did not move. Unlocatable citations printed: zero, zero, zero and zero. Because
> that one is decided by a string comparison and not by the model.
>
> So: if you want a number you can put in front of somebody, measure something a machine can
> check, and run it more than once.

---

## 4:45 to 5:00 — Close

**On screen:** `REPRODUCE.md`, the offline section.

> Every model response is cached and committed, so you can clone this, run the scorer with no
> API key and no spend, and get the same numbers I did.
>
> The thing I set out to build did not need building. What the evaluation found instead was
> smaller and duller and a good deal more useful, and I would rather submit that than the
> story I planned.

---

## Recording notes

- Around 800 words. Read unhurried, that lands near five minutes. If you overrun, cut the
  second paragraph of 3:10 rather than anything in 3:55, which is the strongest section.
- Warm the cache first with `npm run solution` so the live run is quick, and say on the
  recording that it is cached rather than letting it look faster than it is.
- Start the front end before recording: `cd web && npm run dev`. Have it sitting on the
  summary page before you switch to the browser.
- Keep the terminal font large. Judges watch these in a small window.
- The figures to land clearly: three of twenty one down to zero, and 8,800 down to just
  under 4,000. Everything else can wash over.
- Do not quote a single accuracy figure anywhere. It moves between 63 and 71 per cent across
  identical runs and quoting one of them would be the exact mistake the video is about.
