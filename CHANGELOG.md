# Improvement changelog

Every run is scored on the same twenty four cases with the same model
(`gemini-3.7-flash`). Runs that were tried and abandoned are kept, because they are
the part that explains the design.

| Stage | What was tried, and why | Evidence | Decision |
|---|---|---|---|
| Baseline | One prompt per clause, whole contract in context, no verification. Overrides inserted into the contracts announced themselves with "Notwithstanding any provision of this Agreement", on the assumption that finding them was the hard part. | 9 of 9 overrides found, right passage quoted every time. 8,796 tokens per case. 1 of 21 printed quotes could not be found in the contract. | Premise wrong. Kept as evidence. |
| Subtler overrides | Rewrote every inserted override to remove the signal words, narrowing the operative clause by asserting the transaction was never within its scope rather than announcing an exception. | Still 9 of 9. 8,800 tokens per case. 3 of 21 printed quotes unlocatable. | Override detection inside a contract that fits in context is solved. Line abandoned. |
| Retrieval agent | Two tools, search the contract and read a section, so the model could work without the whole document in context. Expected to cut tokens. | **24,000** tokens per case, three times the baseline, and the ten turn limit reached without an answer on every case. It searched for "Agreement" and "Section". | Removed. Retrieval earns nothing against a document that already fits in context, and accumulated turn history costs more than the document. |
| **One call per contract** | Ask all three clause types together rather than sending the same forty pages three times over. | **2,950** tokens per case, down from 8,800. Quote behaviour unchanged. | **Kept.** Three times cheaper. |
| **Verify every quote** | Check each quoted passage against the contract, and withhold anything that cannot be found rather than printing it. | Caught 2 of 21 quotes. Unlocatable citations reaching the reader fell from 3 of 21 to **0 of 19**. | **Kept.** This is what makes the memo checkable. |
| Sterner quote instruction | An explicit instruction to copy quotes character for character, not to tidy the spacing, and to leave a quote null rather than approximate it. | Changed nothing that was still broken, and characterisation fell from 71% to 63% with one override missed and one clause invented. | Removed. Behind `HEDGEHOG_STRICT=1`. |
| Quote repair loop | Send the unlocatable quotes back to the model with the offending text attached and ask for the real passage, up to two rounds. | Fired six times. Added a third to the token bill, 2,950 to 3,868 per case. Corrected nothing. | Removed. Behind `HEDGEHOG_REPAIR=1`. |

## Result

| | Baseline | Solution |
|---|---|---|
| Quotes the model attempted | 21 | 21 |
| Withheld because they could not be located | 0 | **2** |
| Unlocatable citations printed in the memo | **3 of 21** | **0 of 19** |
| Prompt tokens per case | 8,800 | **2,950** |
| Overrides missed | 0 of 9 | 0 of 9 |
| Clauses invented | 1 of 4 | 0 of 4 |

**The model does not misquote less.** It produced two unlocatable quotes out of twenty
one against the baseline's three, which is the same rate within noise on a sample this
size. What changed is that they no longer reach the page. The denominator moves from 21
to 19 for exactly that reason, and both figures are given above rather than one.

## The main failure mode, and the hot take

The thing this was built to find does not exist. A model reading a contract that fits
in its context does not miss the exception buried twenty pages later. It found all nine,
twice, including after every signal word had been stripped out.

What it does do is misquote. Three passages in twenty one could not be found in the
source. Not fabricated whole, but tidied, joined together, lightly reworded. In a memo
whose entire purpose is that a reviewer can go and check it, a citation that cannot be
located is worse than none, because it reads as diligence.

Three things were then tried against that. **A sterner instruction did nothing.** **A
repair loop did nothing**, though it fired six times and cost a third more: told which
quote was wrong and asked for the real one, the model could not produce it. **The plain
check worked**, because it never asked the model to fix anything. It looked for the
string, failed to find it, and refused to print it.

**The lesson is that detection is cheap and correction is not.** Verifying a model's
output against the source is a string comparison that always terminates and cannot be
argued with. Asking the same model to correct the thing it just got wrong reuses the
faculty that produced the error. When a model cannot be trusted to quote accurately,
the answer is not to ask it again more firmly. It is to check, and to withhold what will
not verify, and to tell the reader you have done so.

That is why the memo has a section headed "Requires a reader". A tool that admits its
gaps is more useful to a lawyer than one that fills them in.
