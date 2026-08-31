# Improvement changelog

Every run below is scored on the same twenty four cases with the same model
(`gemini-3.7-flash`). Runs that were tried and abandoned are kept, because they are
the part that explains the design.

| Stage | What was tried, and why | Evidence | Decision |
|---|---|---|---|
| Baseline | One direct prompt per clause, whole contract in context, no verification. Overrides inserted into the contracts announced themselves with "Notwithstanding any provision of this Agreement", on the assumption that finding them was the hard part. | 9 of 9 overrides found, correct passage quoted every time. 8,796 tokens per case. 1 of 21 quotes not in the contract verbatim. | The premise was wrong. Kept as evidence. |
| Subtler overrides | Rewrote every inserted override to remove the signal words, narrowing the operative clause by asserting the transaction was never within its scope rather than announcing an exception. | Still 9 of 9. 8,800 tokens per case. 3 of 21 quotes not verbatim. | Override detection inside a contract that fits in context is solved. Abandoned that line. |
| Retrieval agent | Gave the model two tools, search the contract and read a section, so it could work without the whole document in context. Expected to cut tokens. | Cost **24,000** tokens per case, nearly three times the baseline, and hit the ten turn limit on every case without reaching an answer. It searched for things like "Agreement" and "Section". | Removed. You do not need to retrieve from a document that already fits in context, and the accumulated turn history costs more than the document does. |
| **One call per contract** | Ask all three clause types in a single call rather than sending the same forty pages three times over. Made purely to save tokens. | **2,950** tokens per case, down from 8,800. Misquoting went from 3 of 21 to **0 of 19**. Every other measure held or improved. | **Kept. This is the solution.** |
| Sterner quote instruction | Added an explicit instruction to copy quotes character for character, not to tidy up spacing, and to leave a quote null rather than approximate it. | Misquoting stayed at zero, so it fixed nothing that was still broken, and characterisation fell from 71% to 63% with one override missed and one clause invented. | Removed. Kept behind `HEDGEHOG_STRICT=1`. |
| Quote repair loop | Checked every quote against the contract and sent the failures back to be corrected, up to two rounds. | Fired six times. Added a third to the token bill, 2,950 to 3,868 per case. Moved no measure at all. | Removed. Kept behind `HEDGEHOG_REPAIR=1`. |

## Result

| | Baseline | Solution | Change |
|---|---|---|---|
| Quotes not found in the contract | 3 / 21 | **0 / 19** | eliminated |
| Prompt tokens per case | 8,800 | **2,950** | 3.0x cheaper |
| Overrides missed | 0 / 9 | 0 / 9 | held |
| Clauses invented | 1 / 4 | **0 / 4** | improved |

## The main failure mode, and the hot take

The thing this project was built to find does not exist. A model reading a contract
that fits in its context does not miss the exception buried twenty pages later. It
found all nine, twice, including after every signal word was stripped out. That result
held so firmly that the honest move was to stop defending the premise and go and look
at what the runs were actually getting wrong.

What they were getting wrong was quoting. Three passages in twenty one could not be
found in the source document. Not fabricated whole, but tidied, joined together,
lightly reworded. In a memo whose entire purpose is that a reviewer can go and check
it, a citation that cannot be located is worse than no citation at all, because it
reads as diligence.

Then the useful part. Two changes were designed specifically to fix that, and both
failed. A sterner instruction about copying exactly fixed nothing and cost accuracy
elsewhere. A verification loop that sent bad quotes back for correction fired six
times, cost a third more, and improved nothing. What fixed it was a change made for
an entirely unrelated reason: asking all three questions in one call instead of three.

The plausible reason is that answering three questions about one document at once
makes the model locate the passages and hold them, where three separate calls give it
three separate opportunities to reconstruct a passage from memory. That is a
hypothesis, not a finding, and it is the experiment worth running next.

**The lesson is that a reliability problem is not necessarily fixed by a reliability
feature.** Both of the things that looked like careful engineering, the stern prompt
and the repair loop, were inert or harmful, and the fix arrived sideways from a change
made to save money. Had the evaluation only measured what the changes were aimed at,
both would have shipped and neither would have done anything. The verification check
itself is still in the code, not because it repairs anything, but because it is what
allows "zero of nineteen" to be stated as a fact rather than an impression.
