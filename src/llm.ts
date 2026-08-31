import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Every model call goes through here, for three reasons.
//
// Identical requests are served from cache/, which is committed. That is what
// makes the evaluation deterministic and lets a reviewer reproduce the numbers
// offline without a key of their own.
//
// Tokens and latency are recorded per call, because the write up has to report
// cost per contract and that cannot be worked out after the fact.
//
// Each request and response is appended to trajectories/ as it happens.
//
// This talks to the REST endpoint rather than a client library. The request
// shape is small, it is one less dependency to pin, and it was verified by hand
// before it was written down.

export const MODEL = process.env.HEDGEHOG_MODEL ?? 'gemini-3.7-flash';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Part {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

export interface CallParams {
  system: string;
  contents: Content[];
  tools?: Tool[];
  maxTokens?: number;
}

export interface Usage {
  promptTokens: number;
  outputTokens: number;
  thoughtTokens: number;
}

export interface CallResult {
  parts: Part[];
  text: string;
  usage: Usage;
  wallMs: number;
  cached: boolean;
}

interface ApiResponse {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  error?: { code: number; status: string; message: string };
}

function requestBody(p: CallParams) {
  return {
    system_instruction: { parts: [{ text: p.system }] },
    contents: p.contents,
    generationConfig: { maxOutputTokens: p.maxTokens ?? 8000 },
    ...(p.tools ? { tools: [{ functionDeclarations: p.tools }] } : {}),
  };
}

function summarise(r: ApiResponse): Omit<CallResult, 'wallMs' | 'cached'> {
  const parts = r.candidates?.[0]?.content?.parts ?? [];
  const u = r.usageMetadata ?? {};
  return {
    parts,
    text: parts.map((p) => p.text ?? '').join(''),
    usage: {
      promptTokens: u.promptTokenCount ?? 0,
      outputTokens: u.candidatesTokenCount ?? 0,
      thoughtTokens: u.thoughtsTokenCount ?? 0,
    },
  };
}

/**
 * The free tier allows five requests a minute, and reactive backoff alone just
 * thrashes: every retry spends quota too. So space the starts out instead. Set
 * HEDGEHOG_MIN_INTERVAL_MS=0 once the project has billing enabled.
 */
const MIN_INTERVAL_MS = Number(process.env.HEDGEHOG_MIN_INTERVAL_MS ?? 13_000);
let nextSlot = 0;

async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  if (start > now) await new Promise((r) => setTimeout(r, start - now));
}

export async function call(
  label: string,
  params: CallParams,
  opts: { offline?: boolean } = {},
): Promise<CallResult> {
  const body = requestBody(params);
  const key = crypto.createHash('sha256').update(JSON.stringify({ MODEL, body })).digest('hex');
  const file = path.join('cache', `${key}.json`);

  // HEDGEHOG_NO_CACHE=1 forces live calls. Used to measure how much these runs
  // vary between themselves, which the cache otherwise hides completely.
  if (fs.existsSync(file) && process.env.HEDGEHOG_NO_CACHE !== '1') {
    const cached: ApiResponse = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...summarise(cached), wallMs: 0, cached: true };
  }

  if (opts.offline) {
    throw new Error(
      `Cache miss (${key.slice(0, 12)}). The committed cache covers the frozen set, ` +
        `so a miss means a prompt has changed. Re-run with a key to refill it.`,
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Put it in .env and source it.');

  const started = Date.now();
  let json: ApiResponse | null = null;

  // The free tier allows five requests a minute and says how long to wait when
  // you overrun it, so honour that rather than guessing at a backoff.
  for (let attempt = 0; attempt < 10; attempt++) {
    await waitForSlot();
    const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = (await res.json()) as ApiResponse;
    // 429 means we overran the free tier's five requests a minute, and the
    // message says how long to wait, so honour that. 500 and 503 mean the model
    // is busy, which needs an ordinary exponential backoff instead.
    const code = parsed.error?.code;
    if (code === 429 || code === 500 || code === 503) {
      const stated = Number(/retry in ([0-9.]+)s/i.exec(parsed.error!.message)?.[1] ?? 0);
      const waitMs = stated > 0 ? stated * 1000 + 1000 : Math.min(2 ** attempt * 2000, 60_000);
      await new Promise((r) => setTimeout(r, Math.ceil(waitMs)));
      continue;
    }
    json = parsed;
    break;
  }
  const wallMs = Date.now() - started;

  if (!json) throw new Error('rate limited repeatedly; giving up after ten attempts');
  if (json.error) throw new Error(`${json.error.status} (${json.error.code}): ${json.error.message}`);
  if (!json.candidates?.length) throw new Error(`no candidates returned: ${JSON.stringify(json).slice(0, 200)}`);

  fs.mkdirSync('cache', { recursive: true });
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  fs.mkdirSync('trajectories', { recursive: true });
  fs.appendFileSync(
    path.join('trajectories', `${label}.jsonl`),
    JSON.stringify({ key, request: body, response: json, wallMs }) + '\n',
  );

  return { ...summarise(json), wallMs, cached: false };
}

/**
 * Run tasks a few at a time. Calls take the better part of ten seconds each
 * because the model thinks before answering, so running the whole evaluation
 * one case after another wastes minutes we do not have. Four at a time keeps
 * us inside the free tier's request limits.
 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!, i);
      }
    }),
  );
  return out;
}
