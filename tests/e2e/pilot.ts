// A playtest driver only: decisions become ordinary keyboard/mouse inputs.
// No production code imports this file, and it never mutates game state.
export const routes = [
  [
    { x: 12, y: 1 },
    { x: 30, y: -3 },
    { x: 40, y: 1 },
    { x: 52, y: 0.9, relay: 0 },
    { x: 68, y: 2 },
    { x: 83, y: 0.9, relay: 1 },
    { x: 90, y: 1 },
  ],
  [
    { x: 12, y: 1 },
    { x: 31, y: -5.8, relay: 0 },
    { x: 43, y: 3.4 },
    { x: 54, y: 4.1 },
    { x: 70, y: 5 },
    { x: 91, y: 5.1, relay: 1 },
    { x: 101, y: 5.2 },
  ],
  [
    { x: 12, y: 1 },
    { x: 28, y: -3 },
    { x: 40, y: 2 },
    { x: 58, y: 0.9, relay: 0 },
    { x: 71, y: 3 },
    { x: 90, y: 1 },
  ],
];
export class Pilot {
  stage = 0;
  level = -1;
  lastJump = false;
  lastDash = false;
  elapsed = 0;
  bossSeen = new Set<number>();
  decide(s: any, dt: number) {
    this.elapsed += dt;
    if (s.level !== this.level) {
      this.level = s.level;
      this.stage = 0;
    }
    const p = s.player;
    let route = routes[s.level],
      w = route[Math.min(this.stage, route.length - 1)];
    let dx = w.x - p.x,
      dy = w.y - p.y;
    if (
      Math.abs(dx) < 1.2 &&
      Math.abs(dy) < 1.7 &&
      (!("relay" in w) || s.objectives[w.relay!].done)
    ) {
      this.stage = Math.min(route.length - 1, this.stage + 1);
      w = route[this.stage];
      dx = w.x - p.x;
      dy = w.y - p.y;
    }
    const enemies = s.enemies
      .filter((e: any) => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 15)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      );
    const e = enemies[0];
    const boss =
      s.boss && s.boss.state !== "dormant" && s.boss.hp > 0
        ? s.boss
        : undefined;
    let x = Math.abs(dx) > 0.6 ? Math.sign(dx) : 0,
      y = 0,
      jump = false;
    const wet = ["submerged", "surface"].includes(p.water);
    if (wet) y = Math.abs(dy) > 0.35 ? Math.sign(dy) : 0;
    else {
      if (dy < -1.8) y = -1;
      jump =
        (dy > 1.6 ||
          (((p.x > 17 && p.x < 43) || (p.x > 63 && p.x < 82)) && dy > -0.8)) &&
        !(s.level === 1 && this.stage === 1);
    }
    if (e) {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist < 12 && Math.abs(e.y - p.y) < 4)
        x = dist < 4 ? -Math.sign(e.x - p.x) : 0;
      if (Math.abs(e.y - p.y) > 4) {
        jump = e.y > p.y;
        if (wet) y = Math.sign(e.y - p.y);
      }
    }
    if (boss) {
      this.bossSeen.add(boss.phase);
      x = p.x < 89 ? 1 : p.x > 93 ? -1 : 0;
      jump = boss.state === "tell" && boss.phase !== 1;
      if (boss.phase === 1 && boss.state === "tell") {
        x =
          Math.abs(p.x - boss.sectors[0]) < 2 ||
          Math.abs(p.x - boss.sectors[1]) < 2
            ? 1
            : 0;
      }
    }
    if (!wet && Math.abs(dx) > 1 && Math.abs(p.vx) < 0.1) jump = true;
    if (jump && p.grounded && this.lastJump) jump = false;
    if (s.level === 1 && this.stage === 6) {
      jump = false;
      y = 0;
    }
    const target = e || boss || { x: p.x + 7, y: p.y + 0.3 };
    const aim = Math.atan2(target.y - p.y - 0.3, target.x - p.x);
    const training = this.level === 0 && this.elapsed < 3;
    const dash = training && this.elapsed > 2 && this.elapsed < 2.15;
    const result = {
      moveX: x,
      moveY: y,
      jump,
      jumpPressed: jump && !this.lastJump,
      dashPressed: dash && !this.lastDash,
      primary:
        !!(e || boss) ||
        (training && this.elapsed > 0.15 && this.elapsed < 0.55),
      secondary:
        (!!(e || boss) && this.elapsed % 1.7 < 1.1) ||
        (training && this.elapsed > 0.55 && this.elapsed < 1),
      missilePressed:
        (!!(e || boss) ||
          (training && this.elapsed > 1.2 && this.elapsed < 1.4)) &&
        p.podCd <= 0,
      repairPressed:
        (p.hp < 78 || (training && this.elapsed > 1.5 && this.elapsed < 1.7)) &&
        p.repairCd <= 0,
      interact: Math.hypot(p.x - w.x, p.y - w.y) < 2.5 && "relay" in w,
      aim,
    };
    this.lastJump = jump;
    this.lastDash = dash;
    return result;
  }
}
