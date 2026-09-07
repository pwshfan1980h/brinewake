import { describe, expect, it } from "vitest";
import { sampleGait, solveLeg } from "../render/gait";
import { Mech } from "../render/Mech";
import { createPlayer } from "../sim/movement";
import { neutralInput } from "../sim/types";
import * as T from "three";

describe("mechanical ground contact", () => {
  it("plants actual rendered ankles in world space during steady movement", () => {
    const m = new Mech(),
      p = createPlayer(0, 0.9);
    p.grounded = true;
    p.vx = 4;
    p.walk = 0.2;
    m.update(p, neutralInput(), 0, 1);
    const before = m.feet[0].getWorldPosition(new T.Vector3());
    p.x += 0.02;
    p.walk += 0.02;
    m.update(p, neutralInput(), 0.005, 0.005);
    const after = m.feet[0].getWorldPosition(new T.Vector3());
    expect(after.distanceTo(before)).toBeLessThan(1e-6);
  });
  it("keeps rotated sole corners above the floor across a complete stride", () => {
    const m = new Mech(),
      p = createPlayer(0, 0.9);
    p.grounded = true;
    p.vx = 4;
    for (let d = 0; d < 1.3; d += 0.01) {
      p.walk = d;
      m.update(p, neutralInput(), d, 1);
      for (const foot of m.feet) {
        foot.updateWorldMatrix(true, false);
        for (const x of [-0.23, 0.23]) {
          const corner = foot.localToWorld(new T.Vector3(x, -0.08, 0));
          expect(corner.y).toBeGreaterThanOrEqual(-1e-7);
        }
      }
    }
  });
  it("cancels root travel exactly during stance in either direction", () => {
    for (const dx of [-0.01, 0.01]) {
      const a = sampleGait(0.2, 0),
        b = sampleGait(0.2 + dx, 0);
      expect(a.lift).toBe(0);
      expect(b.lift).toBe(0);
      expect(b.x + dx).toBeCloseTo(a.x, 10);
    }
  });
  it("always has a supporting foot and clears the ground during swing", () => {
    let lift = 0;
    for (let d = -3; d < 3; d += 0.007) {
      const a = sampleGait(d, 0),
        b = sampleGait(d, 1);
      expect(Math.min(a.lift, b.lift)).toBe(0);
      expect(a.lift).toBeGreaterThanOrEqual(0);
      lift = Math.max(lift, a.lift);
    }
    expect(lift).toBeGreaterThan(0.12);
  });
  it("solves rigid upper and lower links without stretching", () => {
    for (const x of [-0.4, 0, 0.4]) {
      const k = solveLeg(x, -0.59, 1);
      expect(Math.hypot(k.x, k.y)).toBeCloseTo(0.4);
      expect(Math.hypot(x - k.x, -0.59 - k.y)).toBeCloseTo(0.42);
    }
  });
  it("keeps soles on the collision floor while landing compresses the hips", () => {
    const m = new Mech(),
      p = createPlayer(3, 0.9);
    p.grounded = true;
    p.land = 0.9;
    m.update(p, neutralInput(), 1);
    m.root.updateMatrixWorld(true);
    for (const foot of m.feet) {
      const pos = foot.getWorldPosition(new T.Vector3());
      expect(pos.y - 0.08).toBeCloseTo(0);
      expect(foot.getWorldQuaternion(new T.Quaternion()).z).toBeCloseTo(0);
    }
    expect(m.body.position.y).toBeLessThan(-0.1);
  });
});
