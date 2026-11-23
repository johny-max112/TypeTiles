import type { PartnerPovState } from "../lib/classroomTypes";

export function PartnerPovPreview({
  partner,
  assignment,
}: {
  partner: PartnerPovState | null;
  assignment: { userId: number; displayName: string } | null;
}) {
  if (!assignment) {
    return (
      <aside className="flex min-h-[190px] shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/85 p-4 text-center text-white lg:h-full lg:w-[35%]" aria-label="Partner gameplay preview">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Partner POV</div>
        <h2 className="mt-2 text-lg font-semibold">Waiting for a partner</h2>
        <p className="mt-2 text-sm text-slate-400">The odd final student is unpaired for this match.</p>
      </aside>
    );
  }

  const state = partner?.status === "disconnected"
    ? partner
    : partner;
  const statusLabel = state?.status === "completed"
    ? "Completed"
    : state?.status === "paused"
      ? "Paused"
      : state?.status === "disconnected"
        ? "Disconnected"
        : state ? "Playing" : "Connecting";

  return (
    <aside className="flex min-h-[190px] shrink-0 flex-col rounded-2xl border border-white/10 bg-slate-950/85 p-4 text-white lg:h-full lg:w-[35%]" aria-label={`Partner gameplay preview for ${assignment.displayName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-sky-300">Partner POV</div>
          <h2 className="mt-1 truncate text-lg font-semibold">{assignment.displayName}</h2>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs ${statusLabel === "Disconnected" ? "bg-red-400/15 text-red-300" : statusLabel === "Completed" ? "bg-emerald-400/15 text-emerald-300" : "bg-sky-400/15 text-sky-200"}`}>
          {statusLabel}
        </span>
      </div>

      {state ? (
        <>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-3">
            <div className="text-xs text-slate-400">Current target</div>
            <div className="mt-1 min-h-7 break-words font-mono text-lg text-amber-200">{state.target || "Waiting…"}</div>
            {state.typedPrefix ? <div className="mt-1 font-mono text-sm text-emerald-300">{state.typedPrefix}</div> : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-2">
            <div className="rounded-lg bg-white/[0.04] p-2"><span className="text-slate-400">Score</span><div className="font-semibold tabular-nums">{state.score}</div></div>
            <div className="rounded-lg bg-white/[0.04] p-2"><span className="text-slate-400">WPM</span><div className="font-semibold tabular-nums">{state.wpm.toFixed(0)}</div></div>
            <div className="rounded-lg bg-white/[0.04] p-2"><span className="text-slate-400">Accuracy</span><div className="font-semibold tabular-nums">{state.accuracy.toFixed(0)}%</div></div>
            <div className="rounded-lg bg-white/[0.04] p-2"><span className="text-slate-400">Lives</span><div className="font-semibold tabular-nums">{state.lives}</div></div>
            <div className="rounded-lg bg-white/[0.04] p-2"><span className="text-slate-400">Time</span><div className="font-semibold tabular-nums">{state.remainingTime}s</div></div>
            <div className="rounded-lg bg-white/[0.04] p-2"><span className="text-slate-400">Words</span><div className="font-semibold tabular-nums">{state.completedWords}</div></div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">Waiting for partner gameplay…</div>
      )}
    </aside>
  );
}
