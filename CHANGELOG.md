# Improvement changelog

Every entry is scored on the same twenty four cases with the same model
(`gemini-3.7-flash`), so the numbers down this page are comparable. Runs that were
tried and abandoned are kept, because they are the part that explains the design.

| Stage | What was tried, and why | Evidence | Decision |
|---|---|---|---|
| Baseline (signposted) | One direct prompt, whole contract in context, no tools and no verification. Overrides inserted into the contracts opened with "Notwithstanding any provision of this Agreement", on the assumption that finding them would be the hard part. | Caught 9 of 9 inserted overrides and quoted the correct passage in every case. 8,796 prompt tokens per case. 1 of 21 quotes did not appear in the contract verbatim. | The premise was wrong. Kept as evidence. |
| Baseline (subtle) | Rewrote every inserted override to remove the signal words. Instead of announcing an exception, each one narrows the operative clause by asserting the transaction was never within its scope, which is how a competent drafter would actually bury one. | Still 9 of 9. Making the language subtle changed nothing. 8,800 prompt tokens per case. 3 of 21 quotes did not appear verbatim. | Override detection inside a single in-context contract is solved. Stopped pursuing it. |

## What the baseline actually got wrong

Two things, and neither was the thing this project was built to find.

**It misquotes the document.** Three of twenty one quoted passages do not appear in
the contract word for word, despite the instruction to copy them exactly. In a
memo that a reviewer is meant to check rather than trust, a citation that cannot be
found is worse than no citation at all.

**It reads the whole contract to answer one question.** Eight thousand eight hundred
prompt tokens per clause, three clauses per contract, and the same document sent
three times over.

## A correction to the ground truth

The first run scored 63% on characterisation, and most of that gap is a labelling
error rather than a model error. The set assumed that a contract with no inserted
override has none at all, which is plainly untrue of real commercial agreements: the
Conformis, Berkshire Hills and Ambassador Eyewear contracts each contain genuine
carve outs that CUAD does not label. The model found them and was marked wrong for it.

Characterisation accuracy is therefore not a trustworthy figure and is not used to
justify any decision here. The two measures that follow do not depend on it. Whether
a quoted passage appears in the source is a matter of string comparison, and token
count is a matter of arithmetic.
