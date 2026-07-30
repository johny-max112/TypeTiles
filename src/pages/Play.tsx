import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mockMatchConfig } from "../lib/mockData";

export default function Play() {
  const navigate = useNavigate();
  const presets = useMemo(
    () => [
      { label: "Ranked Duel", mode: "Ranked Duel", difficulty: "Hard" },
      { label: "Casual Sprint", mode: "Casual Sprint", difficulty: "Normal" },
      { label: "Survival", mode: "Survival", difficulty: "Extreme" },
    ],
    [],
  );

  return (
    <section className="hud-panel rounded-[2rem] p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Play Queue</div>
          <h1 className="mt-2 text-4xl font-semibold text-white">Start Game</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Choose the match mode, difficulty, round time, and word set before dropping into the pre-match countdown.</p>
        </div>
        <Link to="/lobby" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Multiplayer Lobby</Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-left hover:border-emerald-400/40 hover:bg-emerald-400/10"
            onClick={() => navigate("/pre-match", { state: { matchConfig: { ...mockMatchConfig, mode: preset.mode, difficulty: preset.difficulty } } })}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Preset</div>
            <div className="mt-3 text-2xl font-semibold text-white">{preset.label}</div>
            <div className="mt-2 text-sm text-slate-400">Routes to pre-match with route state.</div>
          </button>
        ))}
      </div>
    </section>
  );
}