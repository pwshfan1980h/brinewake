import type { Enemy, EnemyKind, Player, Projectile, GameEvent } from "./types";
import { projectile } from "./combat";
export const enemyHealth: Record<EnemyKind, number> = {
  skitter: 46,
  sentry: 70,
  dart: 42,
  breaker: 125,
  buoy: 80,
};
export function createEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  id: number,
): Enemy {
  return {
    id,
    kind,
    x,
    y,
    homeX: x,
    homeY: y,
    hp: enemyHealth[kind],
    maxHp: enemyHealth[kind],
    time: id * 0.7,
    cooldown: 1 + id * 0.13,
    tell: 0,
    attack: 0,
    hit: 0,
    dead: 0,
    aim: Math.PI,
  };
}
export function updateEnemies(
  enemies: Enemy[],
  p: Player,
  shots: Projectile[],
  events: GameEvent[],
  dt: number,
) {
  for (const e of enemies) {
    e.time += dt;
    e.attack = Math.max(0, e.attack - dt);
    e.hit = Math.max(0, e.hit - dt);
    if (e.hp <= 0) {
      e.dead += dt;
      continue;
    }
    const dist = Math.hypot(e.x - p.x, e.y - p.y);
    e.aim = Math.atan2(p.y - e.y, p.x - e.x);
    if (e.kind === "skitter") e.x = e.homeX + Math.sin(e.time * 1.2) * 1.7;
    if (e.kind === "dart") {
      e.x = e.homeX + Math.sin(e.time * 0.8) * 2;
      e.y = e.homeY + Math.sin(e.time * 1.5) * 0.9;
    }
    if (e.kind === "buoy") e.y = e.homeY + Math.sin(e.time * 1.1) * 0.3;
    if (dist > 17 || p.hp <= 0) {
      e.tell = 0;
      continue;
    }
    e.cooldown -= dt;
    if (e.cooldown <= 0 && e.tell <= 0) {
      e.tell = 0.8;
      events.push({ type: "lock", x: e.x, y: e.y });
    }
    if (e.tell > 0) {
      e.tell -= dt;
      if (e.tell <= 0) {
        const count = e.kind === "buoy" ? 3 : 1;
        for (let n = 0; n < count; n++)
          shots.push(
            projectile(
              e.x + Math.cos(e.aim) * 0.9,
              e.y + Math.sin(e.aim) * 0.9,
              e.aim + (n - (count - 1) / 2) * 0.18,
              e.kind === "dart" ? 10 : 8,
              e.kind === "breaker" ? 15 : 10,
              false,
              "hostile",
            ),
          );
        e.attack = 0.2;
        e.cooldown = e.kind === "skitter" ? 2.2 : 2.8;
        events.push({ type: "enemyFire", x: e.x, y: e.y });
      }
    }
  }
}
