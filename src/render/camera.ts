import { clamp, type Player, type Boss } from "../sim/types";
export function cameraFrame(
  p: Player,
  length: number,
  aspect: number,
  boss?: Boss,
  arena = false,
) {
  const height = aspect < 1.3 ? 25 : 18;
  if (arena && boss)
    return {
      x: (p.x + boss.x) / 2,
      y: clamp((p.y + boss.y) / 2 + 1, -2, 7),
      height: Math.max(height, 32 / aspect, Math.abs(p.y - boss.y) + 9),
    };
  return {
    x: clamp(p.x + Math.cos(p.aim) * 2.2, 8, length - 6),
    y: clamp(p.y + 2, -2, 6),
    height,
  };
}
