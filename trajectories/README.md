# Agent transcripts

One JSON line per exchange with the model. Each line carries the full request that was
sent, including the system prompt and the whole conversation to that point, the complete
response, and the wall clock time in milliseconds. Nothing is summarised.

| File | Run |
|---|---|
| `baseline.jsonl` | The baseline. One call per clause, whole contract in context. |
| `solution.jsonl` | Hedgehog. One call per contract covering all three clause types. |
| `experiment-strict-prompt.jsonl` | Abandoned. Sterner instruction about copying quotes exactly. |
| `experiment-repair-loop.jsonl` | Abandoned. Unlocatable quotes sent back for correction, two rounds. The repair turns are visible here, and so is the fact that they corrected nothing. |

The retrieval agent's transcript is not here: it predates the final case set, so its
requests refer to contract text that has since been regenerated and replaying it would
mislead. Its result is recorded in `CHANGELOG.md` and the code is in `src/agent.ts`.

The `key` field on each line is the sha256 of the request. The corresponding response
sits in `cache/<key>.json`, which is how the scorer replays a run without a network call.
