# Agent transcripts

One JSON line per exchange with the model. Each line carries the full request that was
sent, including the system prompt and the whole conversation to that point, the complete
response, and the wall clock time in milliseconds. Nothing is summarised.

| File | Run |
|---|---|
| `baseline.jsonl` | The baseline. One call per clause, whole contract in context. |
| `solution.jsonl` | Hedgehog. One call per contract, then a repair turn for any quote that failed the check. The repair exchange is the one whose request has more than one entry in `contents`; it shows the offending quote being handed back and the corrected passage coming return. |
| `experiment-retrieval.jsonl` | Abandoned. The retrieval agent, 170 exchanges across 24 cases, including the searches for "Agreement" and "Section" that show it flailing. |
| `experiment-strict-prompt.jsonl` | Abandoned. The sterner instruction about copying quotes exactly. |

Runs that are absent from this list were served entirely from the cache and so made no new
calls to record. Their results are under `results/` and their responses under `cache/`,
keyed by the `key` field on each line here, which is the sha256 of the request. That is how
the scorer replays a run without touching the network.
