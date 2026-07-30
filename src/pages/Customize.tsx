import PlayerSetupModal from "../components/PlayerSetupModal";

export default function Customize() {
  return (
    <section className="space-y-4">
      <div className="hud-panel rounded-[2rem] p-6">
        <h1 className="text-4xl font-semibold text-white">Customize</h1>
        <p className="mt-2 text-slate-400">Avatar presets, theme thumbnails, and identity controls.</p>
      </div>
      <PlayerSetupModal open onClose={() => undefined} />
    </section>
  );
}