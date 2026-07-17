"use client";

import * as React from "react";

// ── useOptimisticAction — instant-feel writes with honest rollback ────────────
// The suite's perceived speed hinges on writes FEELING immediate: apply the
// UI change first, run the server action, and roll back (with the caller's
// error surface, usually toast.error) only if the write actually failed.
//
// Failure is either a thrown error OR a resolved value shaped like the suite's
// ActionResult with ok:false — both roll back, so callers can pass their server
// actions straight through without adapting them.
//
//   const { run, pending } = useOptimisticAction();
//   run({
//     optimistic: () => setRows((r) => [...r, draft]),
//     rollback:   () => setRows((r) => r.filter((x) => x.id !== draft.id)),
//     action:     () => createTask(draft),
//     onError:    (msg) => toast.error(msg),
//   });

type MaybeActionResult = { ok?: boolean; error?: string } | undefined | null | void;

export interface OptimisticRun<R extends MaybeActionResult> {
  /** Apply the UI change immediately (before the server responds). */
  optimistic: () => void;
  /** Undo the UI change — called only when the action fails. */
  rollback: () => void;
  /** The real write (server action). */
  action: () => Promise<R>;
  /** Failure surface — receives the error message. */
  onError?: (message: string) => void;
}

export function useOptimisticAction() {
  const [pending, setPending] = React.useState(false);

  const run = React.useCallback(
    async <R extends MaybeActionResult>(opts: OptimisticRun<R>): Promise<R | undefined> => {
      opts.optimistic();
      setPending(true);
      try {
        const result = await opts.action();
        if (result && typeof result === "object" && "ok" in result && result.ok === false) {
          opts.rollback();
          opts.onError?.(result.error ?? "The change couldn't be saved.");
        }
        return result;
      } catch (e) {
        opts.rollback();
        opts.onError?.(e instanceof Error ? e.message : "The change couldn't be saved.");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { run, pending };
}
