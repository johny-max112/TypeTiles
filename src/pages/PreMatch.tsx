import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mockMatchConfig } from "../lib/mockData";

export default function PreMatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const matchConfig = (location.state as { matchConfig?: typeof mockMatchConfig } | null)?.matchConfig ?? mockMatchConfig;
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          navigate("/game", { state: { matchConfig } });
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [matchConfig, navigate]);

  return (
    <section className="hud-panel rounded-[2rem] p-6 text-center">
      <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Pre-Match</div>
      <h1 className="mt-2 text-4xl font-semibold text-white">Deploying in {countdown}</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-left text-slate-300">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Opponent Cards</div>
          <ul className="mt-3 space-y-3">
            {matchConfig.opponents.map((opponent) => (
              <li key={opponent} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">{opponent}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.15),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.85),rgba(15,23,42,0.95))] p-5 text-left">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Rules Summary</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Mode</div>
              <div className="mt-2 text-lg">{matchConfig.mode}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Difficulty</div>
              <div className="mt-2 text-lg">{matchConfig.difficulty}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Round Time</div>
              <div className="mt-2 text-lg">{matchConfig.roundTime}s</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-slate-300">Map preview locked. Route state carries the selected match configuration to the game scene.</div>
        </div>
      </div>
    </section>
  );
}