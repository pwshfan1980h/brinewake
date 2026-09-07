import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { cameraFrame } from "./camera";
import { Mech } from "./Mech";
import { box, cylinder, sphere, beam, label, mats, disposeTree } from "./kit";
import { Effects } from "./effects";
import { buildCoast } from "./coast";
import { Missiles } from "./missiles";
import type { Campaign } from "../sim/campaign";
import type { Enemy, Input, Level } from "../sim/types";
import type { Settings } from "../input/InputManager";
const waterVertex = `varying vec2 vUv; uniform float time; void main(){vUv=uv; vec3 p=position; p.z+=sin(p.x*2.2+time*1.7)*.045+cos(p.y*2.8-time)*.03;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const waterFragment = `varying vec2 vUv;uniform float time;uniform vec3 tint;uniform float front;void main(){float wave=sin(vUv.x*150.+time*2.+sin(vUv.y*45.-time))*sin(vUv.y*70.-time*1.3);float fine=pow(max(0.,wave),8.);float foam=smoothstep(.965,1.,vUv.y)*front;vec3 c=mix(tint,vec3(.62,.96,.88),fine*.25+foam*.55);float a=front>.5?.22+.14*(1.-vUv.y):.8;gl_FragColor=vec4(c,a);}`;
export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.OrthographicCamera();
  stage = new T.Group();
  mech = new Mech();
  effects: Effects;
  enemyModels = new Map<number, T.Group>();
  objectiveModels: T.Group[] = [];
  moving: T.Object3D[] = [];
  waterMats: T.ShaderMaterial[] = [];
  shots: T.InstancedMesh;
  missiles: Missiles;
  dummy = new T.Object3D();
  reticle = new T.Group();
  bossModel?: T.Group;
  bossCore?: T.Mesh;
  bossArms: T.Group[] = [];
  telegraphs = new T.Group();
  liftDeck?: T.Mesh;
  exitGate?: T.Group;
  skyLight: T.DirectionalLight;
  ray = new T.Raycaster();
  plane = new T.Plane(new T.Vector3(0, 0, 1), -0.44);
  mousePoint = new T.Vector3();
  width = 0;
  height = 0;
  cx = 10;
  cy = 3;
  lastLevel = -1;
  fps = 60;
  frameMs = 16;
  frameCount = 0;
  rain?: T.LineSegments;
  glCalls = 0;
  constructor(
    container: HTMLElement,
    public settings: Settings,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, settings.lowEffects ? 1 : 1.7),
    );
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "BRINEWAKE game viewport",
    );
    this.scene.add(this.stage, this.mech.root);
    this.scene.add(new T.HemisphereLight(0xcdefff, 0x284247, 2.5));
    this.skyLight = new T.DirectionalLight(0xffd5b0, 3);
    this.skyLight.position.set(-10, 20, 15);
    this.scene.add(this.skyLight);
    const fill = new T.DirectionalLight(0x68cfef, 1.5);
    fill.position.set(2, 5, -10);
    this.scene.add(fill);
    this.effects = new Effects(this.scene);
    this.missiles = new Missiles(this.scene);
    this.shots = new T.InstancedMesh(
      new T.SphereGeometry(1, 6, 4),
      new T.MeshBasicMaterial(),
      256,
    );
    this.shots.frustumCulled = false;
    this.scene.add(this.shots);
    this.shots.count = 0;
    const ring = new T.Mesh(
      new T.RingGeometry(0.19, 0.23, 28),
      new T.MeshBasicMaterial({
        color: 0xe8fdec,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.reticle.add(ring);
    for (let n = 0; n < 4; n++) {
      const tick = box(
        this.reticle,
        Math.cos((n * Math.PI) / 2) * 0.34,
        Math.sin((n * Math.PI) / 2) * 0.34,
        0,
        n % 2 ? 0.035 : 0.16,
        n % 2 ? 0.16 : 0.035,
        0.01,
        new T.MeshBasicMaterial({ color: 0xfef0c9, depthTest: false }),
      );
      tick.renderOrder = 100;
    }
    this.reticle.renderOrder = 100;
    this.scene.add(this.reticle);
    this.scene.add(this.telegraphs);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    const aspect = this.width / this.height;
    const h = aspect < 1.3 ? 25 : 18;
    this.camera.left = (-h * aspect) / 2;
    this.camera.right = (h * aspect) / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.near = 0.1;
    this.camera.far = 180;
    this.camera.updateProjectionMatrix();
  }
  mouseWorld(x: number, y: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((x - rect.left) / rect.width) * 2 - 1,
        (-(y - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    this.ray.ray.intersectPlane(this.plane, this.mousePoint);
    return { x: this.mousePoint.x, y: this.mousePoint.y };
  }
  screen(x: number, y: number, z = 0) {
    const p = new T.Vector3(x, y, z).project(this.camera);
    return {
      x: ((p.x + 1) * this.width) / 2,
      y: ((1 - p.y) * this.height) / 2,
    };
  }
  load(g: Campaign) {
    disposeTree(this.stage);
    disposeTree(this.telegraphs);
    this.effects.clear();
    this.enemyModels.clear();
    this.objectiveModels = [];
    this.moving = [];
    this.waterMats = [];
    this.bossArms = [];
    this.bossModel = undefined;
    this.bossCore = undefined;
    this.rain = undefined;
    this.liftDeck = undefined;
    this.lastLevel = g.index;
    const l = g.level;
    this.scene.background = new T.Color(l.palette.sky);
    this.scene.fog = new T.Fog(l.palette.fog, 42, 125);
    this.cx = g.player.x + 7;
    this.cy = 3;
    this.skyLight.color.set(
      g.index === 0 ? 0xffc292 : g.index === 1 ? 0xd0ffe6 : 0x859eda,
    );
    buildCoast(this.stage, l, g.index);
    for (const b of l.platforms) {
      const top = b.y;
      // The cap alone owns the physics top. Recess the structural body below
      // it: coincident upward faces flicker as the camera's depth rounding moves.
      const capHeight = 0.2;
      box(
        this.stage,
        b.x + b.w / 2,
        top - (b.h + capHeight) / 2,
        -0.15,
        b.w,
        b.h - capHeight,
        2.8,
        mats.dark,
      );
      box(this.stage, b.x + b.w / 2, top - 0.1, 0.05, b.w, 0.2, 3, mats.copper);
      box(
        this.stage,
        b.x + b.w / 2,
        top - 0.2,
        1.52,
        b.w,
        0.22,
        0.1,
        mats.cream,
      );
      box(
        this.stage,
        b.x + b.w / 2,
        top - 0.42,
        1.54,
        b.w,
        0.045,
        0.05,
        mats.orange,
      );
      for (let x = b.x + 0.7; x < b.x + b.w - 0.4; x += 2.2) {
        box(this.stage, x, top - 0.16, 1.59, 0.45, 0.13, 0.04, mats.orange);
        if (!b.oneWay) {
          box(this.stage, x, top - 1.2, 1.5, 0.12, 1.3, 0.2, mats.steel);
          box(
            this.stage,
            x + 0.2,
            top - 0.68,
            1.53,
            0.045,
            0.06,
            0.08,
            mats.gold,
          );
        }
      }
      if (b.oneWay) {
        for (const x of [b.x + 0.3, b.x + b.w - 0.3]) {
          cylinder(this.stage, x, top - 2.5, -0.7, 0.065, 5, mats.steel);
          cylinder(this.stage, x, top + 0.12, -1.2, 0.08, 0.25, mats.gold);
        }
      } else
        for (let x = b.x + 2; x < b.x + b.w; x += 5) {
          box(this.stage, x, top + 0.45, -1.1, 0.065, 0.9, 0.065, mats.copper);
          box(this.stage, x, top + 0.9, -1.1, 4.8, 0.055, 0.055, mats.copper);
        }
    }
    for (const w of l.water) {
      for (const front of [0, 1]) {
        const mat = new T.ShaderMaterial({
          vertexShader: waterVertex,
          fragmentShader: waterFragment,
          uniforms: {
            time: { value: 0 },
            tint: { value: new T.Color(l.palette.water) },
            front: { value: front },
          },
          transparent: true,
          depthWrite: false,
          side: T.DoubleSide,
        });
        this.waterMats.push(mat);
        let mesh: T.Mesh;
        if (front) {
          mesh = new T.Mesh(
            new T.PlaneGeometry(w.w, w.surface - w.bottom, 80, 8),
            mat,
          );
          mesh.position.set(w.x + w.w / 2, (w.surface + w.bottom) / 2, 1.9);
        } else {
          mesh = new T.Mesh(new T.PlaneGeometry(w.w, 6, 80, 12), mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(w.x + w.w / 2, w.surface, 0);
        }
        this.stage.add(mesh);
      }
      for (let x = w.x + 0.3; x < w.x + w.w; x += 1.7) {
        const foam = box(
          this.stage,
          x,
          w.surface + 0.035,
          1.92,
          1.15,
          0.025,
          0.02,
          mats.cyan,
        );
        foam.userData = { motion: "foam", base: x };
        this.moving.push(foam);
      }
      for (let x = w.x + 1; x < w.x + w.w; x += 4) {
        const sign = label(w.current > 0 ? "› › ›" : "‹ ‹ ‹", "#8ed5cb", 64);
        sign.position.set(x, w.bottom + 1, 1);
        sign.scale.setScalar(0.5);
        this.stage.add(sign);
      }
    }
    for (let x = 3; x < l.length; x += 8) {
      const lamp = new T.Group();
      const support = l.platforms.find(
        (b) => !b.oneWay && x >= b.x && x <= b.x + b.w,
      );
      if (!support) continue;
      lamp.position.set(x, support.y, -1.1);
      this.stage.add(lamp);
      cylinder(lamp, 0, 2.8, 0, 0.06, 5.6, mats.steel);
      box(lamp, 0.32, 5.6, 0, 0.7, 0.1, 0.1, mats.copper);
      box(lamp, 0.6, 5.45, 0, 0.35, 0.25, 0.3, mats.gold);
      const flag = box(
        lamp,
        0.38,
        4.35,
        0,
        0.7,
        0.3,
        0.025,
        g.index === 1 ? mats.cream : mats.orange,
      );
      flag.userData = { motion: "flag", base: x };
      this.moving.push(flag);
      if (g.index === 1) {
        for (let n = 0; n < 6; n++) {
          const vine = sphere(
            lamp,
            (n % 2) * 0.6 - 0.3,
            1 + n * 0.6,
            -0.2,
            0.45,
            mats.green,
          );
          vine.scale.set(0.8, 1.7, 0.5);
        }
        box(lamp, 0, 1, -0.5, 2, 0.5, 1, mats.copper);
      }
    }
    // Landmarks distinguish the chapters: cranes / planted pumpworks / turbines.
    for (let n = 0; n < 4; n++) {
      const x = 16 + n * 28;
      if (g.index === 0) this.crane(x);
      else if (g.index === 1) this.pump(x);
      else this.turbine(x);
    }
    if (g.index === 2) {
      const v = [];
      for (let n = 0; n < 250; n++) {
        const x = ((n * 17.73) % 130) - 5,
          y = (n * 3.23) % 24;
        v.push(x, y, -2, x - 0.2, y - 0.65, -2);
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
      this.rain = new T.LineSegments(
        geo,
        new T.LineBasicMaterial({
          color: 0xb1c9dc,
          transparent: true,
          opacity: 0.2,
        }),
      );
      this.stage.add(this.rain);
    }
    for (const e of g.enemies) {
      const model = this.makeEnemy(e);
      this.stage.add(model);
      this.enemyModels.set(e.id, model);
    }
    for (const [n, o] of g.objectives.entries()) {
      const group = new T.Group();
      group.position.set(o.x, o.y - 0.9, -0.25);
      this.stage.add(group);
      box(group, 0, 0.7, 0, 1, 1.4, 0.8, mats.cream);
      box(group, 0, 0.85, 0.43, 0.65, 0.55, 0.03, mats.dark);
      box(group, 0, 0.9, 0.46, 0.45, 0.055, 0.04, mats.cyan);
      box(group, 0, 0.15, 0.44, 0.85, 0.15, 0.04, mats.orange);
      cylinder(group, 0, 2.3, 0, 0.035, 2, mats.steel);
      const orb = sphere(group, 0, 3.35, 0, 0.16, mats.gold);
      group.userData.orb = orb;
      const sign = label(`0${n + 1} / RELAY`);
      sign.position.set(0, 2.4, 0);
      sign.scale.setScalar(0.6);
      group.add(sign);
      this.objectiveModels.push(group);
    }
    this.exitGate = new T.Group();
    this.exitGate.position.set(l.exit.x, l.exit.y - 0.9, -0.2);
    this.stage.add(this.exitGate);
    box(this.exitGate, -2, 1.8, -0.7, 0.35, 3.6, 0.6, mats.cream);
    box(this.exitGate, 2, 1.8, -0.7, 0.35, 3.6, 0.6, mats.cream);
    box(this.exitGate, 0, 3.6, -0.7, 4.5, 0.3, 0.7, mats.orange);
    const gate = box(this.exitGate, 0, 1.7, -0.5, 3.8, 3.2, 0.1, mats.steel);
    this.exitGate.userData.gate = gate;
    const exitLabel = label(
      g.index === 1 ? "FLOODGATE ↑" : "EVACUATION →",
      "#ffe0a3",
    );
    exitLabel.position.set(0, 4.3, -0.3);
    exitLabel.scale.setScalar(0.8);
    this.exitGate.add(exitLabel);
    if (g.index === 1) {
      this.liftDeck = box(this.stage, 101, 4.05, 0, 6, 0.3, 3, mats.orange);
      for (const x of [98, 104]) {
        cylinder(this.stage, x, 7, -0.7, 0.08, 14, mats.copper);
        box(this.stage, x, 11, -0.7, 0.3, 0.1, 0.3, mats.cyan);
      }
    }
    if (g.boss) this.makeBoss(g.boss.x, g.boss.y);
    // Original small evacuation boats and passenger silhouettes behind the route.
    for (let n = 0; n < 3; n++) {
      const boat = new T.Group();
      boat.position.set(16 + n * 29, -3.65, -8);
      this.stage.add(boat);
      box(boat, 0, 0, 0, 5, 0.45, 1.3, mats.cream);
      box(boat, 1, 0.65, 0, 1.4, 1, 0.9, mats.orange);
      box(boat, 1, 0.85, 0.5, 1, 0.4, 0.05, mats.dark);
      for (let k = 0; k < 5; k++) {
        cylinder(boat, k * 0.4 - 1.7, 0.5, 0, 0.07, 0.55, mats.dark);
        sphere(boat, k * 0.4 - 1.7, 0.85, 0, 0.11, mats.dark);
      }
      boat.userData = { motion: "boat", base: boat.position.x };
      this.moving.push(boat);
    }
    const title = label(
      g.index === 0
        ? "LANTERN / 07"
        : g.index === 1
          ? "PUMP TERRACE / 02"
          : "CROWN / 09",
      "#ebdabc",
    );
    box(this.stage, 7, 2.7, -3.2, 5.2, 1.1, 0.12, mats.dark);
    for (const x of [4.8, 9.2])
      cylinder(this.stage, x, 1.35, -3.2, 0.045, 2.7, mats.copper);
    title.position.set(7, 2.7, -3.1);
    title.scale.setScalar(1.1);
    this.stage.add(title);
    this.batchStatic();
  }
  batchStatic() {
    this.stage.updateMatrixWorld(true);
    const dynamic = new Set<T.Object3D>([
      ...this.enemyModels.values(),
      ...this.objectiveModels,
      ...this.moving,
    ]);
    if (this.bossModel) dynamic.add(this.bossModel);
    if (this.exitGate) dynamic.add(this.exitGate);
    if (this.liftDeck) dynamic.add(this.liftDeck);
    const groups = new Map<T.Material, T.Mesh[]>();
    this.stage.traverse((o) => {
      if (
        !(o instanceof T.Mesh) ||
        Array.isArray(o.material) ||
        o.material instanceof T.ShaderMaterial ||
        !!(o.material as T.MeshBasicMaterial).map
      )
        return;
      let a: T.Object3D | null = o;
      while (a) {
        if (dynamic.has(a)) return;
        a = a.parent;
      }
      const list = groups.get(o.material) || [];
      list.push(o);
      groups.set(o.material, list);
    });
    for (const [material, meshes] of groups) {
      if (meshes.length < 2) continue;
      const copies = meshes.map((m) => {
        const geometry = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        geometry.applyMatrix4(m.matrixWorld);
        return geometry;
      });
      const merged = mergeGeometries(copies);
      for (const geometry of copies) geometry.dispose();
      if (!merged) continue;
      for (const m of meshes) {
        m.removeFromParent();
        m.geometry.dispose();
      }
      this.stage.add(new T.Mesh(merged, material));
    }
  }
  crane(x: number) {
    const g = new T.Group();
    g.position.set(x, -0.5, -13);
    this.stage.add(g);
    const steel = new T.MeshStandardMaterial({
      color: 0x697c7a,
      roughness: 0.85,
    });
    const paint = new T.MeshStandardMaterial({
      color: 0x9c8063,
      roughness: 0.85,
    });
    box(g, 0, 0.15, 0, 5, 0.3, 3, steel);
    for (const s of [-1, 1]) {
      beam(
        g,
        new T.Vector3(s * 1.8, 0.3, 0),
        new T.Vector3(s * 0.7, 6, 0),
        0.22,
        paint,
      );
      box(g, s * 1.8, 0.35, 0, 0.8, 0.4, 1.8, steel);
    }
    beam(g, new T.Vector3(-1.4, 2, 0), new T.Vector3(1, 4.8, 0), 0.1, steel);
    beam(g, new T.Vector3(1.4, 2, 0), new T.Vector3(-1, 4.8, 0), 0.1, steel);
    box(g, 1.8, 6, 0, 10, 0.2, 0.5, paint);
    box(g, 1.8, 6.9, 0, 10, 0.12, 0.3, steel);
    for (let n = 0; n < 10; n++)
      beam(
        g,
        new T.Vector3(n - 3.2, 6 + (n % 2) * 0.9, 0),
        new T.Vector3(n - 2.2, 6 + ((n + 1) % 2) * 0.9, 0),
        0.065,
        steel,
      );
    box(g, -0.25, 5.35, 0.3, 1.6, 1.1, 1.2, steel);
    box(g, -0.15, 5.5, 0.92, 1.1, 0.4, 0.04, mats.dark);
    box(g, -2.5, 5.7, 0, 1.2, 0.65, 1.2, paint);
    // Fixed hoist endpoint meets its cargo; no detached, swinging cable segments.
    cylinder(g, 5.4, 3.8, 0, 0.025, 4.4, steel);
    box(g, 5.4, 0.95, 0, 2, 1.3, 1.6, steel);
  }
  pump(x: number) {
    const g = new T.Group();
    g.position.set(x, -0.5, -13);
    this.stage.add(g);
    for (const s of [-1, 1]) {
      cylinder(g, s * 3, 3.5, 0, 0.7, 10, mats.steel);
      for (let y = 0; y < 9; y += 2)
        cylinder(g, s * 3, y, 0, 0.8, 0.15, mats.copper);
    }
    box(g, 0, 7, 0, 7, 0.4, 3, mats.copper);
    box(g, 0, 3, 0, 7, 0.4, 3, mats.copper);
    for (let n = 0; n < 12; n++) {
      const leaf = sphere(
        g,
        (n % 6) - 2.5,
        7.5 + Math.sin(n) * 0.4,
        n > 5 ? 1 : -1,
        0.65,
        mats.green,
      );
      leaf.scale.y = 0.65;
    }
    const falls = box(
      g,
      1,
      3.2,
      0.5,
      1,
      6,
      0.15,
      new T.MeshBasicMaterial({
        color: 0x6ed7c6,
        transparent: true,
        opacity: 0.32,
      }),
    );
    falls.userData = { motion: "fall", base: 3.2 };
    this.moving.push(falls);
  }
  turbine(x: number) {
    const g = new T.Group();
    g.position.set(x, 7, -16);
    this.stage.add(g);
    cylinder(g, 0, -4, 0, 0.3, 15, mats.steel);
    const rotor = new T.Group();
    g.add(rotor);
    sphere(rotor, 0, 0, 0, 0.6, mats.copper);
    for (let n = 0; n < 3; n++) {
      const blade = box(rotor, 0, 2.8, 0, 0.45, 5.3, 0.25, mats.cream);
      const pivot = new T.Group();
      rotor.remove(blade);
      pivot.add(blade);
      pivot.rotation.z = (n * Math.PI * 2) / 3;
      rotor.add(pivot);
    }
    rotor.userData = { motion: "rotor", base: x };
    this.moving.push(rotor);
  }
  makeEnemy(e: Enemy) {
    const g = new T.Group();
    g.position.set(e.x, e.y, 0);
    const heavy = e.kind === "breaker";
    box(
      g,
      0,
      0,
      0,
      heavy ? 1.15 : 0.8,
      heavy ? 1.3 : 0.6,
      0.7,
      heavy ? mats.copper : mats.steel,
    );
    box(g, 0, 0.12, 0.4, 0.55, 0.1, 0.08, mats.red);
    const gun = new T.Group();
    g.add(gun);
    box(gun, 0.6, 0, 0.1, 0.8, 0.13, 0.2, mats.dark);
    g.userData.gun = gun;
    if (e.kind === "dart") {
      for (const s of [-1, 1]) {
        const rotor = cylinder(g, s * 0.7, 0.3, 0, 0.35, 0.055, mats.dark);
        g.userData["rotor" + s] = rotor;
        box(g, s * 0.5, 0.1, 0, 0.6, 0.1, 0.16, mats.orange);
      }
    } else if (e.kind === "buoy") {
      const ring = new T.Mesh(
        new T.TorusGeometry(0.65, 0.15, 8, 16),
        mats.orange,
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      cylinder(g, 0, 0.55, 0, 0.035, 0.8, mats.copper);
      sphere(g, 0, 0.95, 0, 0.1, mats.red);
    } else
      for (const s of [-1, 1]) {
        const leg = box(g, s * 0.4, -0.5, 0, 0.18, 0.55, 0.25, mats.dark);
        g.userData["leg" + s] = leg;
        box(g, s * 0.48, -0.7, 0.1, 0.42, 0.15, 0.4, mats.copper);
      }
    if (heavy) box(g, -0.5, 0, 0.45, 0.18, 1.5, 0.35, mats.cyan);
    const tell = new T.Mesh(
      new T.RingGeometry(0.85, 0.91, 24),
      new T.MeshBasicMaterial({
        color: 0xffcc75,
        transparent: true,
        opacity: 0.9,
      }),
    );
    tell.position.z = 0.6;
    tell.visible = false;
    g.add(tell);
    g.userData.tell = tell;
    return g;
  }
  makeBoss(x: number, y: number) {
    const g = new T.Group();
    g.position.set(x, y, -0.4);
    this.stage.add(g);
    this.bossModel = g;
    box(g, 0, 0, 0, 4.4, 3.2, 2, mats.steel);
    box(g, 0, 1.6, 0, 4.6, 0.35, 2.1, mats.cream);
    box(g, 0, -1.3, 1.1, 3.8, 0.3, 0.2, mats.orange);
    for (let n = 0; n < 8; n++)
      box(g, n * 0.5 - 1.75, 1.7, 1.1, 0.2, 0.3, 0.1, mats.orange);
    this.bossCore = sphere(g, 0, 0, 1.3, 1.15, mats.cyan);
    const ring = new T.Mesh(new T.TorusGeometry(1.4, 0.22, 8, 32), mats.copper);
    ring.position.z = 1.3;
    g.add(ring);
    g.userData.ring = ring;
    for (const s of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(s * 2, 1, 0);
      g.add(arm);
      box(arm, s * 0.7, -0.9, 0, 1.1, 2.2, 1.4, mats.cream);
      sphere(arm, s * 0.6, -1.9, 0, 0.65, mats.copper);
      box(arm, s * 0.55, -2.6, 0.2, 0.65, 1.5, 1, mats.dark);
      box(arm, s * 0.55, -3.3, 0.4, 1.3, 0.45, 1.6, mats.orange);
      this.bossArms.push(arm);
      beam(
        g,
        new T.Vector3(s * 1.3, -1, 0),
        new T.Vector3(s * 2, -3.8, 0),
        0.7,
        mats.steel,
      );
      box(g, s * 2, -3.9, 0.4, 2, 0.4, 2, mats.dark);
      cylinder(g, s * 1.6, 2.9, -0.1, 0.3, 2.6, mats.copper);
      sphere(g, s * 1.6, 4.3, -0.1, 0.15, mats.gold);
    }
    const sign = label("T I D E M I N D E R", "#e5d1b2");
    sign.position.set(0, 2.1, 1.5);
    sign.scale.setScalar(0.85);
    g.add(sign);
  }
  update(
    g: Campaign,
    i: Input,
    dt: number,
    mouse: { x: number; y: number },
    device: string,
    menu: boolean,
  ) {
    if (this.lastLevel !== g.index) this.load(g);
    const p = g.player,
      t = g.time;
    const aspect = this.width / this.height;
    const frame = cameraFrame(
      p,
      g.level.length,
      aspect,
      g.boss,
      !!g.boss && p.x > 80 && g.objectives.every((o) => o.done),
    );
    this.cx += (frame.x - this.cx) * (1 - Math.exp(-dt * 4));
    this.cy += (frame.y - this.cy) * (1 - Math.exp(-dt * 3));
    const halfHeight =
      this.camera.top +
      (frame.height / 2 - this.camera.top) * (1 - Math.exp(-dt * 4));
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.cx, this.cy + 4, 28);
    this.camera.lookAt(this.cx, this.cy, 0);
    this.camera.updateMatrixWorld();
    this.mech.update(
      p,
      i,
      t,
      dt,
      this.settings.reducedMotion,
      g.status === "victory",
    );
    if (this.liftDeck) this.liftDeck.position.y = 4.05 + g.lift;
    this.reticle.visible = !menu;
    const ret =
      device === "keyboard"
        ? this.mouseWorld(mouse.x, mouse.y)
        : { x: p.x + Math.cos(p.aim) * 7, y: p.y + 0.3 + Math.sin(p.aim) * 7 };
    this.reticle.position.set(ret.x, ret.y, 0.44);
    this.reticle.rotation.z = t * 0.3;
    for (const m of this.waterMats) m.uniforms.time.value = t;
    for (const o of this.moving) {
      const m = o.userData.motion;
      if (m === "flag") o.rotation.y = Math.sin(t * 3 + o.userData.base) * 0.4;
      else if (m === "rotor")
        o.rotation.z += dt * (g.status === "victory" ? 0.04 : 0.2);
      else if (m === "cable") o.rotation.z = Math.sin(t * 0.5) * 0.025;
      else if (m === "boat") {
        o.position.y = -3.65 + Math.sin(t * 1.3 + o.userData.base) * 0.12;
        o.position.x =
          o.userData.base + (g.transition > 0 ? (t * 0.3) % 10 : 0);
      } else if (m === "foam")
        o.scale.x = 0.6 + Math.sin(t * 2 + o.userData.base) * 0.3;
      else if (m === "fall") o.scale.x = 0.9 + Math.sin(t * 4) * 0.1;
    }
    if (this.rain) {
      this.rain.visible = !this.settings.lowEffects && g.status !== "victory";
      this.rain.position.y = -(t * 5) % 4;
    }
    for (const e of g.enemies) {
      const m = this.enemyModels.get(e.id)!;
      m.position.set(e.x, e.y, 0);
      m.visible = e.dead < 0.6;
      m.scale.setScalar(e.hp <= 0 ? Math.max(0, 1 - e.dead * 1.7) : 1);
      m.rotation.z = e.hp <= 0 ? e.dead * 3 : Math.sin(e.time * 4) * 0.025;
      m.userData.gun.rotation.z = e.aim;
      m.userData.gun.position.x = -Math.cos(e.aim) * e.attack;
      m.userData.tell.visible = e.tell > 0;
      m.userData.tell.scale.setScalar(1 + e.tell * 0.4);
      for (const s of [-1, 1]) {
        if (m.userData["leg" + s])
          m.userData["leg" + s].rotation.z = Math.sin(e.time * 8 + s) * 0.25;
        if (m.userData["rotor" + s])
          m.userData["rotor" + s].rotation.y = t * 20;
      }
      if (e.hit > 0) m.scale.setScalar(1.07);
    }
    g.objectives.forEach((o, n) => {
      const m = this.objectiveModels[n];
      (m.userData.orb as T.Mesh).material = o.done ? mats.cyan : mats.gold;
      m.userData.orb.scale.setScalar(1 + Math.sin(t * 3) * 0.2);
    });
    if (this.exitGate)
      this.exitGate.userData.gate.position.y = 1.7 + g.transition * 3.4;
    if (g.boss && this.bossModel) {
      const b = g.boss;
      this.bossModel.position.y +=
        (b.y +
          (b.state === "dormant" ? -1.4 : Math.sin(t * 1.5) * 0.12) -
          this.bossModel.position.y) *
        (1 - Math.exp(-dt * 2));
      this.bossCore!.material =
        b.state === "open"
          ? mats.cyan
          : b.state === "tell"
            ? mats.gold
            : mats.red;
      this.bossCore!.scale.setScalar(
        b.state === "open" ? 1 + Math.sin(t * 6) * 0.08 : 0.55,
      );
      this.bossModel.userData.ring.rotation.z = t * 0.35;
      this.bossArms.forEach(
        (a, n) =>
          (a.rotation.z =
            (n === 0 ? 1 : -1) *
            (b.state === "tell"
              ? 0.35
              : b.state === "attack"
                ? 0.6
                : Math.sin(t * 2) * 0.07)),
      );
      if (b.state === "dead") {
        this.bossModel.rotation.z = -0.12;
        this.bossModel.position.y = b.y - 0.6;
      }
      // Reuse a small fixed set of telegraphs; no per-frame geometry allocations.
      if (this.telegraphs.children.length === 0) {
        for (let n = 0; n < 2; n++) {
          const m = box(
            this.telegraphs,
            0,
            0.08,
            0.9,
            3.4,
            0.06,
            2,
            new T.MeshBasicMaterial({
              color: 0xffb366,
              transparent: true,
              opacity: 0.65,
            }),
          );
          m.userData.n = n;
        }
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(),
            new T.Vector3(),
          ]),
          new T.LineDashedMaterial({
            color: 0xffc582,
            dashSize: 0.5,
            gapSize: 0.3,
          }),
        );
        this.telegraphs.add(line);
      }
      this.telegraphs.visible = b.state === "tell";
      for (let n = 0; n < 2; n++) {
        const m = this.telegraphs.children[n];
        m.visible = b.phase === 1;
        m.position.x = b.sectors[n] || 0;
      }
      const line = this.telegraphs.children[2] as T.Line;
      line.visible = b.phase !== 1;
      const positions = line.geometry.attributes.position as T.BufferAttribute;
      positions.setXYZ(0, b.x - 2, b.y, 1);
      positions.setXYZ(1, b.targetX, b.targetY, 1);
      positions.needsUpdate = true;
      line.computeLineDistances();
    }
    this.missiles.update(g, this.settings.lowEffects);
    let shotCount = 0;
    for (const s of g.shots) {
      if (s.kind === "pod" || shotCount >= 256) continue;
      const n = shotCount++;
      this.dummy.position.set(s.x, s.y, 0.44);
      this.dummy.rotation.z = Math.atan2(s.vy, s.vx);
      this.dummy.scale.set(
        s.kind === "arc" ? 0.9 : s.kind === "rivet" ? 0.32 : 0.25,
        s.kind === "arc" ? 0.08 : 0.105,
        0.1,
      );
      this.dummy.updateMatrix();
      this.shots.setMatrixAt(n, this.dummy.matrix);
      this.shots.setColorAt(
        n,
        new T.Color(
          s.friendly ? (s.kind === "arc" ? 0x8bfff4 : 0xffd88f) : 0xff6f7d,
        ),
      );
    }
    this.shots.count = shotCount;
    this.shots.instanceMatrix.needsUpdate = true;
    if (this.shots.instanceColor) this.shots.instanceColor.needsUpdate = true;
    if (g.status === "victory") {
      (this.scene.background as T.Color).lerp(
        new T.Color("#60838d"),
        dt * 0.18,
      );
      this.skyLight.intensity = 2;
    } else
      this.skyLight.intensity =
        3 +
        (g.index === 2 &&
        !this.settings.reducedMotion &&
        !this.settings.lowEffects &&
        Math.sin(t * 0.71) > 0.998
          ? 0.6
          : 0);
    this.effects.update(dt, p.water === "submerged");
    if (!menu && Math.floor(t * 20) !== Math.floor((t - dt) * 20)) {
      if ((i.jump && !p.grounded) || p.dash > 0)
        this.effects.emit({ type: "arc", x: p.x - 0.25, y: p.y - 0.7 }, true);
      if (p.repair > 0 || i.interact)
        this.effects.emit({ type: "repair", x: p.x - 0.2, y: p.y - 0.3 }, true);
      if (p.water === "wading" && Math.abs(p.vx) > 1)
        this.effects.emit({ type: "splash", x: p.x, y: p.y - 0.8 }, true);
      if (p.water === "submerged" && (Math.abs(p.vx) > 0.4 || i.primary))
        this.effects.emit({ type: "splash", x: p.x, y: p.y }, true);
    }
    this.renderer.render(this.scene, this.camera);
    this.glCalls = this.renderer.info.render.calls;
  }
}
