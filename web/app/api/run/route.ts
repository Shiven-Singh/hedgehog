import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * Find the repository root by walking up until we see the CLI's package.json.
 * The bundled route does not reliably run with `web/` as its working directory,
 * so resolving it as `cwd/..` silently looked in the wrong place.
 */
function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.name === 'hedgehog') return dir;
    } catch {
      // keep walking
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return path.join(process.cwd(), '..');
}

const ROOT = findRoot();

// Re-runs the review by invoking the same command a person would type. There is
// no second implementation of the pipeline living in here, which matters: what
// the button does and what the reproduction guide documents are the same thing.
export async function POST() {
  const key = process.env.GEMINI_API_KEY ?? readKeyFromEnvFile();

  if (!key) {
    return Response.json(
      {
        ok: false,
        message:
          `No GEMINI_API_KEY found. The review can be re-run only with a key, since it calls a ` +
          `model. Put one in a .env file at ${ROOT}, or read the recorded review instead, which ` +
          `needs no key at all.`,
      },
      { status: 400 },
    );
  }

  try {
    const started = Date.now();
    const { stdout } = await run('npm', ['run', 'solution', '--silent'], {
      cwd: ROOT,
      // HEDGEHOG_NO_CACHE passes through, so starting the server with it set
      // makes the button do real work instead of replaying the recorded run.
      env: { ...process.env, GEMINI_API_KEY: key, HEDGEHOG_MIN_INTERVAL_MS: '0' },
      timeout: 10 * 60 * 1000,
      maxBuffer: 8 * 1024 * 1024,
    });
    await run('npm', ['run', 'report', '--silent'], { cwd: ROOT, env: { ...process.env, GEMINI_API_KEY: key } });

    return Response.json({
      ok: true,
      seconds: Math.round((Date.now() - started) / 1000),
      output: stdout.trim().split('\n').filter(Boolean).at(-1) ?? '',
    });
  } catch (err) {
    return Response.json(
      { ok: false, message: err instanceof Error ? err.message.slice(0, 400) : 'The run failed.' },
      { status: 500 },
    );
  }
}

/** The repository keeps its key in .env at the root; the server may not have it exported. */
function readKeyFromEnvFile(): string | null {
  for (const dir of [ROOT, process.cwd(), path.join(process.cwd(), '..')]) {
    try {
      const line = fs
        .readFileSync(path.join(dir, '.env'), 'utf8')
        .split('\n')
        .find((l) => l.trim().startsWith('GEMINI_API_KEY='));
      const value = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (value) return value;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
