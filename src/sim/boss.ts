import { projectile, damagePlayer } from "./combat";
import type { Boss, Player, Projectile, GameEvent } from "./types";
export const createBoss = (x: number, y: number): Boss => ({
  x,
  y,
  hp: 780,
  maxHp: 780,
  time: 0,
  phase: 0,
  state: "dormant",
  clock: 0,
  targetX: 0,
  targetY: 0,
  sectors: [],
  hit: 0,
  entered: false,
});
export function updateBoss(
  b: Boss,
  p: Player,
  shots: Projectile[],
  events: GameEvent[],
  dt: number,
  unlocked: boolean,
) {
  b.time += dt;
  b.hit = Math.max(0, b.hit - dt);
  if (b.hp <= 0) {
    b.state = "dead";
    return;
  }
  if (b.state === "dormant") {
    if (p.x > 88 && unlocked) {
      b.phase = b.hp > b.maxHp * 0.67 ? 0 : b.hp > b.maxHp * 0.34 ? 1 : 2;
      b.state = "tell";
      b.clock = 2.4;
      b.entered = true;
      b.targetX = p.x;
      b.targetY = p.y;
      b.sectors = [p.x - 4, p.x + 4];
      events.push({ type: "bossEnter", x: b.x, y: b.y });
    }
    return;
  }
  if (p.hp <= 0 || Math.abs(p.x - b.x) > 17) return;
  b.clock -= dt;
  if (b.state === "tell" && b.clock <= 0) {
    b.state = "attack";
    b.clock = 1.5;
    if (b.phase === 1) {
      for (const x of b.sectors)
        for (let n = -1; n <= 1; n++)
          shots.push(
            projectile(x + n * 0.7, 13, -Math.PI / 2, 9, 18, false, "hostile"),
          );
    } else {
      const a = Math.atan2(b.targetY - b.y, b.targetX - (b.x - 2));
      for (let n = -2; n <= 2; n++)
        shots.push(
          projectile(
            b.x - 2,
            b.y,
            a + n * 0.17,
            9 + b.phase * 2,
            14,
            false,
            "hostile",
          ),
        );
    }
    events.push({ type: "bossAttack", x: b.x, y: b.y });
  } else if (b.state === "attack" && b.clock <= 0) {
    b.state = "open";
    b.clock = b.phase === 2 ? 3.5 : 4;
    events.push({ type: "coreOpen", x: b.x, y: b.y });
  } else if (b.state === "open" && b.clock <= 0) {
    b.phase = b.hp > b.maxHp * 0.67 ? 0 : b.hp > b.maxHp * 0.34 ? 1 : 2;
    b.state = "tell";
    b.clock = 2;
    b.targetX = p.x;
    b.targetY = p.y;
    b.sectors = [p.x - 3, p.x + 3];
  }
  // Contact only at the colossus, never an invisible global hazard.
  if (Math.hypot(p.x - b.x, p.y - b.y) < 2) damagePlayer(p, 10, events);
}
