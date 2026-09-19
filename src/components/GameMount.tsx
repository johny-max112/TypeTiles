import Phaser from "phaser";
import { useEffect, useRef } from "react";
import MatchHudScene from "../scenes/match_hud";
import type { MatchConfig } from "../lib/mockData";
import type { GameResult } from "../scenes/GameScene";

type Props = {
  matchConfig: MatchConfig;
  onGameOver: (result: GameResult) => void;
};

export function GameMount({ matchConfig, onGameOver }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Create the Phaser game without automatically starting a scene.
    // We start GameScene manually below so we can pass matchConfig to it.
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      transparent: true,
      backgroundColor: "#000000",
      width: host.clientWidth,
      height: host.clientHeight,
      scene: [],
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    });

    // Add and start the Phaser scene.
    // matchConfig is passed to GameScene.init().
    game.scene.add("GameScene", MatchHudScene, true, {
      matchConfig,
      onGameOver,
    });

    // Keep the Phaser canvas responsive when the window changes size.
    const resize = () => {
      game.scale.resize(host.clientWidth, host.clientHeight);
    };

    window.addEventListener("resize", resize);

    // Clean up Phaser and the event listener when leaving the game page.
    return () => {
      window.removeEventListener("resize", resize);
      game.destroy(true);
    };
  }, [matchConfig, onGameOver]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-emerald-400/30 bg-black/50 px-4 py-3 text-xs uppercase tracking-[0.25em] text-emerald-200">
        Match Config: {matchConfig.mode} / {matchConfig.difficulty} /{" "}
        {matchConfig.roundTime}s / {matchConfig.wordSet}
      </div>

      <div
        ref={hostRef}
        className="game-stage h-full min-h-0 w-full"
      />
    </div>
  );
}