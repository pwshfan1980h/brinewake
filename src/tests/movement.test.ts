import { describe, it, expect } from "vitest";
import { createPlayer, movePlayer } from "../sim/movement";
import { neutralInput } from "../sim/types";
import { segmentBox } from "../sim/collision";
const floor = [{ x: 0, y: 0, w: 30, h: 2 }];
describe("movement", () => {
  it("accelerates without instant teleport", () => {
    const p = createPlayer(3, 0.9);
    movePlayer(p, { ...neutralInput(), moveX: 1 }, floor, [], 1 / 60);
    expect(p.x).toBeGreaterThan(3);
    expect(p.x).toBeLessThan(3.1);
  });
  it("jumps and expends fuel only for sustained jet", () => {
    const p = createPlayer(3, 0.9);
    p.grounded = true;
    movePlayer(
      p,
      { ...neutralInput(), jump: true, jumpPressed: true },
      floor,
      [],
      1 / 60,
    );
    expect(p.vy).toBeGreaterThan(8);
    expect(p.fuel).toBe(100);
    for (let i = 0; i < 45; i++)
      movePlayer(p, { ...neutralInput(), jump: true }, floor, [], 1 / 60);
    expect(p.fuel).toBeLessThan(100);
  });
  it("supports coyote jump", () => {
    const p = createPlayer(3, 2);
    p.coyote = 0.08;
    movePlayer(p, { ...neutralInput(), jumpPressed: true }, [], [], 1 / 60);
    expect(p.vy).toBeGreaterThan(8);
  });
  it("buffers jump until landing", () => {
    const p = createPlayer(3, 1);
    p.vy = -3;
    movePlayer(p, { ...neutralInput(), jumpPressed: true }, floor, [], 1 / 60);
    for (let i = 0; i < 6; i++)
      movePlayer(p, neutralInput(), floor, [], 1 / 60);
    expect(p.vy).toBeGreaterThan(0);
  });
  it("does not repeat dash on held button", () => {
    const p = createPlayer(3, 0.9);
    movePlayer(
      p,
      { ...neutralInput(), dashPressed: true, moveX: 1 },
      floor,
      [],
      1 / 60,
    );
    expect(p.dashCd).toBeGreaterThan(0);
    const cd = p.dashCd;
    movePlayer(
      p,
      { ...neutralInput(), dashPressed: true, moveX: 1 },
      floor,
      [],
      1 / 60,
    );
    expect(p.dashCd).toBeLessThan(cd);
  });
  it("lands on one-way surfaces and drops explicitly", () => {
    const f = [{ x: 0, y: 0, w: 30, h: 1, oneWay: true }];
    const p = createPlayer(3, 1);
    p.vy = -5;
    movePlayer(p, neutralInput(), f, [], 0.05);
    expect(p.grounded).toBe(true);
    movePlayer(p, { ...neutralInput(), moveY: -1 }, f, [], 0.05);
    expect(p.y).toBeLessThan(0.9);
  });
  it("sweeps fast rounds through thin cover", () =>
    expect(segmentBox(0, 2, 20, 2, { x: 9, y: 3, w: 0.2, h: 2 })).toBeCloseTo(
      0.45,
    ));
  it("does not collide with distant cover", () =>
    expect(segmentBox(0, 5, 20, 5, { x: 9, y: 3, w: 0.2, h: 2 })).toBeNull());
});
