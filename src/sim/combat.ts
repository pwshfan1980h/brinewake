import { muzzlePose } from "./aim";
import { segmentBox, segmentCircle } from "./collision";
import type {
  Player,
  Input,
  Projectile,
  Enemy,
  Platform,
  GameEvent,
  Boss,
} from "./types";
let nextId = 1;
export function projectile(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  friendly: boolean,
  kind: Projectile["kind"],
): Projectile {
  return {
    id: nextId++,
    x,
    y,
    px: x,
    py: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    life: kind === "pod" ? 4 : 2.4,
    friendly,
    kind,
    radius: kind === "arc" ? 0.22 : 0.12,
  };
}
export function damagePlayer(p: Player, damage: number, events: GameEvent[]) {
  if (p.invuln > 0 || p.hp <= 0) return;
  p.hp = Math.max(0, p.hp - damage);
  p.invuln = 0.5;
  p.hit = 0.3;
  events.push({ type: p.hp <= 0 ? "defeat" : "hit", x: p.x, y: p.y });
  if (p.repair > 0) {
    p.repair = 0;
    events.push({ type: "repairInterrupted", x: p.x, y: p.y });
  }
}
export function weapons(
  p: Player,
  i: Input,
  shots: Projectile[],
  events: GameEvent[],
  cover: Platform[],
  dt: number,
) {
  for (const key of [
    "fireCd",
    "podCd",
    "repairCd",
    "invuln",
    "hit",
    "podAnim",
    "vent",
  ] as const)
    p[key] = Math.max(0, p[key] - dt);
  p.recoil = Math.max(0, p.recoil - dt * 8);
  p.heat = Math.max(0, p.heat - dt * (i.primary ? 12 : 33));
  const m = muzzlePose(p.x, p.y, p.aim);
  const fire = (
    kind: Projectile["kind"],
    damage: number,
    speed: number,
    offset = 0,
  ) => {
    // Trace from shoulder to socket first: a barrel intersecting cover cannot shoot through it.
    let t = 1;
    for (const b of cover) {
      if (b.oneWay) continue;
      const hit = segmentBox(p.x, p.y + 0.3, m.x, m.y, b);
      if (hit !== null) t = Math.min(t, hit);
    }
    if (t < 1) {
      events.push({
        type: "spark",
        x: p.x + (m.x - p.x) * t,
        y: p.y + 0.3 + (m.y - p.y - 0.3) * t,
      });
      return;
    }
    shots.push(projectile(m.x, m.y, p.aim + offset, speed, damage, true, kind));
    p.recoil = 1;
    events.push({ type: kind, x: m.x, y: m.y });
  };
  if (i.primary && p.fireCd <= 0 && p.heat < 88) {
    fire("rivet", 9, 34);
    p.fireCd = 0.105;
    p.heat = Math.min(100, p.heat + 9);
  }
  if (i.secondary) {
    p.charge = Math.min(1.3, p.charge + dt);
  } else if (p.charge > 0) {
    fire("arc", 20 + p.charge * 48, 55);
    p.vent = 0.6;
    p.charge = 0;
  }
  if (i.missilePressed && p.podCd <= 0) {
    fire("pod", 34, 14, -0.1);
    fire("pod", 34, 14, 0.1);
    p.podCd = 4;
    p.podAnim = 0.7;
  }
  if (i.repairPressed && p.repairCd <= 0 && p.hp > 0) {
    p.repair = 1.5;
    p.repairCd = 7;
    events.push({ type: "repair", x: p.x, y: p.y });
  }
  if (p.repair > 0) {
    p.repair -= dt;
    if (p.repair <= 0) {
      p.hp = Math.min(100, p.hp + 42);
      events.push({ type: "repaired", x: p.x, y: p.y });
    }
  }
}
export function updateProjectiles(
  shots: Projectile[],
  p: Player,
  enemies: Enemy[],
  boss: Boss | undefined,
  cover: Platform[],
  events: GameEvent[],
  dt: number,
) {
  for (const s of shots) {
    s.life -= dt;
    s.px = s.x;
    s.py = s.y;
    if (s.kind === "pod") {
      let tx: number | undefined,
        ty = 0,
        d = 22;
      for (const e of enemies) {
        const dist = Math.hypot(e.x - s.x, e.y - s.y);
        if (e.hp > 0 && dist < d) {
          d = dist;
          tx = e.x;
          ty = e.y;
        }
      }
      if (
        tx === undefined &&
        boss &&
        boss.state !== "dormant" &&
        boss.hp > 0 &&
        Math.hypot(boss.x - s.x, boss.y - s.y) < 23
      ) {
        tx = boss.x;
        ty = boss.y;
      }
      if (tx !== undefined) {
        const a = Math.atan2(ty - s.y, tx - s.x);
        s.vx += (Math.cos(a) * 17 - s.vx) * Math.min(1, dt * 5);
        s.vy += (Math.sin(a) * 17 - s.vy) * Math.min(1, dt * 5);
      }
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    let earliest = 1.01;
    let target: Enemy | Boss | Player | undefined;
    for (const b of cover) {
      if (b.oneWay) continue;
      const t = segmentBox(s.px, s.py, s.x, s.y, b);
      if (t !== null && t < earliest) {
        earliest = t;
        target = undefined;
      }
    }
    if (s.friendly) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const t = segmentCircle(
          s.px,
          s.py,
          s.x,
          s.y,
          e.x,
          e.y,
          e.kind === "breaker" ? 1 : 0.72,
        );
        if (t !== null && t < earliest) {
          earliest = t;
          target = e;
        }
      }
      if (boss && boss.hp > 0 && boss.state !== "dormant") {
        const t = segmentCircle(s.px, s.py, s.x, s.y, boss.x, boss.y, 2.4);
        if (t !== null && t < earliest) {
          earliest = t;
          target = boss;
        }
      }
    } else {
      const t = segmentCircle(s.px, s.py, s.x, s.y, p.x, p.y, 0.65);
      if (t !== null && t < earliest) {
        earliest = t;
        target = p;
      }
    }
    if (earliest <= 1) {
      s.x = s.px + (s.x - s.px) * earliest;
      s.y = s.py + (s.y - s.py) * earliest;
      s.life = 0;
      if (target === p) damagePlayer(p, s.damage, events);
      else if (target) {
        const e = target as Enemy;
        let scale = 1;
        if (target === boss) scale = boss.state === "open" ? 1 : 0.12;
        else if (
          e.kind === "breaker" &&
          Math.cos(e.aim) * s.vx < 0 &&
          s.kind === "rivet"
        )
          scale = 0.28;
        target.hp = Math.max(0, target.hp - s.damage * scale);
        target.hit = 0.2;
        if (target.hp <= 0)
          events.push({
            type: target === boss ? "bossDefeat" : "explosion",
            x: target.x,
            y: target.y,
          });
      }
      events.push({
        type: s.kind === "pod" ? "explosion" : "spark",
        x: s.x,
        y: s.y,
      });
    }
  }
  for (let n = shots.length - 1; n >= 0; n--)
    if (shots[n].life <= 0) shots.splice(n, 1);
}
