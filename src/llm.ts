import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Every model call goes through here, for three reasons.
//
// Identical requests are served from cache/, which is committed. Current models
// no longer accept a temperature parameter, so a recorded transcript is the only
// way to make this evaluation deterministic and to let a reviewer reproduce the
// numbers offline without a key.
//
// Tokens, cost and latency are recorded per call, because the write up has to
// report cost per contract and that cannot be worked out after the fact.
//
// Each request and response is appended to trajectories/ as it happens.

export const MODEL = process.env.HEDGEHOG_MODEL ?? 'claude-opus-5';

// USD per million tokens.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface CallParams {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}

export interface CallResult {
  message: Anthropic.Message;
  usage: Usage;
  wallMs: number;
  cached: boolean;
}

let client: Anthropic | null = null;

function measure(u: Anthropic.Usage): Usage {
  const p = PRICING[MODEL] ?? PRICING['claude-opus-5']!;
  const read = u.cache_read_input_tokens ?? 0;
  const write = u.cache_creation_input_tokens ?? 0;
  const costUsd =
    (u.input_tokens * p.input + read * p.input * 0.1 + write * p.input * 1.25 + u.output_tokens * p.output) /
    1_000_000;
  return { inputTokens: u.input_tokens + read + write, outputTokens: u.output_tokens, costUsd };
}

export async function callClaude(
  label: string,
  params: CallParams,
  opts: { offline?: boolean } = {},
): Promise<CallResult> {
  const key = crypto.createHash('sha256').update(JSON.stringify({ MODEL, ...params })).digest('hex');
  const file = path.join('cache', `${key}.json`);

  if (fs.existsSync(file)) {
    const message: Anthropic.Message = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { message, usage: measure(message.usage), wallMs: 0, cached: true };
  }

  if (opts.offline) {
    throw new Error(
      `Cache miss (${key.slice(0, 12)}). The committed cache covers the frozen eval set, ` +
        `so a miss means a prompt has changed. Re-run with an API key to refill it.`,
    );
  }

  const started = Date.now();
  let message: Anthropic.Message;
  try {
    message = await (client ??= new Anthropic()).messages.create({
      model: MODEL,
      max_tokens: params.maxTokens ?? 8000,
      thinking: { type: 'adaptive' },
      system: params.system,
      messages: params.messages,
      ...(params.tools ? { tools: params.tools } : {}),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error('No valid credentials. Export ANTHROPIC_API_KEY and try again.');
    }
    throw err;
  }
  const wallMs = Date.now() - started;

  fs.mkdirSync('cache', { recursive: true });
  fs.writeFileSync(file, JSON.stringify(message, null, 2));
  fs.mkdirSync('trajectories', { recursive: true });
  fs.appendFileSync(
    path.join('trajectories', `${label}.jsonl`),
    JSON.stringify({ key, request: params, response: message, wallMs }) + '\n',
  );

  return { message, usage: measure(message.usage), wallMs, cached: false };
}

export function textOf(m: Anthropic.Message): string {
  return m.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
