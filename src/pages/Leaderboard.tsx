const tiers = ["Volt", "Cipher", "Nova"];
const rows = [
  { name: "Operator Vela", tier: "Volt I", rank: 1, state: "self" },
  { name: "Nova-7", tier: "Volt II", rank: 2, state: "top" },
  { name: "Cipher", tier: "Volt III", rank: 3, state: "eliminated" },
  { name: "Orbit", tier: "Volt V", rank: 4, state: "disconnected" },
];

export default function Leaderboard() {
  return (
    <section className="hud-panel rounded-[2rem] p-6">
      <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Global Ranks</div>
      <h1 className="mt-2 text-4xl font-semibold text-white">Leaderboard</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {tiers.map((tier) => (
          <button key={tier} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white">{tier}</button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
            <div>
              <div className="font-semibold">#{row.rank} {row.name}</div>
              <div className="text-sm text-slate-400">{row.tier}</div>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">{row.state}</div>
          </div>
        ))}
      </div>
    </section>
  );
}