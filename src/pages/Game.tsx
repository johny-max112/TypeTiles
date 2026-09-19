import { GameMount } from "../components/GameMount";
import type { MatchConfig } from "../lib/mockData";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import type { GameResult } from "../scenes/GameScene";
import { submitPlayerMatchResult } from "../lib/playerApi";

type Props = {
  matchConfig: MatchConfig;
  matchId?: number;
};

export default function Game({ matchConfig, matchId }: Props) {
  const navigate = useNavigate();
  const submissionStartedRef = useRef(false);

  const handleGameOver = async (result: GameResult) => {
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    if (matchId === undefined) {
      navigate("/app/results", { state: { result, persistenceStatus: "error" } });
      return;
    }

    try {
      await submitPlayerMatchResult({
        matchId,
        score: result.score,
        wpm: result.wpm,
        accuracy: result.accuracy,
      });
      navigate("/app/results", { state: { result, persistenceStatus: "saved" } });
    } catch {
      navigate("/app/results", { state: { result, persistenceStatus: "error" } });
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="hud-panel rounded-[2rem] px-5 py-4">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Match</div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.mode}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.difficulty}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.roundTime}s</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{matchConfig.wordSet}</span>
        </div>
      </div>

      <GameMount
        matchConfig={matchConfig}
        onGameOver={handleGameOver}
      />
    </section>
  );
}