import { describe, it, expect } from "vitest";
import { aimAt, stickAim, muzzlePose } from "../sim/aim";
describe("independent aim", () => {
  it("tracks behind player", () =>
    expect(aimAt(5, 2, 0, 2, 0)).toBeCloseTo(Math.PI));
  it("clamps zero target", () => expect(aimAt(1, 1, 1, 1, 0.8)).toBe(0.8));
  it("preserves last direction inside radial deadzone", () =>
    expect(stickAim(0.1, 0.1, 1, 0.2)).toBe(1));
  it("aims right-stick directly upwards", () =>
    expect(stickAim(0, -1, 0, 0.2)).toBeCloseTo(Math.PI / 2));
  it.each([0, Math.PI / 2, Math.PI, -1])(
    "muzzle and barrel align at %s",
    (a) => {
      const p = muzzlePose(3, 4, a);
      expect(Math.atan2(p.y - 4.3, p.x - 3)).toBeCloseTo(a);
      expect(p.dx).toBeCloseTo(Math.cos(a));
    },
  );
});

import * as THREE from "three";
import { Mech } from "../render/Mech";
import { createPlayer } from "../sim/movement";
import { neutralInput } from "../sim/types";
it.each([0, 0.7, Math.PI, -2.3, -Math.PI / 2])(
  "actual articulated muzzle agrees with simulation while strafing at %s",
  (angle) => {
    const p = createPlayer(5, 7),
      mech = new Mech();
    p.aim = angle;
    p.facing = -1;
    p.vx = -7;
    p.recoil = 1;
    mech.update(p, { ...neutralInput(), jump: true }, 2);
    mech.root.updateMatrixWorld(true);
    const actual = mech.muzzle.getWorldPosition(new THREE.Vector3()),
      pose = muzzlePose(p.x, p.y, angle);
    expect(actual.x).toBeCloseTo(pose.x);
    expect(actual.y).toBeCloseTo(pose.y);
    const direction = new THREE.Vector3(1, 0, 0).transformDirection(
      mech.shoulder.matrixWorld,
    );
    expect(direction.x).toBeCloseTo(pose.dx);
    expect(direction.y).toBeCloseTo(pose.dy);
  },
);
it.each([16 / 9, 4 / 3, 9 / 16])(
  "ray/plane aim round-trips at aspect %s",
  (aspect) => {
    const camera = new THREE.OrthographicCamera(
      -9 * aspect,
      9 * aspect,
      9,
      -9,
      0.1,
      180,
    );
    camera.position.set(10, 7, 28);
    camera.lookAt(10, 3, 0);
    camera.updateMatrixWorld();
    const point = new THREE.Vector3(12, 4, 0.44),
      ndc = point.clone().project(camera),
      ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.44),
      hit,
    );
    expect(hit.distanceTo(point)).toBeLessThan(0.0001);
  },
);

import { cameraFrame } from "../render/camera";
import { createBoss } from "../sim/boss";
it.each([16 / 9, 4 / 3, 9 / 16])(
  "arena framing includes both combatants even when aiming away at %s",
  (aspect) => {
    const p = createPlayer(88, 1),
      boss = createBoss(103, 4);
    p.aim = Math.PI;
    const f = cameraFrame(p, 116, aspect, boss, true);
    const half = (f.height * aspect) / 2;
    expect(f.x - half).toBeLessThan(p.x - 1);
    expect(f.x + half).toBeGreaterThan(boss.x + 4);
  },
);
