import { describe, it, expect } from "vitest";
import { createPlayer } from "../sim/movement";
import {
  weapons,
  projectile,
  updateProjectiles,
  damagePlayer,
} from "../sim/combat";
import { createEnemy, updateEnemies } from "../sim/enemies";
import { createBoss, updateBoss } from "../sim/boss";
import { neutralInput, type GameEvent, type Projectile } from "../sim/types";
describe("combat", () => {
  it("limits sustained fire with heat and cooldown", () => {
    const p = createPlayer(0, 0),
      s: Projectile[] = [],
      e: GameEvent[] = [];
    for (let n = 0; n < 120; n++)
      weapons(p, { ...neutralInput(), primary: true }, s, e, [], 1 / 60);
    expect(s.length).toBeLessThan(18);
    expect(s.length).toBeGreaterThan(9);
    expect(p.heat).toBeLessThanOrEqual(100);
  });
  it("fires a stronger lance on release after charging", () => {
    const p = createPlayer(0, 0),
      s: Projectile[] = [];
    weapons(p, { ...neutralInput(), secondary: true }, s, [], [], 1);
    expect(s.length).toBe(0);
    weapons(p, neutralInput(), s, [], [], 0.01);
    expect(s[0].damage).toBe(68);
  });
  it("does not fire through cover intersecting barrel", () => {
    const p = createPlayer(0, 1),
      s: Projectile[] = [];
    weapons(
      p,
      { ...neutralInput(), primary: true },
      s,
      [],
      [{ x: 0.6, y: 3, w: 0.2, h: 4 }],
      0.01,
    );
    expect(s).toHaveLength(0);
  });
  it("sweeps and damages once", () => {
    const p = createPlayer(0, 1),
      enemy = createEnemy("sentry", 5, 1, 0),
      s = [projectile(1, 1, 0, 100, 20, true, "rivet")];
    updateProjectiles(s, p, [enemy], undefined, [], [], 0.1);
    expect(enemy.hp).toBe(50);
    expect(s).toHaveLength(0);
  });
  it("cover wins before enemy", () => {
    const p = createPlayer(0, 1),
      e = createEnemy("sentry", 5, 1, 0),
      s = [projectile(1, 1, 0, 100, 20, true, "rivet")];
    updateProjectiles(
      s,
      p,
      [e],
      undefined,
      [{ x: 3, y: 3, w: 0.1, h: 4 }],
      [],
      0.1,
    );
    expect(e.hp).toBe(70);
  });
  it("repair completes and damage interrupts it", () => {
    const p = createPlayer(0, 1);
    p.hp = 30;
    weapons(p, { ...neutralInput(), repairPressed: true }, [], [], [], 0.01);
    damagePlayer(p, 10, []);
    expect(p.repair).toBe(0);
    p.invuln = 0;
    p.repairCd = 0;
    weapons(p, { ...neutralInput(), repairPressed: true }, [], [], [], 0.01);
    weapons(p, neutralInput(), [], [], [], 2);
    expect(p.hp).toBe(62);
  });
  it("caps HP and repairs can run at full health for training", () => {
    const p = createPlayer(0, 0);
    weapons(p, { ...neutralInput(), repairPressed: true }, [], [], [], 2);
    expect(p.hp).toBe(100);
  });
  it("guided pods turn toward targets underwater without an oxygen or weapon penalty", () => {
    const s = [projectile(0, 0, 0, 14, 20, true, "pod")],
      p = createPlayer(0, 0);
    p.water = "submerged";
    updateProjectiles(
      s,
      p,
      [createEnemy("dart", 5, 5, 0)],
      undefined,
      [],
      [],
      0.1,
    );
    expect(s[0].vy).toBeGreaterThan(0);
  });
  it("enemy tells precede a shot and distant enemies do not attack", () => {
    const p = createPlayer(0, 1),
      e = createEnemy("sentry", 5, 1, 0),
      s: Projectile[] = [];
    e.cooldown = 0;
    updateEnemies([e], p, s, [], 0.1);
    expect(e.tell).toBeGreaterThan(0);
    expect(s).toHaveLength(0);
    for (let n = 0; n < 9; n++) updateEnemies([e], p, s, [], 0.1);
    expect(s.length).toBe(1);
    e.x = 100;
    e.cooldown = 0;
    updateEnemies([e], p, s, [], 1);
    expect(s.length).toBe(1);
  });
  it("death is terminal until campaign restarts", () => {
    const p = createPlayer(0, 0);
    damagePlayer(p, 100, []);
    expect(p.hp).toBe(0);
    damagePlayer(p, 30, []);
    expect(p.hp).toBe(0);
  });
});
describe("Tideminder", () => {
  it("requires restored circuit and arena entry", () => {
    const b = createBoss(103, 4),
      p = createPlayer(90, 1);
    updateBoss(b, p, [], [], 0.1, false);
    expect(b.state).toBe("dormant");
    updateBoss(b, p, [], [], 0.1, true);
    expect(b.state).toBe("tell");
  });
  it("has telegraph, execution and vulnerable recovery in every phase", () => {
    for (const hp of [780, 450, 200]) {
      const b = createBoss(103, 4),
        p = createPlayer(90, 1);
      b.hp = hp;
      updateBoss(b, p, [], [], 0.01, true);
      expect(b.state).toBe("tell");
      const s: Projectile[] = [];
      updateBoss(b, p, s, [], 2.5, true);
      expect(b.state).toBe("attack");
      expect(s.length).toBeGreaterThan(0);
      updateBoss(b, p, s, [], 1.6, true);
      expect(b.state).toBe("open");
    }
  });
  it("braced core reduces damage; exposed core takes full damage", () => {
    const p = createPlayer(80, 4),
      b = createBoss(103, 4);
    b.state = "tell";
    updateProjectiles(
      [projectile(99, 4, 0, 100, 100, true, "arc")],
      p,
      [],
      b,
      [],
      [],
      0.1,
    );
    expect(b.hp).toBe(768);
    b.state = "open";
    updateProjectiles(
      [projectile(99, 4, 0, 100, 100, true, "arc")],
      p,
      [],
      b,
      [],
      [],
      0.1,
    );
    expect(b.hp).toBe(668);
  });
});

it("boss volley follows its locked tell even if the player dodges", () => {
  const b = createBoss(103, 4),
    p = createPlayer(90, 1),
    s: Projectile[] = [];
  updateBoss(b, p, s, [], 0.01, true);
  p.x = 95;
  p.y = 7;
  updateBoss(b, p, s, [], 2.5, true);
  const center = s[2];
  expect(Math.atan2(center.vy, center.vx)).toBeCloseTo(
    Math.atan2(1 - 4, 90 - 101),
  );
});

it("latches a boss attack type throughout its complete warning", () => {
  const b = createBoss(103, 4),
    p = createPlayer(90, 1),
    s: Projectile[] = [];
  updateBoss(b, p, s, [], 0.01, true);
  b.hp = 510;
  updateBoss(b, p, s, [], 2.5, true);
  expect(b.phase).toBe(0);
  expect(s).toHaveLength(5);
  updateBoss(b, p, s, [], 1.6, true);
  updateBoss(b, p, s, [], 4.1, true);
  expect(b.phase).toBe(1);
  expect(b.state).toBe("tell");
  expect(b.clock).toBe(2);
});
