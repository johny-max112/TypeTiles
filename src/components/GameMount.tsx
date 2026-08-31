import Phaser from "phaser";
import { useEffect, useRef } from "react";
import MatchHudScene from "../scenes/match_hud";
import type { MatchConfig } from "../lib/mockData";

type Props = {
  matchConfig: MatchConfig;
};

export function GameMount({ matchConfig }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      transparent: true,
      backgroundColor: "#000000",
      width: host.clientWidth,
      height: host.clientHeight,
      scene: [MatchHudScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    });

    const resize = () => {
      game.scale.resize(host.clientWidth, host.clientHeight);
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      game.destroy(true);
    };
  }, []);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-emerald-400/30 bg-black/50 px-4 py-3 text-xs uppercase tracking-[0.25em] text-emerald-200">
        Match Config: {matchConfig.mode} / {matchConfig.difficulty} / {matchConfig.roundTime}s / {matchConfig.wordSet}
      </div>
      <div ref={hostRef} className="game-stage h-full min-h-0 w-full" />
    </div>
  );
}