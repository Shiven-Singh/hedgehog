# Reproducing this

Two ways. The first needs nothing but Node and reproduces every number in the
changelog. The second regenerates the model responses and needs an API key.

## Checking the results, offline, no key, no cost

Every model response is cached by a hash of the request and the cache is committed, so
the scorer replays the recorded runs rather than calling anything.

```bash
git clone https://github.com/Shiven-Singh/hedgehog.git
cd hedgehog
npm ci
npm run score      # the comparison table in CHANGELOG.md
npm run report     # writes results/solution/report.md and report.html
```

Requires Node 22 (`.nvmrc` pins 22.21.1). Takes a few seconds. There are no runtime
dependencies; TypeScript and `tsx` are the only packages and both are dev only.

Open `results/solution/report.html` in a browser to see the memo as a reviewer would.

### The review as a site

There is also a small Next.js front end that renders the same review, with a summary chart
across all eight agreements and a page for each one. It reads the committed results at
build time, so like everything else here it needs no key and makes no network calls.

```bash
cd web
npm install
npm run dev       # http://localhost:3000
```

The page also carries a button that re-runs the whole review and rewrites what you are
looking at. That one does call the model, so it needs `GEMINI_API_KEY` either exported or
sitting in `.env` at the root of the repository, and it costs a few pence. Everything else
on the page reads the committed results and needs no key.

The button shells out to `npm run solution`, the same command documented above, rather than
reimplementing the pipeline behind a web form. What it does and what this guide describes
are therefore the same thing by construction.

The root project has no dependency on `web/`, so you can ignore the site entirely and every
number still reproduces.

## Regenerating everything from the model

```bash
export GEMINI_API_KEY=...            # console: aistudio.google.com
export HEDGEHOG_MIN_INTERVAL_MS=0    # leave unset on the free tier, see below
rm -rf cache results
npm run prepare-data                 # rebuilds cases/ from the CUAD download
npm run baseline
npm run solution
npm run score
npm run report
```

`prepare-data` expects the CUAD archive already extracted at
`data/raw/CUAD_v1/CUAD_v1.json`. It is 106MB and not committed:

```bash
mkdir -p data/raw && cd data/raw
curl -L -o CUAD_v1.zip "https://zenodo.org/api/records/4595826/files/CUAD_v1.zip/content"
unzip -q CUAD_v1.zip
```

The eight contracts under `cases/contracts/` are committed, so this step is only needed
if you want to rebuild the case set from scratch.

## Runtime and cost

| | Value |
|---|---|
| Model | `gemini-3.7-flash` |
| Baseline run | 24 calls, about 90 seconds at six concurrent |
| Solution run | 8 calls, about 20 seconds |
| Tokens, baseline | 211,000 prompt, 24,000 output |
| Tokens, solution | 71,000 prompt, 21,000 output |
| Cost | Under one US dollar for every run in the changelog |

**On the free tier this will not complete.** The daily allowance is twenty requests per
model (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`), and the runs above need
about two hundred including the abandoned experiments. Enable billing on the project, or
just use the offline path above, which needs no key at all.

Leave `HEDGEHOG_MIN_INTERVAL_MS` unset to space requests thirteen seconds apart, which
keeps a free-tier key inside the per-minute limit. Set it to `0` on a paid project.

## Reproducing the abandoned experiments

```bash
npm run agent -- retrieval          # the retrieval agent, 24k tokens/case
HEDGEHOG_STRICT=1 npm run solution -- strict
HEDGEHOG_REPAIR=1 npm run solution -- repair
npm run score
```

## Before submitting

```bash
./scripts/check-secrets.sh
```
