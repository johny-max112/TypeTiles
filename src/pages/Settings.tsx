export default function Settings() {
  return (
    <section className="hud-panel rounded-[2rem] p-6">
      <h1 className="text-4xl font-semibold text-white">Settings</h1>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {[
          ["Audio", "Scanline hum, click feedback, hit markers"],
          ["Display", "Light / dark variance, density, scale"],
          ["Matchmaking", "Auto queue, invite privacy, region"],
          ["Accessibility", "Contrast boost, font size, reduced motion"],
        ].map(([label, text]) => (
          <label key={label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-white">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
            <div className="mt-2 text-sm text-slate-300">{text}</div>
            <input type="range" className="mt-4 w-full" />
          </label>
        ))}
      </div>
    </section>
  );
}