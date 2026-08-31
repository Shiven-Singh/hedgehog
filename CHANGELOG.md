# Improvement changelog

Every run below is scored on the same twenty four cases with the same model
(`gemini-3.7-flash`), and every row has a manifest under `results/` behind it. The
abandoned experiments are kept rather than deleted, because they are the part that
explains the design.

| Stage | What was tried, and why | Evidence | Decision |
|---|---|---|---|
| Baseline | One prompt per clause, whole contract in context, no verification. The overrides inserted into the contracts announced themselves with "Notwithstanding any provision of this Agreement", on the assumption that finding them was the hard part. | 9 of 9 overrides found, right passage quoted every time. 8,796 tokens per case. 1 of 21 printed citations could not be found in the contract. | Premise wrong. Kept as evidence. |
| Subtler overrides | Rewrote every inserted override to remove the signal words, narrowing the operative clause by asserting the transaction was never within its scope rather than announcing an exception. | Still 9 of 9. 8,800 tokens per case. 3 of 21 printed citations unlocatable. | Override detection inside a contract that fits in context is solved. Line abandoned. |
| Retrieval agent | Two tools, search the contract and read a section, so the model could work without the whole document in context. Expected to cut tokens. | **19,227** tokens per case, more than twice the baseline. 187 tool calls across 24 cases, and 7 of 24 hit the ten turn limit without reaching an answer. Searches included "Agreement" and "Section". | Removed. Retrieval earns nothing against a document that already fits in context, and the accumulated turn history costs more than the document does. |
| **One call per contract** | Ask all three clause types together rather than sending the same forty pages three times over. | 2,950 tokens per case, down from 8,800. | **Kept.** |
| **Check every quote** | Look for each quoted passage in the contract and withhold anything that cannot be found, rather than printing it. | Caught 2 of 21. Unlocatable citations printed fell from 3 of 21 to 0 of 19, at no token cost. | **Kept.** |
| **Repair what fails** | Send the unlocatable passages back with the offending text attached and ask for the real one, up to two rounds. | Fired on 2 of 8 contracts. Recovered **both** withheld citations, so 20 citations reach the page instead of 19. Costs 2,950 to **3,868** tokens per case, a third more. | **Kept.** See the note below; this one is a trade rather than a free win. |
| Sterner quote instruction | An explicit instruction to copy quotes character for character, not to tidy the spacing, and to leave a quote null rather than approximate it. | No measurable difference. 71% characterisation either way, 2,968 tokens per case against 2,950, one citation withheld against two. | Removed. Behind `HEDGEHOG_STRICT=1`. It added words to the prompt and earned nothing. |

## Result

| | Baseline | Hedgehog |
|---|---|---|
| Citations printed in the memo | 21 | 20 |
| Of those, unlocatable in the contract | **3** | **0** |
| Prompt tokens per case | 8,800 | **3,868** |
| Overrides missed | 0 of 9 | 0 of 9 |
| Clauses invented | 1 of 4 | 0 of 4 |

Two and a quarter times cheaper, with no citation printed that a reviewer cannot follow.

Dropping the repair loop (`HEDGEHOG_NO_REPAIR=1`) makes it three times cheaper at 2,950
tokens, at the price of two citations withheld instead of recovered. That is a decision
about whether a gap or a bill is more expensive to the firm, and it is not the engineer's
to make, so it is a flag rather than a default.

## The main failure mode, and the hot take

The thing this project was built to find does not exist. A model reading a contract that
fits in its context does not miss the exception buried twenty pages later. It found all
nine, twice, including after every signal word had been stripped out.

What it does do is misquote. Three passages in twenty one could not be found in the source
document. Not fabricated whole, but tidied, spliced together, lightly reworded. In a memo
whose entire purpose is that a reviewer can go and check it, a citation that cannot be
located is worse than none, because it reads as diligence.

Three things were tried against that, and they cost very different amounts. **Checking is
free and absolute**: comparing a quote against the source is a string search that always
terminates, and it guarantees no unfindable citation is ever printed. **Repairing costs
real money and buys back coverage**: a third more in tokens, and it rescued both citations
that would otherwise have been dropped. **Asking more firmly bought nothing at all**, which
was the intervention I was most confident about when I wrote it.

But the thing worth taking away is smaller and more uncomfortable than any of that.

**An earlier version of this changelog said the repair loop fired six times and corrected
nothing, and that the sterner prompt cost eight points of accuracy. Both were false.** The
first was a counting error, a per-contract figure multiplied by the three cases sharing it.
The second compared two runs whose prompts had been refactored between them, so the
configuration the flag produced was no longer the configuration that had been measured. I
found neither by reasoning about the code. I found them by regenerating every abandoned
experiment from the current source and discovering the numbers did not match what I had
written down.

Evaluation results drift the moment the code under them changes, and a changelog written
from memory of what happened will quietly diverge from what the repository actually does.
The only defence is to re-run the experiments you have already dismissed, including the
ones you are certain about. I nearly shipped a submission claiming a feature had failed
when it was in fact the one component that recovered real citations.
