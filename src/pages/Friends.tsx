const friends = [
  ["Nova-7", "Online", "Invite sent"],
  ["Cipher", "Away", "Queue later"],
  ["Orbit", "Offline", "Disconnected"],
];

export default function Friends() {
  return (
    <section className="hud-panel rounded-[2rem] p-6">
      <h1 className="text-4xl font-semibold text-white">Friends</h1>
      <div className="mt-5 space-y-3">
        {friends.map(([name, status, note]) => (
          <div key={name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-sm text-slate-400">{note}</div>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-emerald-300">{status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}