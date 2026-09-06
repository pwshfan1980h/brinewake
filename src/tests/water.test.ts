import { describe, it, expect } from "vitest";
import { waterState, swimVelocity, surgeDirection } from "../sim/water";
const pool = { x: 5, w: 10, surface: 2, bottom: -5, current: 0.3 };
describe("water", () => {
  it("separates dry, wading, surface and submerged", () => {
    expect(waterState(1, 0, "dry", [pool])).toBe("dry");
    expect(waterState(7, 2.5, "dry", [pool])).toBe("wading");
    expect(waterState(7, 1.8, "dry", [pool])).toBe("surface");
    expect(waterState(7, 0, "dry", [pool])).toBe("submerged");
  });
  it("hysteresis prevents flicker at immersion boundary", () => {
    expect(waterState(7, 1.31, "submerged", [pool])).toBe("submerged");
    expect(waterState(7, 1.31, "surface", [pool])).toBe("surface");
  });
  it("can exit water", () =>
    expect(waterState(7, 3.3, "submerged", [pool])).toBe("dry"));
  it("equalizes diagonal swimming", () => {
    const a = swimVelocity(1, 1, 0, 0, 0, 1);
    const b = swimVelocity(1, 0, 0, 0, 0, 1);
    expect(Math.hypot(a.x, a.y)).toBeCloseTo(Math.hypot(b.x, b.y), 1);
  });
  it("limits current and provides escape thrust", () => {
    const v = swimVelocity(0, 1, 0, 0, 99, 1);
    expect(v.x).toBeLessThan(1);
    expect(v.y).toBeGreaterThan(4);
  });
  it("damps inertia without input", () =>
    expect(swimVelocity(0, 0, 8, 0, 0, 0.1).x).toBeLessThan(8));
  it("surges in underwater input direction", () =>
    expect(surgeDirection(0, -1, 1, true)).toEqual({ x: 0, y: -1 }));
  it("uses facing for dry dash with no horizontal input", () =>
    expect(surgeDirection(0, 1, -1, false)).toEqual({ x: -1, y: 0 }));
});

import { createPlayer, movePlayer } from "../sim/movement";
import { neutralInput } from "../sim/types";
it("allows intentional descent through a submerged grated platform", () => {
  const p = createPlayer(7, -0.1);
  p.grounded = true;
  p.water = "submerged";
  const grate = { x: 5, y: -1, w: 6, h: 0.3, oneWay: true };
  for (let n = 0; n < 30; n++)
    movePlayer(p, { ...neutralInput(), moveY: -1 }, [grate], [pool], 1 / 60);
  expect(p.y).toBeLessThan(-1.2);
});
it("wading shelf preserves normal walking speed", () => {
  const p = createPlayer(7, 2.5);
  p.grounded = true;
  for (let n = 0; n < 60; n++)
    movePlayer(
      p,
      { ...neutralInput(), moveX: 1 },
      [{ x: 0, y: 1.6, w: 40, h: 3 }],
      [{ ...pool, w: 30 }],
      1 / 60,
    );
  expect(p.water).toBe("wading");
  expect(p.vx).toBeCloseTo(7.2);
});
