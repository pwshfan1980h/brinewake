import * as T from "three";
import type { GameEvent } from "../sim/types";
interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: T.Color;
}
export class Effects {
  particles: Particle[] = [];
  mesh: T.InstancedMesh;
  dummy = new T.Object3D();
  capacity = 360;
  seed = 19;
  constructor(root: T.Scene) {
    this.mesh = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 0),
      new T.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
      }),
      this.capacity,
    );
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    root.add(this.mesh);
    this.mesh.count = 0;
  }
  rand() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  emit(e: GameEvent, low = false) {
    const splash = e.type === "splash",
      big = ["explosion", "bossDefeat", "checkpoint"].includes(e.type),
      count = big ? 25 : splash ? 18 : 6;
    const color = new T.Color(
      splash
        ? "#9befed"
        : e.type === "repair"
          ? "#76ffdb"
          : e.type === "arc"
            ? "#c9fcff"
            : e.type === "hit"
              ? "#ff7c80"
              : "#ffcc85",
    );
    for (
      let n = 0;
      n < (low ? count / 2 : count) && this.particles.length < this.capacity;
      n++
    ) {
      const a = this.rand() * Math.PI * 2,
        s = 1 + this.rand() * (big ? 7 : 3);
      this.particles.push({
        x: e.x,
        y: e.y,
        z: 0.4 + this.rand() * 0.7,
        vx: Math.cos(a) * s,
        vy: splash ? this.rand() * 5 : Math.sin(a) * s,
        life: 0.25 + this.rand() * 0.6,
        max: 0.9,
        size: (big ? 0.08 : 0.04) + this.rand() * 0.05,
        color,
      });
    }
  }
  update(dt: number, wet: boolean) {
    for (let n = this.particles.length - 1; n >= 0; n--) {
      const p = this.particles[n];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[n] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (wet ? 2 : -9) * dt;
    }
    this.mesh.count = this.particles.length;
    this.particles.forEach((p, n) => {
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(p.size * Math.min(1, p.life * 5));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(n, this.dummy.matrix);
      this.mesh.setColorAt(n, p.color);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() {
    this.particles.length = 0;
    this.mesh.count = 0;
  }
}
