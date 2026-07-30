import { Link } from "react-router-dom";

const breakdown = [
  ["Accuracy", "97.8%"],
  ["WPM", "141"],
  ["Combo", "28"],
  ["RP Delta", "+72"],
];

export default function Results() {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <article className="hud-panel rounded-[2rem] p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Match Result</div>
        <h1 className="mt-2 text-4xl font-semibold text-white">Victory</h1>
        <div className="mt-4 text-5xl font-semibold text-emerald-300">+72 RP</div>
        <div className="mt-4 space-y-3">
          {breakdown.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
              <span className="text-slate-400">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/play" className="rounded-full bg-emerald-400 px-4 py-3 font-semibold text-slate-950">Play Again</Link>
          <Link to="/" className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-white">Dashboard</Link>
          <button className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-white">Share</button>
        </div>
      </article>

      <article className="space-y-4">
        <div className="hud-panel rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Head-to-Head Compare</h2>
          <div className="mt-5 space-y-3">
            {["You", "Nova-7"].map((name, index) => (
              <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-white">
                  <span>{name}</span>
                  <span>{index === 0 ? "Won" : "Lost"}</span>
                </div>
                <div className="mt-3 h-3 rounded-full bg-black/30">
                  <div className={`h-3 rounded-full ${index === 0 ? "bg-emerald-400 w-[92%]" : "bg-red-400 w-[68%]"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}