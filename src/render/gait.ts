// Presentation only: signed odometry, not a timer, keeps stance feet planted.
const CYCLE = 1.3;
const STANCE = 0.62;
export function sampleGait(distance: number, leg: number) {
  const phase = (((distance / CYCLE + leg * 0.5) % 1) + 1) % 1;
  const reach = (CYCLE * STANCE) / 2;
  if (phase <= STANCE) return { x: reach - phase * CYCLE, lift: 0, pitch: 0 };
  const t = (phase - STANCE) / (1 - STANCE);
  // Endpoint slope matches stance; toe-off/heel strike have no velocity pop.
  const ease = t * t * (3 - 2 * t);
  const x = -reach - CYCLE * (1 - STANCE) * t + CYCLE * ease;
  return {
    x,
    lift: 0.16 * Math.sin(Math.PI * t) ** 2,
    pitch: 0.18 * Math.sin(2 * Math.PI * t),
  };
}

export function solveLeg(x: number, y: number, bend: number) {
  const upper = 0.4,
    lower = 0.42;
  const length = Math.max(
    0.021,
    Math.min(upper + lower - 0.001, Math.hypot(x, y)),
  );
  const along =
    (upper * upper - lower * lower + length * length) / (2 * length);
  const side = Math.sqrt(Math.max(0, upper * upper - along * along));
  const angle = Math.atan2(y, x);
  return {
    x: Math.cos(angle) * along - Math.sin(angle) * side * bend,
    y: Math.sin(angle) * along + Math.cos(angle) * side * bend,
  };
}
