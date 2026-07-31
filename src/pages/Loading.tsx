import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HudBackground from "../components/HudBackground";

export default function Loading() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      nav("/welcome", { replace: true });
    }, 2000);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <HudBackground />
      <div className="relative z-10 p-8 rounded-lg bg-black/40 backdrop-blur-sm shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-4">Type Tiles</h1>
        <p className="mb-6">Validating your session and preparing your game…</p>
        <div className="w-48 h-2 bg-white/20 rounded overflow-hidden mx-auto">
          <div className="h-full bg-cyan-400 animate-loading" style={{ width: "70%" }} />
        </div>
      </div>
    </div>
  );
}
