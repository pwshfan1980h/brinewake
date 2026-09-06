import type { Platform } from "./types";
// Segment/slab intersection returns earliest normalized impact, including start-inside.
export function segmentBox(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  b: Platform,
): number | null {
  let enter = 0,
    exit = 1;
  for (const [a, d, lo, hi] of [
    [ax, bx - ax, b.x, b.x + b.w],
    [ay, by - ay, b.y - b.h, b.y],
  ]) {
    if (Math.abs(d) < 1e-8) {
      if (a < lo || a > hi) return null;
    } else {
      const t0 = (lo - a) / d,
        t1 = (hi - a) / d;
      enter = Math.max(enter, Math.min(t0, t1));
      exit = Math.min(exit, Math.max(t0, t1));
      if (enter > exit) return null;
    }
  }
  return enter;
}
export function segmentCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  x: number,
  y: number,
  r: number,
): number | null {
  const dx = bx - ax,
    dy = by - ay,
    l = dx * dx + dy * dy;
  if (l < 1e-10) return Math.hypot(ax - x, ay - y) < r ? 0 : null;
  const fx = ax - x,
    fy = ay - y,
    c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  const b = 2 * (fx * dx + fy * dy),
    disc = b * b - 4 * l * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * l);
  return t >= 0 && t <= 1 ? t : null;
}
