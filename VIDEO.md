# Solution video, script

Five minutes. Screen recording with voiceover, no camera. Word counts are pitched at an
unhurried speaking pace, so read it slowly rather than trying to fit more in.

---

## 0:00 to 0:40 — The problem

**On screen:** a CUAD contract open in an editor. Scroll to the anti-assignment clause,
pause on it. Then scroll a long way down and pause on a later passage.

> A contract will tell you here that neither party may assign the agreement without
> written consent. And then, twenty pages further on, it will tell you that a transfer
> to a successor in a merger was never an assignment in the first place.
>
> Both sentences are in the document. Only the second one is the answer. A junior
> associate doing due diligence on an acquisition has forty of these to get through, and
> the mistake that costs money is not the clause they miss. It is the clause they report
> without the exception that guts it.
>
> So I built something to catch the exception. And it turned out there was nothing to catch.

---

## 0:40 to 1:20 — The baseline, and the surprise

**On screen:** `CHANGELOG.md`, top two rows.

> The baseline is one prompt with the whole contract in it, no tools, no checking. I hid
> nine exceptions across eight real contracts, so I knew exactly where the answers were,
> and it found all nine. Quoted the right passage every time.
>
> I assumed I had made them too obvious, so I rewrote every one to strip out the signal
> words. No "notwithstanding", no "except". Each one narrows the clause by claiming the
> transaction was never in scope, which is how you would actually bury one.
>
> Nine out of nine again. A model reading a contract that fits in its context does not
> miss the exception. That premise was dead, and the honest move was to stop defending it
> and go and look at what the runs were getting wrong instead.

---

## 1:20 to 2:30 — What was actually broken, and one full run

**On screen:** terminal. Run `npm run solution`, then `npm run report`, then open
`results/solution/report.html` and scroll through a memo.

> What they were getting wrong was quoting. Three passages in twenty one could not be
> found in the source document. Not invented outright. Tidied, spliced together, lightly
> reworded. In a memo whose whole purpose is that somebody can go and check it, a citation
> you cannot find is worse than no citation, because it reads as diligence.
>
> So here is a full run. Eight contracts, three clause types each, twenty four questions.
> Twenty seconds.
>
> And this is what comes out. Each clause, whether it stands or is qualified, the passage
> quoted, and the section it came from so you can go and look. Here the tool found the
> restriction and the exception that undoes it, side by side.
>
> And at the bottom of each one, this. Requires a reader. That is the tool telling you
> what it could not establish, rather than filling it in.

---

## 2:30 to 3:15 — The comparison

**On screen:** `npm run score`, with the table filling the frame.

> Two numbers moved.
>
> Unlocatable citations printed in the memo: three of twenty one, down to zero of nineteen.
>
> And the reading cost per question: eight thousand eight hundred tokens, down to two
> thousand nine hundred and fifty. Three times cheaper.
>
> Now, the honest version of that first number. The model does not misquote less. It
> produced two bad quotes out of twenty one where the baseline produced three, which is
> the same rate on a sample this size. What changed is that they no longer reach the page.
> That is why the denominator moves from twenty one to nineteen, and why the table prints
> quotes attempted, quotes withheld and quotes printed as three separate columns rather
> than one convenient rate.

---

## 3:15 to 4:00 — The change that did the most

**On screen:** `src/solution.ts`, on the verification block.

> Two changes, and they earn their keep for different reasons.
>
> Asking all three questions in one call instead of three separate ones is where the
> threefold cost saving comes from. The baseline was sending the same forty pages three
> times over.
>
> But the change that matters most is this one. Every quote is looked for in the contract
> before it is printed. If it is not there, character for character, it does not go in the
> memo and the memo says it was withheld.
>
> It is a string comparison. It always terminates, it cannot be argued with, and it never
> asks the model to assess its own work.

---

## 4:00 to 4:40 — The experiment I removed, and the lesson

**On screen:** `CHANGELOG.md`, the last two rows.

> I built a repair loop for this. Catch the bad quote, hand it back to the model with the
> offending text attached, ask for the real passage. Up to two rounds.
>
> It fired six times. It cost a third more in tokens. It corrected nothing. Told exactly
> which quote was wrong and asked for the right one, the model could not produce it.
>
> I also tried simply asking more firmly, an instruction to copy character for character
> and not tidy the spacing. That fixed nothing either, and it made the answers worse
> elsewhere.
>
> So: detection is cheap and correction is not. Checking output against the source always
> works. Asking the model to fix what it just got wrong reuses the faculty that produced
> the error. When a model cannot be trusted to quote, do not ask it again more firmly.
> Check, withhold what will not verify, and tell the reader you did.

---

## 4:40 to 5:00 — Close

**On screen:** `REPRODUCE.md`, on the offline block.

> Every model response is cached and committed, so you can clone this, run the scorer with
> no API key and no spend, and get the same numbers I did.
>
> The thing I set out to build did not need building. What the evaluation found instead was
> smaller and duller and considerably more useful, and I would rather submit that than the
> story I planned.

---

## Recording notes

- Roughly 780 words. At an unhurried pace that lands near five minutes. If you overrun,
  cut the second half of section 4:00 (the sterner instruction) rather than anything else.
- Run `npm run solution` beforehand so the cache is warm and the live run is quick. Say so
  if it returns instantly, rather than letting it look faster than it is.
- Keep the terminal font large. Judges will watch this in a small window.
- The two numbers to land clearly are three of twenty one to zero of nineteen, and 8,800
  to 2,950. Everything else can wash over.
