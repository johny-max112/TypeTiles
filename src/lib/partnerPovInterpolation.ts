export function predictNormalizedY(
  y: number,
  speed: number,
  ageMs: number,
  maxPredictionMs = 500,
): number {
  const predictionSeconds = Math.max(0, Math.min(ageMs, maxPredictionMs)) / 1000;
  return Math.max(0, Math.min(1, y + speed * predictionSeconds));
}

export function smoothToward(
  current: number,
  target: number,
  deltaSeconds: number,
  responsiveness = 14,
): number {
  const delta = Math.max(0, Math.min(deltaSeconds, 0.1));
  const amount = 1 - Math.exp(-responsiveness * delta);
  return current + (target - current) * amount;
}
