import { Link } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext";

export default function TeacherDashboard() {
  const { user } = usePlayerAuth();

  return (
    <section className="h-full overflow-y-auto pb-6">
      <div className="hud-panel rounded-[2rem] p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Teacher Console</div>
        <h1 className="mt-2 text-4xl font-semibold text-white">Welcome, {user?.displayName || user?.username}</h1>
        <p className="mt-2 text-slate-400">Create a classroom room or continue practicing your own typing.</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Link to="/app/custom-decks" className="hud-panel rounded-[1.5rem] p-6 transition hover:border-emerald-400/40">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Content</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Custom Decks</h2>
          <p className="mt-2 text-slate-400">Create and manage private word and sentence practice decks.</p>
        </Link>

        <Link to="/app/lobby" className="hud-panel rounded-[1.5rem] p-6 transition hover:border-emerald-400/40">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Classroom</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Create Classroom</h2>
          <p className="mt-2 text-slate-400">Open a teacher-owned LAN room and share its room code.</p>
        </Link>

        <Link to="/app/play" className="hud-panel rounded-[1.5rem] p-6 transition hover:border-emerald-400/40">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Practice</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Solo Practice</h2>
          <p className="mt-2 text-slate-400">Start a regular solo typing match.</p>
        </Link>

        <Link to="/app/history" className="hud-panel rounded-[1.5rem] p-6 transition hover:border-emerald-400/40">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Progress</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">My History</h2>
          <p className="mt-2 text-slate-400">Review your completed matches and statistics.</p>
        </Link>

        <Link to="/app/settings" className="hud-panel rounded-[1.5rem] p-6 transition hover:border-emerald-400/40">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Account</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">My Profile</h2>
          <p className="mt-2 text-slate-400">Open your existing profile and settings.</p>
        </Link>
      </div>
    </section>
  );
}
