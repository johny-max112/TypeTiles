const badges = [
  ["First Blood", "10 matches"],
  ["Perfect Circuit", "99% accuracy"],
  ["Overclock", "30 combo"],
  ["Ghost Ping", "Zero misses"],
  ["Streak Drive", "6 wins"],
  ["Signal Lock", "Ranked unlock"],
];

export default function Achievements() {
  return (
    <section className="space-y-4">
      <div className="hud-panel rounded-[2rem] p-6">
        <h1 className="text-4xl font-semibold text-white">Achievements</h1>
        <p className="mt-2 text-slate-400">Badge grid and completion progress.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {badges.map(([title, progress]) => (
          <div key={title} className="hud-panel rounded-[1.5rem] p-5">
            <div className="h-14 w-14 rounded-2xl border border-emerald-400/30 bg-emerald-400/10" />
            <div className="mt-4 text-xl font-semibold text-white">{title}</div>
            <div className="mt-1 text-sm text-slate-400">{progress}</div>
            <div className="mt-4 h-2 rounded-full bg-black/30">
              <div className="h-2 w-[72%] rounded-full bg-emerald-400" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}