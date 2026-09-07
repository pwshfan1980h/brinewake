import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Campaign } from "../sim/campaign";

// Fixed-capacity presentation pool. Local +X is the warhead, -X the nozzle.
// No projectile state, homing, damage or collision data is changed here.
export class Missiles {
  body: T.InstancedMesh;
  flame: T.InstancedMesh;
  core: T.InstancedMesh;
  bubbles: T.InstancedMesh;
  dummy = new T.Object3D();
  capacity = 64;
  constructor(scene: T.Scene) {
    const parts: T.BufferGeometry[] = [];
    const add = (geometry: T.BufferGeometry, color: number, x = 0) => {
      const g = geometry.index ? geometry.toNonIndexed() : geometry;
      if (g !== geometry) geometry.dispose();
      g.translate(x, 0, 0);
      const c = new T.Color(color),
        values = [];
      for (let n = 0; n < g.attributes.position.count; n++)
        values.push(c.r, c.g, c.b);
      g.setAttribute("color", new T.Float32BufferAttribute(values, 3));
      parts.push(g);
    };
    add(
      new T.CylinderGeometry(0.115, 0.115, 0.64, 10).rotateZ(-Math.PI / 2),
      0xe5ddbd,
    );
    add(
      new T.ConeGeometry(0.115, 0.3, 10).rotateZ(-Math.PI / 2),
      0xd16f45,
      0.47,
    );
    add(
      new T.CylinderGeometry(0.12, 0.12, 0.09, 10).rotateZ(-Math.PI / 2),
      0x49686d,
      0.2,
    );
    add(
      new T.CylinderGeometry(0.085, 0.105, 0.14, 10).rotateZ(-Math.PI / 2),
      0x233f49,
      -0.38,
    );
    // Four swept triangular stabilizers, with a visible silhouette in side view.
    for (let n = 0; n < 4; n++) {
      const fin = new T.BufferGeometry();
      fin.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [
            -0.35, 0.09, 0, -0.42, 0.28, 0, -0.08, 0.09, 0, -0.08, 0.09, 0,
            -0.42, 0.28, 0, -0.35, 0.09, 0,
          ],
          3,
        ),
      );
      fin.setAttribute(
        "uv",
        new T.Float32BufferAttribute(new Float32Array(12), 2),
      );
      fin.computeVertexNormals();
      fin.rotateX((n * Math.PI) / 2);
      add(fin, 0x748f91);
    }
    const geometry = mergeGeometries(parts)!;
    parts.forEach((g) => g.dispose());
    this.body = new T.InstancedMesh(
      geometry,
      new T.MeshBasicMaterial({ vertexColors: true }),
      this.capacity,
    );
    const plume = new T.ConeGeometry(0.105, 0.8, 8)
      .rotateZ(Math.PI / 2)
      .translate(-0.85, 0, 0);
    this.flame = new T.InstancedMesh(
      plume,
      new T.MeshBasicMaterial({
        color: 0xf59551,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
      this.capacity,
    );
    this.core = new T.InstancedMesh(
      new T.ConeGeometry(0.055, 0.45, 8)
        .rotateZ(Math.PI / 2)
        .translate(-0.65, 0, 0),
      new T.MeshBasicMaterial({ color: 0xffefba }),
      this.capacity,
    );
    this.bubbles = new T.InstancedMesh(
      new T.RingGeometry(0.7, 1, 10),
      new T.MeshBasicMaterial({
        color: 0xb4e2de,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: T.DoubleSide,
      }),
      this.capacity * 5,
    );
    for (const m of [this.body, this.flame, this.core, this.bubbles]) {
      m.count = 0;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      scene.add(m);
    }
  }
  update(g: Campaign, low: boolean) {
    let count = 0,
      flames = 0,
      bubbles = 0;
    for (const shot of g.shots) {
      if (shot.kind !== "pod" || count >= this.capacity) continue;
      const angle = Math.atan2(shot.vy, shot.vx),
        dx = Math.cos(angle),
        dy = Math.sin(angle);
      this.dummy.position.set(shot.x, shot.y, 0.5);
      this.dummy.rotation.set(0, 0, angle);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.body.setMatrixAt(count++, this.dummy.matrix);
      const wet = g.level.water.some(
        (w) =>
          shot.x >= w.x &&
          shot.x <= w.x + w.w &&
          shot.y < w.surface &&
          shot.y > w.bottom,
      );
      if (!wet) {
        this.dummy.scale.set(1 + Math.sin(g.time * 45 + shot.id) * 0.1, 1, 1);
        this.dummy.updateMatrix();
        this.flame.setMatrixAt(flames, this.dummy.matrix);
        this.core.setMatrixAt(flames++, this.dummy.matrix);
      } else {
        for (let k = 0; k < (low ? 3 : 5); k++) {
          const age = (k + ((g.time * 9) % 1)) / 5,
            distance = 0.55 + age * 1.8;
          this.dummy.position.set(
            shot.x - dx * distance,
            shot.y - dy * distance + age * age * 0.5,
            0.58,
          );
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.setScalar(0.035 + age * 0.055);
          this.dummy.updateMatrix();
          this.bubbles.setMatrixAt(bubbles++, this.dummy.matrix);
        }
      }
    }
    this.body.count = count;
    this.flame.count = this.core.count = flames;
    this.bubbles.count = bubbles;
    for (const m of [this.body, this.flame, this.core, this.bubbles])
      m.instanceMatrix.needsUpdate = true;
  }
}
