import * as T from "three";
import { box, cylinder, sphere, mats } from "./kit";
import type { Player, Input } from "../sim/types";
export class Mech {
  root = new T.Group();
  body = new T.Group();
  yaw = new T.Group();
  shoulder = new T.Group();
  recoil = new T.Group();
  muzzle = new T.Object3D();
  legs: T.Group[] = [];
  feet: T.Mesh[] = [];
  jets: T.Mesh[] = [];
  podDoors: T.Mesh[] = [];
  arm = new T.Group();
  charge: T.Mesh;
  halo: T.Mesh;
  constructor() {
    this.root.add(this.body);
    this.body.add(this.yaw);
    box(this.yaw, 0, 0.12, 0, 0.82, 0.9, 0.62, mats.cream);
    box(this.yaw, 0, 0.57, 0.08, 0.72, 0.16, 0.63, mats.orange);
    box(this.yaw, 0.13, 0.34, 0.34, 0.48, 0.18, 0.05, mats.cyan);
    box(this.yaw, -0.4, 0.14, 0, 0.22, 0.75, 0.55, mats.dark);
    box(this.yaw, -0.06, -0.22, 0.34, 0.38, 0.23, 0.07, mats.orange);
    // rescue cross, antenna and pistonwork
    box(this.yaw, -0.08, -0.2, 0.39, 0.22, 0.055, 0.03, mats.cream);
    box(this.yaw, -0.08, -0.2, 0.4, 0.055, 0.2, 0.03, mats.cream);
    cylinder(this.yaw, -0.31, 0.91, 0, 0.025, 0.55, mats.dark);
    sphere(this.yaw, -0.31, 1.19, 0, 0.05, mats.gold);
    for (const s of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(s * 0.25, -0.33, s < 0 ? -0.13 : 0.18);
      this.root.add(leg);
      box(leg, 0, -0.12, 0, 0.22, 0.38, 0.25, mats.dark);
      const knee = sphere(leg, 0.06, -0.27, 0, 0.15, mats.copper);
      box(leg, 0.02, -0.39, 0, 0.23, 0.29, 0.25, mats.cream);
      const foot = box(leg, 0.12, -0.54, 0.06, 0.46, 0.16, 0.38, mats.dark);
      box(leg, 0.16, -0.51, 0.27, 0.24, 0.05, 0.03, mats.orange);
      this.legs.push(leg);
      this.feet.push(foot);
      void knee;
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
    this.body.position.y =
      (p.grounded ? Math.sin(p.walk * 3) * 0.035 : Math.sin(time * 4) * 0.025) -
      p.land * 0.15;
    this.yaw.rotation.y +=
      ((p.facing < 0 ? Math.PI : 0) - this.yaw.rotation.y) *
      (1 - Math.exp(-18 * dt)); // chassis flips in depth; weapon never mirrors
    this.shoulder.rotation.z = victory ? 0.6 : p.aim;
    this.recoil.position.x = -p.recoil * 0.13;
    this.charge.visible = p.charge > 0 || p.vent > 0;
    this.charge.scale.setScalar(0.7 + p.charge * 0.8);
    this.charge.rotation.x = time * 7;
    for (let n = 0; n < 2; n++) {
      this.legs[n].rotation.z +=
        ((p.water === "submerged"
          ? Math.sin(time * 3 + n * Math.PI) * 0.22
          : p.grounded
            ? Math.sin(p.walk * 3.1 + n * Math.PI) *
              Math.min(0.7, Math.abs(p.vx) * 0.09)
            : -0.3 * (n === 0 ? 1 : -1)) -
          this.legs[n].rotation.z) *
        (1 - Math.exp(-20 * dt));
      this.legs[n].position.y = -0.33 + p.land * 0.1;
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
