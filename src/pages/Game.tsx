import { GameMount } from "../components/GameMount";
import type { MatchConfig } from "../lib/mockData";

type Props = {
  matchConfig: MatchConfig;
};

export default function Game({ matchConfig }: Props) {
  return (
    <section className="space-y-4">
      <div className="hud-panel rounded-[2rem] px-5 py-4">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Match</div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.mode}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.difficulty}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.roundTime}s</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.wordSet}</span>
        </div>
      </div>

      <GameMount matchConfig={matchConfig} />
    </section>
  );
}