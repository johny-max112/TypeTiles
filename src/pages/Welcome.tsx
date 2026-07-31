import { useNavigate } from "react-router-dom";
import HudBackground from "../components/HudBackground";

export default function Welcome() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <HudBackground />
      <div className="relative z-10 p-10 rounded-lg bg-black/40 backdrop-blur-sm shadow-lg max-w-2xl text-left">
        <h1 className="text-4xl font-extrabold mb-4">Welcome to Type Tiles</h1>
        <p className="mb-6">Solo grinder or squad player? Type Tiles has you covered! Challenge yourself in single player mode or go head to head with your friends and see who reigns supreme on the keyboard.</p>
        <p className="mb-6">Personalize your avatar, pick your favorite topic category, and dive into the words you love. Track your progress, climb the ranks, and become the typing champion you were always meant to be!</p>
        <p className="mb-8">Ready to start your typing journey? Create your account now and let the tiles fall!</p>
        <div className="flex gap-4">
          <button className="px-6 py-2 bg-cyan-400 text-slate-900 rounded font-semibold" onClick={() => nav("/dashboard")}>Get Started</button>
          <button className="px-6 py-2 border border-white/20 rounded" onClick={() => nav("/dashboard")}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}
