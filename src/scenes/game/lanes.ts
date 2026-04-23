import Phaser from "phaser";

export type Lane = "left" | "center" | "right";

const LANES: Lane[] = ["left", "center", "right"];

export function pickLaneNotSame(lastLane: Lane): Lane {
  const choices = LANES.filter((lane) => lane !== lastLane);
  return Phaser.Utils.Array.GetRandom(choices);
}

export function getLaneX(width: number, lane: Lane): number {
  const left = Math.max(170, width * 0.25);
  const center = width * 0.5;
  const right = Math.min(width - 170, width * 0.75);
  return lane === "left" ? left : lane === "right" ? right : center;
}
