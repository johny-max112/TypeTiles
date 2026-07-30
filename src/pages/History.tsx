import { matchHistory } from "../lib/mockData";

export default function History() {
  return (
    <section className="space-y-4">
      <div className="hud-panel rounded-[2rem] p-6">
        <h1 className="text-4xl font-semibold text-white">Score History</h1>
        <p className="mt-2 text-slate-400">Filterable match log, recent trends, and personal bests.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="hud-panel rounded-[2rem] p-6">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="pb-3">Date</th>
                <th className="pb-3">Mode</th>
                <th className="pb-3">WPM</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {matchHistory.map((row) => (
                <tr key={row.date} className="border-t border-white/8 text-white">
                  <td className="py-3">{row.date}</td>
                  <td>{row.mode}</td>
                  <td>{row.wpm}</td>
                  <td>{row.accuracy}%</td>
                  <td className={row.result === "Win" ? "text-emerald-300" : "text-red-300"}>{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="hud-panel rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-white">7 / 30 Game Trend</h2>
            <div className="mt-4 flex h-56 items-end gap-2">
              {[40, 56, 45, 72, 68, 82, 90].map((height, index) => (
                <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-emerald-500/60 to-cyan-400/80" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="hud-panel rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-white">Personal Bests</h2>
            <div className="mt-4 space-y-3 text-white">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Best WPM: 148</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Best Accuracy: 99.1%</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Longest Combo: 38</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}