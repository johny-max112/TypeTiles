import { useEffect, useState } from "react";
import { getLeaderboard, type LeaderboardRow } from "../lib/playerApi";

const tiers = ["All", "Volt", "Cipher", "Nova"];

export default function Leaderboard() {
  const [selectedTier, setSelectedTier] = useState("All");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getLeaderboard(selectedTier === "All" ? undefined : selectedTier)
      .then((response) => setRows(response.leaderboard))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load leaderboard"))
      .finally(() => setLoading(false));
  }, [selectedTier]);

  return (
    <section className="hud-panel rounded-[2rem] p-6">
      <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Global Ranks</div>
      <h1 className="mt-2 text-4xl font-semibold text-white">Leaderboard</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {tiers.map((tier) => (
          <button key={tier} type="button" onClick={() => setSelectedTier(tier)} className={`rounded-full border px-4 py-2 text-white ${selectedTier === tier ? "border-emerald-400/60 bg-emerald-400/20" : "border-white/10 bg-white/5"}`}>{tier}</button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {loading ? <div className="py-6 text-sm text-slate-400">Loading leaderboard...</div> : null}
        {!loading && !error && rows.length === 0 ? <div className="py-6 text-sm text-slate-400">No leaderboard entries yet.</div> : null}
        {error ? <div className="py-6 text-sm text-amber-300">{error}</div> : null}
        {!loading && !error ? rows.map((row, index) => (
          <div key={row.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
            <div>
              <div className="font-semibold">#{row.rank ?? index + 1} {row.display_name || row.username}</div>
              <div className="text-sm text-slate-400">{row.tier} · {row.total_score} score · {row.best_wpm} WPM</div>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">{row.avg_accuracy.toFixed(1)}%</div>
          </div>
        )) : null}
      </div>
    </section>
  );
}