import { describe, it, expect } from "vitest";
import { Campaign, parseCheckpoint } from "../sim/campaign";
import { levels } from "../data/levels";
import { neutralInput } from "../sim/types";
import { Tutorial } from "../ui/tutorial";
import { createPlayer } from "../sim/movement";
import { DeviceHandoff } from "../input/InputManager";
describe("campaign", () => {
  it("has exactly three authored levels and one final boss", () => {
    expect(levels).toHaveLength(3);
    expect(levels.filter((l) => l.boss)).toHaveLength(1);
    expect(levels[2].boss).toBeDefined();
    expect(new Set(levels.map((l) => l.name)).size).toBe(3);
  });
  it("every water volume has safe floor or escape shelf", () => {
    for (const l of levels)
      for (const w of l.water)
        expect(
          l.platforms.some(
            (p) =>
              p.x <= w.x + 1 && p.x + p.w >= w.x + w.w - 1 && p.y <= w.surface,
          ) ||
            l.platforms.some((p) => p.oneWay && p.x > w.x && p.x < w.x + w.w),
        ).toBe(true);
  });
  it("does not restore guarded objectives", () => {
    const g = new Campaign();
    g.player.x = 52;
    g.player.y = 0.9;
    for (let n = 0; n < 100; n++)
      g.tick({ ...neutralInput(), interact: true }, 1 / 60);
    expect(g.objectives[0].done).toBe(false);
  });
  it("restores clear relay and checkpoints essentials", () => {
    const g = new Campaign();
    g.enemies.forEach((e) => (e.hp = 0));
    g.player.x = 52;
    g.player.y = 0.9;
    g.player.hp = 40;
    for (let n = 0; n < 90; n++)
      g.tick({ ...neutralInput(), interact: true }, 1 / 60);
    expect(g.objectives[0].done).toBe(true);
    expect(g.player.hp).toBe(100);
    g.player.hp = 0;
    g.restart();
    expect(g.player.x).toBe(52);
    expect(g.player.hp).toBe(100);
    expect(g.objectives[0].done).toBe(true);
  });
  it("cancels interaction progress on release", () => {
    const g = new Campaign();
    g.enemies.forEach((e) => (e.hp = 0));
    g.player.x = 52;
    g.player.y = 0.9;
    g.tick({ ...neutralInput(), interact: true }, 0.1);
    expect(g.objectives[0].progress).toBeGreaterThan(0);
    g.tick(neutralInput(), 0.1);
    expect(g.objectives[0].progress).toBe(0);
  });
  it("advances first two exits and ends only after final boss", () => {
    const g = new Campaign();
    for (let level = 0; level < 2; level++) {
      g.objectives.forEach((o) => (o.done = true));
      g.player.x = g.level.exit.x;
      g.player.y = g.level.exit.y;
      if (level === 1) g.lift = 6.4;
      g.tick(neutralInput(), 1 / 60);
      expect(g.index).toBe(level + 1);
    }
    g.objectives.forEach((o) => (o.done = true));
    g.player.x = 90;
    g.tick(neutralInput(), 1 / 60);
    expect(g.status).toBe("playing");
    g.boss!.hp = 0;
    for (let n = 0; n < 80; n++) g.tick(neutralInput(), 1 / 60);
    expect(g.status).toBe("victory");
    expect(g.index).toBe(2);
  });
  it("rejects corrupted and out-of-range saved data", () => {
    for (const c of [
      "bad",
      "{}",
      '{"version":1,"level":9}',
      '{"version":1,"level":0,"completed":0,"x":9999,"y":0}',
    ])
      expect(parseCheckpoint(c)).toBeUndefined();
    expect(
      parseCheckpoint(JSON.stringify(new Campaign().checkpoint))?.version,
    ).toBe(1);
  });
  it("recovers from the void without resource soft lock", () => {
    const g = new Campaign();
    g.player.y = -30;
    g.tick(neutralInput(), 1 / 60);
    expect(g.player.y).toBe(g.checkpoint.y);
    expect(g.player.hp).toBe(85);
  });
});
describe("tutorial and device handoff", () => {
  it("requires observed actions, not time", () => {
    const t = new Tutorial(),
      p = createPlayer(0, 0);
    for (let n = 0; n < 1000; n++) t.update(p, neutralInput(), false);
    expect(t.step).toBe(0);
    t.update(p, { ...neutralInput(), moveX: 1 }, false);
    expect(t.step).toBe(1);
  });
  it("retains out-of-order action observations", () => {
    const t = new Tutorial(),
      p = createPlayer(0, 3);
    t.update(p, { ...neutralInput(), primary: true }, false);
    t.update(p, { ...neutralInput(), moveX: 1 }, false);
    t.update(p, { ...neutralInput(), jump: true }, false);
    t.update(p, neutralInput(), false);
    expect(t.step).toBe(3);
  });
  it("skip works and replay creates a fresh tutorial", () => {
    const t = new Tutorial();
    t.skip();
    expect(t.done).toBe(true);
    expect(new Tutorial().done).toBe(false);
  });
  it("ignores stick noise and requires handoff hysteresis", () => {
    const d = new DeviceHandoff();
    d.use("gamepad", 1, false);
    expect(d.device).toBe("keyboard");
    d.use("gamepad", 1, true);
    expect(d.device).toBe("gamepad");
    d.use("keyboard", 1.1, true);
    expect(d.device).toBe("gamepad");
    d.use("keyboard", 1.4, true);
    expect(d.device).toBe("keyboard");
  });
});

it("prevents out-of-order relays from changing checkpoint identity", () => {
  const g = new Campaign();
  g.enemies.forEach((e) => (e.hp = 0));
  g.player.x = 83;
  g.player.y = 0.9;
  for (let n = 0; n < 90; n++)
    g.tick({ ...neutralInput(), interact: true }, 1 / 60);
  expect(g.objectives.map((o) => o.done)).toEqual([false, false]);
  expect(g.checkpoint.completed).toBe(0);
  expect(g.message).toContain("previous relay");
});
it("physically carries the mech on the restored floodgate lift", () => {
  const g = new Campaign(1);
  g.enemies.forEach((e) => (e.hp = 0));
  g.objectives.forEach((o) => (o.done = true));
  g.player.x = 101;
  g.player.y = 5.1;
  for (let n = 0; n < 90; n++) g.tick(neutralInput(), 1 / 60);
  expect(g.lift).toBeGreaterThan(2.5);
  expect(g.player.y).toBeGreaterThan(7.5);
  expect(g.index).toBe(1);
  for (let n = 0; n < 120; n++) g.tick(neutralInput(), 1 / 60);
  expect(g.index).toBe(2);
});

it("secures a full-resource checkpoint immediately before the only boss", () => {
  const g = new Campaign(2);
  g.objectives[0].done = true;
  g.player.x = 89;
  g.player.y = 0.9;
  g.player.hp = 37;
  g.tick(neutralInput(), 1 / 60);
  expect(g.boss!.state).toBe("tell");
  expect(g.checkpoint.x).toBe(89);
  expect(g.player.hp).toBe(100);
  g.restart();
  expect(g.player.x).toBe(89);
  expect(g.boss!.hp).toBe(780);
});
