import { Copy, Plus, Send } from "lucide-react";
import { mockOpponents, mockRooms } from "../lib/mockData";

export default function Lobby() {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="hud-panel rounded-[2rem] p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Multiplayer Lobby</div>
        <h1 className="mt-2 text-4xl font-semibold text-white">Create or Join Room</h1>
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" placeholder="Room code" />
            <button className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">Join</button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none" placeholder="Create room name" />
            <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white"><Plus className="mr-2 inline h-4 w-4" />Create</button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Invite code</span>
              <button className="text-emerald-300"><Copy className="mr-1 inline h-4 w-4" />XR9Q</button>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-[0.4em] text-white">XR9Q</div>
          </div>
        </div>
      </article>

      <article className="space-y-4">
        <div className="hud-panel rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Room State</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {mockOpponents.map((player) => (
              <div key={player.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-lg font-semibold text-white">{player.name}</div>
                <div className="text-sm text-slate-400">{player.tier}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.3em] text-emerald-300">{player.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Match Settings</h2>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Host Only Start</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["Mode", "Difficulty", "Round Time", "Word Set"].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
                <div className="mt-2 text-lg">Ranked Duel</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Room List</h2>
          <div className="mt-4 space-y-3">
            {mockRooms.map((room) => (
              <div key={room.code} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="font-semibold text-white">Room {room.code}</div>
                  <div className="text-sm text-slate-400">{room.mode} / {room.difficulty}</div>
                </div>
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"><Send className="mr-2 inline h-4 w-4" />Invite</button>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}