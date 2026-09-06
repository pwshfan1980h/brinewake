export function aimAt(
  x: number,
  y: number,
  tx: number,
  ty: number,
  last: number,
) {
  return Math.hypot(tx - x, ty - y) < 0.12 ? last : Math.atan2(ty - y, tx - x);
}
export function stickAim(x: number, y: number, last: number, deadzone = 0.2) {
  return Math.hypot(x, y) > deadzone ? Math.atan2(-y, x) : last;
}
export function muzzlePose(x: number, y: number, angle: number) {
  return {
    x: x + Math.cos(angle) * 1.35,
    y: y + 0.3 + Math.sin(angle) * 1.35,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
  };
}
