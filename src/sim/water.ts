import { clamp, type Water, type WaterState } from "./types";
export function waterState(
  x: number,
  y: number,
  previous: WaterState,
  volumes: Water[],
): WaterState {
  const w = volumes.find((w) => x >= w.x && x <= w.x + w.w && y > w.bottom - 1);
  if (!w) return "dry";
  const d = w.surface - y;
  if (d < -0.85) return "dry";
  if (d < -0.25) return "wading";
  if (d > (previous === "submerged" ? 0.55 : 0.8)) return "submerged";
  return "surface";
}
export function swimVelocity(
  ix: number,
  iy: number,
  vx: number,
  vy: number,
  current: number,
  dt: number,
) {
  const n = Math.max(1, Math.hypot(ix, iy));
  const k = 1 - Math.exp(-8 * dt);
  return {
    x: vx + ((ix / n) * 5.3 + clamp(current, -0.65, 0.65) - vx) * k,
    y: vy + ((iy / n) * 5.3 + (iy === 0 ? 0.48 : 0) - vy) * k,
  };
}
export function surgeDirection(
  x: number,
  y: number,
  facing: number,
  wet: boolean,
) {
  const n = Math.hypot(x, wet ? y : 0);
  return n > 0.1 ? { x: x / n, y: wet ? y / n : 0 } : { x: facing, y: 0 };
}
