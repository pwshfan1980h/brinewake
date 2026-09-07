import * as T from "three";
import { box, cylinder, sphere, mats } from "./kit";
import type { Player, Input } from "../sim/types";
import { sampleGait, solveLeg } from "./gait";

// Cut-corner armor, with real bevels catching the scene's rim lighting.
function armor(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: T.Material,
) {
  const c = Math.min(w, h) * 0.18,
    shape = new T.Shape();
  shape.moveTo(-w / 2 + c, -h / 2);
  for (const [px, py] of [
    [w / 2 - c, -h / 2],
    [w / 2, -h / 2 + c],
    [w / 2, h / 2 - c],
    [w / 2 - c, h / 2],
    [-w / 2 + c, h / 2],
    [-w / 2, h / 2 - c],
    [-w / 2, -h / 2 + c],
  ])
    shape.lineTo(px, py);
  shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, {
    depth: d - 0.04,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 1,
    steps: 1,
  });
  geo.translate(0, 0, -d / 2 + 0.02);
  const mesh = new T.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
export class Mech {
  root = new T.Group();
  body = new T.Group();
  yaw = new T.Group();
  shoulder = new T.Group();
  recoil = new T.Group();
  muzzle = new T.Object3D();
  legs: T.Group[] = [];
  feet: T.Mesh[] = [];
  private thighs: T.Group[] = [];
  private shins: T.Group[] = [];
  private knees: T.Mesh[] = [];
  private gaitWeight = 0;
  jets: T.Mesh[] = [];
  podDoors: T.Mesh[] = [];
  arm = new T.Group();
  charge: T.Mesh;
  halo: T.Mesh;
  constructor() {
    this.root.add(this.body);
    this.body.add(this.yaw);
    armor(this.yaw, 0, 0.19, 0, 0.9, 0.69, 0.64, mats.dark);
    armor(this.yaw, 0.02, 0.28, 0.29, 0.84, 0.49, 0.17, mats.cream);
    armor(this.yaw, 0.02, 0.02, 0.36, 0.58, 0.19, 0.12, mats.orange);
    // Low recessed command head, brow armor, and narrow protected optics.
    armor(this.yaw, 0.08, 0.64, 0.05, 0.41, 0.28, 0.43, mats.dark);
    armor(this.yaw, 0.08, 0.76, 0.09, 0.46, 0.09, 0.46, mats.cream);
    box(this.yaw, 0.12, 0.65, 0.28, 0.26, 0.055, 0.04, mats.cyan);
    box(this.yaw, 0.08, 0.33, 0.39, 0.08, 0.21, 0.025, mats.dark);
    // Broad separated pauldrons read as a combat chassis, not one cube.
    for (const side of [-1, 1]) {
      armor(this.yaw, side * 0.53, 0.43, 0, 0.38, 0.32, 0.71, mats.cream);
      armor(this.yaw, side * 0.55, 0.57, 0.02, 0.4, 0.1, 0.73, mats.orange);
      cylinder(this.yaw, side * 0.44, 0.15, 0, 0.105, 0.28, mats.copper, 8);
      armor(this.yaw, side * 0.21, -0.22, 0.12, 0.3, 0.23, 0.45, mats.cream);
      armor(this.yaw, side * 0.25, 0.25, -0.42, 0.28, 0.54, 0.25, mats.steel);
      for (let row = 0; row < 3; row++)
        box(
          this.yaw,
          side * 0.53,
          0.43 - row * 0.065,
          0.365,
          0.23,
          0.025,
          0.02,
          mats.dark,
        );
    }
    cylinder(this.yaw, 0, -0.12, 0, 0.23, 0.16, mats.copper, 8);
    cylinder(this.yaw, -0.43, 0.8, -0.15, 0.018, 0.38, mats.dark, 6);
    sphere(this.yaw, -0.43, 1, -0.15, 0.032, mats.gold);
    for (const s of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(s * 0.2, -0.22, s * 0.23);
      this.root.add(leg);
      const thigh = new T.Group(),
        shin = new T.Group();
      leg.add(thigh, shin);
      const hip = cylinder(leg, 0, 0, 0, 0.14, 0.31, mats.copper, 8);
      hip.rotation.x = Math.PI / 2;
      armor(thigh, 0, -0.18, 0, 0.23, 0.31, 0.27, mats.dark);
      armor(thigh, 0.03, -0.15, 0.1, 0.22, 0.25, 0.14, mats.cream);
      cylinder(thigh, -0.1, -0.2, 0.15, 0.035, 0.3, mats.copper, 6);
      const knee = cylinder(leg, 0, 0, 0, 0.12, 0.34, mats.copper, 8);
      knee.rotation.x = Math.PI / 2;
      armor(shin, 0.01, -0.2, 0, 0.26, 0.32, 0.29, mats.cream);
      armor(shin, 0.02, -0.1, 0.17, 0.23, 0.17, 0.09, mats.orange);
      cylinder(shin, -0.09, -0.27, 0.17, 0.035, 0.22, mats.steel, 6);
      const foot = box(leg, 0, -0.6, 0.04, 0.46, 0.16, 0.4, mats.dark);
      armor(foot, 0.04, 0.06, 0, 0.4, 0.1, 0.36, mats.steel);
      box(foot, 0.1, 0.025, 0.205, 0.24, 0.035, 0.02, mats.orange);
      this.legs.push(leg);
      this.thighs.push(thigh);
      this.shins.push(shin);
      this.knees.push(knee);
      this.feet.push(foot);
      const jet = cylinder(
        this.yaw,
        -0.34,
        -0.55,
        s * 0.26,
        0.12,
        0.55,
        mats.cyan,
      );
      this.jets.push(jet);
      cylinder(this.yaw, -0.35, -0.21, s * 0.26, 0.15, 0.2, mats.steel);
      const door = box(
        this.yaw,
        -0.2,
        0.58,
        s * 0.42,
        0.42,
        0.22,
        0.2,
        mats.orange,
      );
      this.podDoors.push(door);
    }
    this.shoulder.position.set(0, 0.3, 0.44);
    this.root.add(this.shoulder);
    const joint = cylinder(this.shoulder, 0, 0, 0, 0.23, 0.18, mats.copper);
    joint.rotation.x = Math.PI / 2;
    this.shoulder.add(this.recoil);
    box(this.recoil, 0.49, 0, 0, 0.8, 0.24, 0.27, mats.cream);
    box(this.recoil, 0.46, 0.15, 0, 0.61, 0.055, 0.29, mats.orange);
    box(this.shoulder, 0.98, 0, 0, 0.48, 0.105, 0.13, mats.dark);
    box(this.shoulder, 1.24, 0, 0, 0.17, 0.19, 0.2, mats.steel);
    this.muzzle.position.set(1.35, 0, 0);
    this.shoulder.add(this.muzzle);
    for (let x = 0.25; x < 0.8; x += 0.14)
      box(this.recoil, x, -0.135, 0.15, 0.07, 0.045, 0.02, mats.cyan);
    this.charge = new T.Mesh(
      new T.TorusGeometry(0.23, 0.025, 6, 24),
      mats.cyan,
    );
    this.charge.position.set(1.3, 0, 0);
    this.charge.rotation.y = Math.PI / 2;
    this.shoulder.add(this.charge);
    this.arm.position.set(-0.23, 0.15, 0.56);
    this.root.add(this.arm);
    box(this.arm, 0, -0.22, 0, 0.13, 0.5, 0.15, mats.orange);
    sphere(this.arm, 0, -0.48, 0, 0.1, mats.cyan);
    this.halo = new T.Mesh(new T.TorusGeometry(0.9, 0.024, 5, 40), mats.cyan);
    this.root.add(this.halo);
  }
  update(
    p: Player,
    i: Input,
    time: number,
    dt = 1 / 60,
    reduced = false,
    victory = false,
  ) {
    this.root.position.set(p.x, p.y, 0);
    this.root.rotation.z = p.hp <= 0 ? -0.95 : 0;
    this.body.position.x = p.hit > 0 ? -Math.cos(p.aim) * p.hit * 0.18 : 0;
    const walking = p.grounded && Math.abs(p.vx) > 0.12;
    this.gaitWeight +=
      ((walking ? 1 : 0) - this.gaitWeight) * (1 - Math.exp(-22 * dt));
    const compression = p.land * 0.15;
    this.body.position.y = p.grounded
      ? -compression -
        this.gaitWeight *
          (0.018 + 0.024 * Math.cos((p.walk / 1.3) * Math.PI * 4))
      : Math.sin(time * 4) * 0.015;
    this.body.rotation.z = p.grounded
      ? -Math.max(-1, Math.min(1, p.vx / 7)) * 0.035
      : 0;
    this.yaw.rotation.y +=
      ((p.facing < 0 ? Math.PI : 0) - this.yaw.rotation.y) *
      (1 - Math.exp(-18 * dt)); // chassis flips in depth; weapon never mirrors
    this.shoulder.rotation.z = victory ? 0.6 : p.aim;
    this.recoil.position.x = -p.recoil * 0.13;
    this.charge.visible = p.charge > 0 || p.vent > 0;
    this.charge.scale.setScalar(0.7 + p.charge * 0.8);
    this.charge.rotation.x = time * 7;
    for (let n = 0; n < 2; n++) {
      const gait = sampleGait(p.walk, n);
      const leg = this.legs[n];
      leg.position.y = -0.22 + this.body.position.y;
      // Countertranslate the ankle against chassis travel during support.
      // The sole is exactly at the sim's y - 0.9 floor, even on impact.
      let footX = gait.x * this.gaitWeight;
      let footY = -0.82 + gait.lift * this.gaitWeight - leg.position.y;
      let pitch = gait.pitch * this.gaitWeight;
      // Rotate about the sole contact edge, never through the floor.
      footY += Math.abs(Math.sin(pitch)) * 0.23 + (Math.cos(pitch) - 1) * 0.08;
      if (!p.grounded) {
        const swim = p.water === "submerged";
        footX = (n === 0 ? -0.22 : 0.24) * p.facing;
        footY =
          -0.43 + (swim ? Math.sin(time * 3 + n * Math.PI) * 0.1 : n * 0.09);
        pitch = -p.facing * 0.16;
      }
      const knee = solveLeg(footX, footY, p.facing);
      this.thighs[n].rotation.z = Math.atan2(knee.x, -knee.y);
      this.knees[n].position.set(knee.x, knee.y, 0);
      this.shins[n].position.set(knee.x, knee.y, 0);
      this.shins[n].rotation.z = Math.atan2(footX - knee.x, -(footY - knee.y));
      this.feet[n].position.set(footX, footY, 0.04);
      this.feet[n].rotation.z = pitch;
      this.jets[n].visible =
        (i.jump && !p.grounded && p.fuel > 0) || p.dash > 0;
      this.jets[n].scale.y =
        0.5 + Math.sin(time * 50) * 0.2 + (p.dash > 0 ? 1.8 : 0.8);
      this.podDoors[n].rotation.x = p.podAnim * (n === 0 ? 1 : -1) * 1.8;
    }
    this.arm.rotation.z =
      p.repair > 0
        ? Math.sin(time * 18) * 0.8
        : i.interact
          ? -1.4
          : Math.sin(time * 2) * 0.06;
    this.halo.visible = p.repair > 0;
    this.halo.rotation.y = time * 4;
    this.halo.scale.setScalar(1 + Math.sin(time * 8) * 0.07);
    this.root.visible =
      reduced || p.invuln <= 0 || Math.floor(time * 20) % 2 === 0;
  }
}
