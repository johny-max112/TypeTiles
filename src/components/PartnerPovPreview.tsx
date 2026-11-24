import { useEffect, useRef } from "react";
import type { PartnerPovState, PartnerPovTile } from "../lib/classroomTypes";

type RenderedTile = PartnerPovTile & {
  renderedX: number;
  renderedY: number;
};

export function PartnerPovPreview({
  partner,
  assignment,
}: {
  partner: PartnerPovState | null;
  assignment: { userId: number; displayName: string } | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const partnerRef = useRef(partner);
  const tilesRef = useRef<Map<string, RenderedTile>>(new Map());

  useEffect(() => {
    partnerRef.current = partner;
    if (import.meta.env.DEV) console.debug("[PartnerPOV] preview state", partner?.status ?? "waiting", partner?.tiles.length ?? 0);
  }, [partner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.clientWidth;
      const height = rect.height || canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const state = partnerRef.current;
      const status = state?.status ?? (assignment ? "playing" : "disconnected");

      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(4, 10, 28, 0.96)";
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(119, 129, 138, 0.72)";
      context.fillRect(0, 0, width, 58);
      context.strokeStyle = "rgba(178, 192, 206, 0.7)";
      context.strokeRect(0.5, 0.5, width - 1, 57);

      context.font = "bold 12px Arial";
      context.fillStyle = "#ffffff";
      const metricWidth = Math.max(1, width / 3);
      context.fillText("Lives", 12, 20);
      context.fillText("Score", 12 + metricWidth, 20);
      context.fillText("Time", 12 + metricWidth * 2, 20);
      context.font = "bold 19px Arial";
      context.fillText(String(state?.lives ?? 0), 12, 43);
      context.fillText(String(state?.score ?? 0), 12 + metricWidth, 43);
      context.fillText(`${state?.remainingTime ?? 0}s`, 12 + metricWidth * 2, 43);

      context.fillStyle = "rgba(16, 36, 65, 0.88)";
      context.fillRect(12, 72, Math.min(width - 24, 156), 184);
      context.strokeStyle = "rgba(82, 149, 190, 0.9)";
      context.strokeRect(12.5, 72.5, Math.min(width - 24, 156), 183);
      context.font = "14px Arial";
      context.fillStyle = "#ffffff";
      context.fillText("WPM", 24, 98);
      context.fillText("Accuracy", 24, 156);
      context.fillText("Words", 24, 214);
      context.font = "bold 20px monospace";
      context.fillStyle = "#72d6ff";
      context.fillText(String(Math.round(state?.wpm ?? 0)), 24, 126);
      context.fillText(`${Math.round(state?.accuracy ?? 0)}%`, 24, 184);
      context.fillStyle = "#ffffff";
      context.fillText(String(state?.completedWords ?? 0), 24, 242);

      const receivedTiles = state?.tiles ?? [];
      const receivedIds = new Set(receivedTiles.map((tile) => tile.id));
      for (const [id, tile] of tilesRef.current) {
        if (!receivedIds.has(id) && tile.state === "active") tilesRef.current.delete(id);
      }
      for (const received of receivedTiles) {
        const existing = tilesRef.current.get(received.id);
        if (existing) {
          existing.text = received.text;
          existing.typedPrefix = received.typedPrefix;
          existing.speed = received.speed;
          existing.state = received.state;
          existing.x = received.x;
          existing.y = received.y;
        } else {
          tilesRef.current.set(received.id, {
            ...received,
            renderedX: received.x,
            renderedY: received.y,
          });
        }
      }

      if (status === "disconnected") {
        context.fillStyle = "rgba(68, 12, 20, 0.92)";
        context.fillRect(width / 2 - 110, height / 2 - 28, 220, 56);
        context.fillStyle = "#fecaca";
        context.font = "bold 18px Arial";
        context.textAlign = "center";
        context.fillText("Partner disconnected", width / 2, height / 2 + 6);
        context.textAlign = "left";
      } else if (status === "paused") {
        context.fillStyle = "rgba(7, 12, 35, 0.82)";
        context.fillRect(width / 2 - 60, height / 2 - 24, 120, 48);
        context.fillStyle = "#facc15";
        context.font = "bold 18px Arial";
        context.textAlign = "center";
        context.fillText("PAUSED", width / 2, height / 2 + 6);
        context.textAlign = "left";
      }

      for (const tile of tilesRef.current.values()) {
        if (status === "playing" && tile.state === "active") {
          tile.renderedY += tile.speed * 0.016;
          tile.renderedX += (tile.x - tile.renderedX) * 0.22;
          tile.renderedY += (tile.y - tile.renderedY) * 0.22;
        } else {
          tile.renderedX += (tile.x - tile.renderedX) * 0.22;
          tile.renderedY += (tile.y - tile.renderedY) * 0.22;
        }

        const tileWidth = Math.max(150, Math.min(width - 32, tile.text.length * 12 + 50));
        const tileHeight = tile.text.length > 56 ? 46 : 52;
        const tileX = Math.max(tileWidth / 2 + 8, Math.min(width - tileWidth / 2 - 8, tile.renderedX * width));
        const tileY = 58 + tile.renderedY * (height - 58);
        context.fillStyle = "rgba(0, 0, 0, 0.38)";
        context.fillRect(tileX - tileWidth / 2 + 3, tileY - tileHeight / 2 + 3, tileWidth, tileHeight);
        context.fillStyle = tile.state === "cleared" ? "rgba(34, 197, 94, 0.55)" : tile.state === "missed" ? "rgba(239, 68, 68, 0.55)" : "#222222";
        context.fillRect(tileX - tileWidth / 2, tileY - tileHeight / 2, tileWidth, tileHeight);
        context.strokeStyle = tile.state === "cleared" ? "#22c55e" : tile.state === "missed" ? "#ef4444" : "#00ff66";
        context.lineWidth = 2;
        context.strokeRect(tileX - tileWidth / 2, tileY - tileHeight / 2, tileWidth, tileHeight);

        context.font = tile.text.length > 56 ? "14px monospace" : "bold 22px monospace";
        const typedLength = Math.max(0, Math.min(tile.typedPrefix.length, tile.text.length));
        const typed = tile.text.slice(0, typedLength);
        const remaining = tile.text.slice(typedLength);
        const totalWidth = context.measureText(tile.text).width;
        let textX = tileX - totalWidth / 2;
        context.fillStyle = "#00ff00";
        context.fillText(typed, textX, tileY + 7);
        textX += context.measureText(typed).width;
        context.fillStyle = "#ffffff";
        context.fillText(remaining, textX, tileY + 7);

        if (tile.state === "cleared" || tile.state === "missed") {
          tilesRef.current.delete(tile.id);
        }
      }

      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [assignment]);

  if (!assignment) {
    return (
      <aside className="flex min-h-[190px] shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/85 p-4 text-center text-white lg:h-full lg:w-[35%]" aria-label="Partner gameplay preview">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Partner Gameplay</div>
        <h2 className="mt-2 text-lg font-semibold">Waiting for a partner</h2>
        <p className="mt-2 text-sm text-slate-400">The odd final student is unpaired for this match.</p>
      </aside>
    );
  }

  const status = partner?.status === "completed"
    ? "Completed"
    : partner?.status === "paused"
      ? "Paused"
      : partner?.status === "disconnected"
        ? "Disconnected"
        : partner ? "Playing" : "Connecting";

  return (
    <aside className="flex min-h-[260px] shrink-0 flex-col rounded-2xl border border-white/10 bg-slate-950/85 p-2 text-white lg:h-full lg:w-[35%]" aria-label={`Partner gameplay preview for ${assignment.displayName}`}>
      <div className="flex items-center justify-between px-2 pb-2">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-sky-300">Partner Gameplay</div>
          <h2 className="mt-1 truncate text-sm font-semibold">{assignment.displayName}</h2>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs ${status === "Disconnected" ? "bg-red-400/15 text-red-300" : status === "Completed" ? "bg-emerald-400/15 text-emerald-300" : "bg-sky-400/15 text-sky-200"}`}>{status}</span>
      </div>
      <canvas ref={canvasRef} className="min-h-[220px] w-full flex-1 rounded-xl bg-slate-950" aria-label="Display-only mirror of partner gameplay" />
    </aside>
  );
}
