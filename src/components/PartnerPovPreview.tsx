import { memo, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { PartnerPovSnapshot } from "../lib/classroomTypes";
import { predictNormalizedY, smoothToward } from "../lib/partnerPovInterpolation";

type RenderedTile = {
  id: string;
  text: string;
  typedPrefix: string;
  x: number;
  y: number;
  speed: number;
  state: "active" | "cleared" | "missed";
  renderedX: number;
  renderedY: number;
  receivedAt: number;
  removeAt: number | null;
  font: string;
  textWidth: number;
  typedWidth: number;
};

export const PartnerPovPreview = memo(function PartnerPovPreview({
  snapshotRef,
  assignment,
  roomId,
  matchId,
  viewerUserId,
  startAt,
  roundTime,
}: {
  snapshotRef: MutableRefObject<PartnerPovSnapshot | null>;
  assignment: { userId: number; displayName: string } | null;
  roomId: string;
  matchId: string;
  viewerUserId?: number;
  startAt?: number;
  roundTime: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reactRenderCountRef = useRef(0);
  const [displayStatus, setDisplayStatus] = useState<"playing" | "paused" | "completed" | "disconnected" | "connecting">("connecting");
  reactRenderCountRef.current += 1;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextStatus = snapshotRef.current?.state.status ?? "connecting";
      setDisplayStatus((current) => current === nextStatus ? current : nextStatus);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [snapshotRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const tiles = new Map<string, RenderedTile>();
    let appliedSnapshot: PartnerPovSnapshot | null = null;
    let frame = 0;
    let lastFrameAt = performance.now();
    let metricsStartedAt = lastFrameAt;
    let frameCount = 0;
    let receivedCount = 0;
    let messageBytes = 0;
    let latencyTotalMs = 0;
    let latencySamples = 0;
    let maxTileCount = 0;

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

    const draw = (now: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const snapshot = snapshotRef.current;
      const state = snapshot?.state;
      const status = state?.status ?? (assignment ? "playing" : "disconnected");
      const deltaSeconds = Math.max(0, Math.min(0.1, (now - lastFrameAt) / 1000));
      lastFrameAt = now;
      frameCount += 1;

      if (snapshot && snapshot !== appliedSnapshot) {
        appliedSnapshot = snapshot;
        receivedCount += 1;
        messageBytes += snapshot.messageBytes;
        if (Number.isFinite(state?.sentAt)) {
          const latency = Date.now() - (state?.sentAt ?? Date.now());
          if (latency >= 0 && latency < 60_000) {
            latencyTotalMs += latency;
            latencySamples += 1;
          }
        }

        const receivedIds = new Set<string>();
        for (const received of state?.tiles ?? []) {
          receivedIds.add(received.id);
          const existing = tiles.get(received.id);
          if (existing) {
            if (existing.text !== received.text) {
              existing.text = received.text;
              existing.font = received.text.length > 56 ? "14px monospace" : "bold 22px monospace";
              context.font = existing.font;
              existing.textWidth = context.measureText(received.text).width;
              existing.typedWidth = context.measureText(received.text.slice(0, existing.typedPrefix.length)).width;
            }
            if (existing.typedPrefix !== received.typedPrefix) {
              existing.typedPrefix = received.typedPrefix;
              context.font = existing.font;
              existing.typedWidth = context.measureText(received.text.slice(0, received.typedPrefix.length)).width;
            }
            existing.x = received.x;
            existing.y = received.y;
            existing.speed = received.speed;
            existing.state = received.state;
            existing.receivedAt = snapshot.receivedAt;
            existing.removeAt = received.state === "active" ? null : snapshot.receivedAt + 180;
          } else {
            const font = received.text.length > 56 ? "14px monospace" : "bold 22px monospace";
            context.font = font;
            const textWidth = context.measureText(received.text).width;
            const typedWidth = context.measureText(received.text.slice(0, received.typedPrefix.length)).width;
            tiles.set(received.id, {
              ...received,
              renderedX: received.x,
              renderedY: received.y,
              receivedAt: snapshot.receivedAt,
              removeAt: received.state === "active" ? null : snapshot.receivedAt + 180,
              font,
              textWidth,
              typedWidth,
            });
          }
        }
        for (const tile of tiles.values()) {
          if (!receivedIds.has(tile.id) && tile.removeAt === null) {
            tile.removeAt = snapshot.receivedAt + 120;
          }
        }
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(4, 10, 28, 0.96)";
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(119, 129, 138, 0.72)";
      context.fillRect(0, 0, width, 58);
      context.strokeStyle = "rgba(178, 192, 206, 0.7)";
      context.strokeRect(0.5, 0.5, width - 1, 57);

      const metrics = [
        ["Lives", String(state?.lives ?? 0)],
        ["Score", String(state?.score ?? 0)],
        ["WPM", String(Math.round(state?.wpm ?? 0))],
        ["Accuracy", `${Math.round(state?.accuracy ?? 0)}%`],
        ["Time", `${startAt === undefined
          ? state?.remainingTime ?? 0
          : Math.max(0, Math.min(roundTime, Math.ceil((startAt + roundTime * 1000 - Date.now()) / 1000)))}s`],
      ];
      const metricWidth = Math.max(1, width / metrics.length);
      context.textAlign = "center";
      context.font = "bold 10px Arial";
      context.fillStyle = "#ffffff";
      context.font = "bold 10px Arial";
      metrics.forEach(([label, value], index) => {
        const centerX = metricWidth * index + metricWidth / 2;
        context.fillText(label, centerX, 18, metricWidth - 4);
        context.font = "bold 14px Arial";
        context.fillText(value, centerX, 42, metricWidth - 4);
        context.font = "bold 10px Arial";
      });
      context.textAlign = "left";

      const expired: string[] = [];
      for (const tile of tiles.values()) {
        if (tile.removeAt !== null && now >= tile.removeAt) {
          expired.push(tile.id);
          continue;
        }

        const ageMs = Math.max(0, now - tile.receivedAt);
        const targetY = status === "playing" && tile.state === "active"
          ? predictNormalizedY(tile.y, tile.speed, ageMs)
          : tile.y;
        tile.renderedX = smoothToward(tile.renderedX, tile.x, deltaSeconds);
        tile.renderedY = smoothToward(tile.renderedY, targetY, deltaSeconds);

        const tileWidth = Math.max(150, Math.min(width - 32, tile.textWidth + 50));
        const tileHeight = tile.text.length > 56 ? 46 : 52;
        const tileX = Math.max(tileWidth / 2 + 8, Math.min(width - tileWidth / 2 - 8, tile.renderedX * width));
        const tileY = 58 + tile.renderedY * (height - 58);
        context.globalAlpha = tile.removeAt === null
          ? 1
          : Math.max(0, (tile.removeAt - now) / (tile.state === "active" ? 120 : 180));
        context.fillStyle = "rgba(0, 0, 0, 0.38)";
        context.fillRect(tileX - tileWidth / 2 + 3, tileY - tileHeight / 2 + 3, tileWidth, tileHeight);
        context.fillStyle = tile.state === "cleared"
          ? "rgba(34, 197, 94, 0.55)"
          : tile.state === "missed" ? "rgba(239, 68, 68, 0.55)" : "#222222";
        context.fillRect(tileX - tileWidth / 2, tileY - tileHeight / 2, tileWidth, tileHeight);
        context.strokeStyle = tile.state === "cleared" ? "#22c55e" : tile.state === "missed" ? "#ef4444" : "#00ff66";
        context.lineWidth = 2;
        context.strokeRect(tileX - tileWidth / 2, tileY - tileHeight / 2, tileWidth, tileHeight);

        const typedLength = Math.max(0, Math.min(tile.typedPrefix.length, tile.text.length));
        const typed = tile.text.slice(0, typedLength);
        const remaining = tile.text.slice(typedLength);
        let textX = tileX - tile.textWidth / 2;
        context.font = tile.font;
        context.fillStyle = "#00ff00";
        context.fillText(typed, textX, tileY + 7);
        textX += tile.typedWidth;
        context.fillStyle = "#ffffff";
        context.fillText(remaining, textX, tileY + 7);
        context.globalAlpha = 1;
      }
      for (const id of expired) tiles.delete(id);
      maxTileCount = Math.max(maxTileCount, tiles.size);

      if (status === "disconnected" || status === "paused" || status === "completed") {
        const label = status === "disconnected" ? "Partner disconnected" : status.toUpperCase();
        context.fillStyle = status === "disconnected" ? "rgba(68, 12, 20, 0.92)" : "rgba(7, 12, 35, 0.82)";
        context.fillRect(width / 2 - 110, height / 2 - 28, 220, 56);
        context.fillStyle = status === "disconnected" ? "#fecaca" : "#facc15";
        context.font = "bold 18px Arial";
        context.textAlign = "center";
        context.fillText(label, width / 2, height / 2 + 6);
        context.textAlign = "left";
      }

      if (import.meta.env.DEV && now - metricsStartedAt >= 5000) {
        const seconds = (now - metricsStartedAt) / 1000;
        console.debug("[PartnerPOV perf] renderer", {
          matchId,
          roomId,
          senderId: state?.userId ?? assignment?.userId ?? null,
          recipientId: viewerUserId ?? null,
          canvasRenderHz: Math.round(frameCount / seconds),
          updatesPerSecond: Number((receivedCount / seconds).toFixed(1)),
          averageMessageBytes: receivedCount ? Math.round(messageBytes / receivedCount) : 0,
          averageSenderToReceiverMs: latencySamples ? Math.round(latencyTotalMs / latencySamples) : null,
          reactRendersPerSecond: Number((reactRenderCountRef.current / seconds).toFixed(2)),
          rendererTileCount: tiles.size,
          activeTileCount: [...tiles.values()].filter(tile => tile.state === "active").length,
          maxTileObjects: maxTileCount,
          canvasDrawCount: frameCount,
          canvasWidth: width,
          canvasHeight: height,
          score: state?.score ?? 0,
          remainingTime: state?.remainingTime ?? 0,
          lastSnapshotTimestamp: state?.sentAt ?? null,
        });
        metricsStartedAt = now;
        frameCount = 0;
        receivedCount = 0;
        messageBytes = 0;
        latencyTotalMs = 0;
        latencySamples = 0;
        maxTileCount = tiles.size;
        reactRenderCountRef.current = 0;
      }

      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [assignment, matchId, roomId, roundTime, snapshotRef, startAt, viewerUserId]);

  if (!assignment) {
    return (
      <aside className="flex min-h-[190px] shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/85 p-4 text-center text-white lg:h-full lg:w-[35%]" aria-label="Partner gameplay preview">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Partner Gameplay</div>
        <h2 className="mt-2 text-lg font-semibold">Waiting for a partner</h2>
        <p className="mt-2 text-sm text-slate-400">The odd final student is unpaired for this match.</p>
      </aside>
    );
  }

  const status = displayStatus === "completed"
    ? "Completed"
    : displayStatus === "paused"
      ? "Paused"
      : displayStatus === "disconnected"
        ? "Disconnected"
        : displayStatus === "playing" ? "Playing" : "Connecting";

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
});
