'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; seconds: number; output: string }
  | { kind: 'failed'; message: string };

export default function RunButton() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function go() {
    setState({ kind: 'running' });
    try {
      const res = await fetch('/api/run/', { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setState({ kind: 'failed', message: body.message ?? 'The run failed.' });
        return;
      }
      setState({ kind: 'done', seconds: body.seconds, output: body.output });
      router.refresh();
    } catch {
      setState({ kind: 'failed', message: 'Could not reach the local server.' });
    }
  }

  return (
    <div className="no-print mt-10">
      <button
        onClick={go}
        disabled={state.kind === 'running'}
        className="cursor-pointer border-b border-ink pb-0.5 text-[0.9375rem] transition-opacity hover:opacity-60 disabled:cursor-wait disabled:opacity-40"
      >
        {state.kind === 'running' ? 'Reviewing the eight agreements…' : 'Run the review again'}
      </button>

      {state.kind === 'idle' && (
        <p className="mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-ink-faint">
          This calls the model afresh and rewrites the review. It needs an API key and costs a few
          pence. Reading the review as recorded needs neither.
        </p>
      )}

      {state.kind === 'running' && (
        <p className="mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-ink-faint">
          Eight agreements, three clause types each. Any quote that cannot be found in the source is
          sent back to be corrected before it is printed, so this may take a minute.
        </p>
      )}

      {state.kind === 'done' && (
        <p className="mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
          Finished in {state.seconds} second{state.seconds === 1 ? '' : 's'}. {state.output}. The review
          has been rewritten. The figures will not match the previous run exactly, because the model
          takes no temperature setting and nothing about it can be pinned.
        </p>
      )}

      {state.kind === 'failed' && (
        <p className="mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-flag">{state.message}</p>
      )}
    </div>
  );
}
