import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const avatars = ["VX", "NX", "RX", "K9", "Q4", "M3", "A7", "P1"];
const themes = ["Volt", "Lattice", "Tide", "Pulse", "Night", "Ghost"];

export default function PlayerSetupModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="hud-panel w-full max-w-3xl rounded-[1.75rem] p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Player Setup</h2>
            <p className="mt-1 text-sm text-slate-400">Display name, avatar, theme, and live operator preview.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/75">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-[0.28em] text-emerald-300">Display Name</label>
            <input className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" defaultValue="Operator Vela" />

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.28em] text-emerald-300">Avatar Grid</div>
              <div className="grid grid-cols-4 gap-3">
                {avatars.map((avatar) => (
                  <button key={avatar} type="button" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-lg text-white transition hover:border-emerald-400/40 hover:bg-emerald-400/10">
                    {avatar}
                  </button>
                ))}
                <button type="button" className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
                  Random
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.28em] text-emerald-300">Theme Thumbnails</div>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((theme) => (
                  <div key={theme} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-black/20 p-3 text-sm text-slate-200">
                    <div className="h-16 rounded-xl bg-[linear-gradient(135deg,rgba(34,197,94,0.25),rgba(6,182,212,0.18),rgba(15,23,42,0.7))]" />
                    <div className="mt-2 flex items-center justify-between">
                      <span>{theme}</span>
                      <span className="text-emerald-300">3-6</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hud-panel rounded-[1.35rem] p-4">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Live Preview</div>
            <div className="mt-4 flex h-full min-h-[340px] flex-col items-center justify-center rounded-[1.35rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.8),rgba(15,23,42,0.95))] p-4 text-center">
              <div className="grid h-24 w-24 place-items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-3xl font-semibold text-emerald-200">VX</div>
              <div className="mt-4 text-xl font-semibold text-white">Operator Vela</div>
              <div className="text-sm text-emerald-300">Volt Tier / Ready</div>
              <div className="mt-6 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-left text-sm text-slate-300">
                Identity sync complete. Theme latency stable. Connection secured for ranked queue.
              </div>
              <button type="button" className="mt-5 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950">
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}