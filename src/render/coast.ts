import * as T from "three";
import { box, beam, cylinder, sphere } from "./kit";
import type { Level } from "../sim/types";

// A continuous shore, not independently floating skyline props. All buildings,
// gantries and seawall buttresses share the same surveyed -4m harbor datum.
export function buildCoast(stage: T.Group, level: Level, chapter: number) {
  const colors = [
    [0x667f89, 0xdab49c, 0x89969a, 0x536e76, 0x39545c, 0x8e7965],
    [0x567d85, 0xb6c7b8, 0x7e9d99, 0x4d716f, 0x365a5e, 0x8a8f73],
    [0x202c45, 0x70858d, 0x526977, 0x344e60, 0x263f50, 0x77776c],
  ][chapter];
  const material = (color: number) => new T.MeshBasicMaterial({ color });
  const far = material(colors[2]),
    mid = material(colors[3]);
  const wall = material(colors[4]),
    trim = material(colors[5]);
  const glass = material(chapter === 2 ? 0x7b979c : 0x90aaa6);
  const plant = material(0x4f7467);
  const width = level.length + 180;
  const sky = new T.Mesh(
    new T.PlaneGeometry(width, 100),
    new T.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        zenith: { value: new T.Color(colors[0]) },
        horizon: { value: new T.Color(colors[1]) },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 vUv;uniform vec3 zenith;uniform vec3 horizon;void main(){float h=smoothstep(.12,.48,vUv.y);vec3 c=mix(horizon,zenith,h);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
    }),
  );
  sky.position.set(level.length / 2, 14, -100);
  sky.name = "atmospheric-sky";
  stage.add(sky);
  // Low cloud banks use long, soft silhouettes rather than disconnected balls.
  for (let n = 0; n < 9; n++) {
    const cloud = sphere(
      stage,
      n * 22 - 30,
      8 + (n % 3) * 2,
      -76,
      1,
      new T.MeshBasicMaterial({
        color: colors[2],
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    cloud.scale.set(13, 0.45 + (n % 2) * 0.3, 0.1);
  }
  if (chapter === 0) {
    const sun = new T.Mesh(new T.CircleGeometry(2.1, 48), material(0xf4ceab));
    sun.position.set(25, 8, -88);
    stage.add(sun);
  }
  const sea = material(
    chapter === 2 ? 0x304f63 : chapter === 1 ? 0x578a88 : 0x63898c,
  );
  box(stage, level.length / 2, -4.1, -31, width, 0.2, 62, sea);
  // Close the distant water column so underwater views never reveal sky below it.
  box(stage, level.length / 2, -32, -61, width, 56, 0.2, sea);
  // Explicit far shore/horizon and low island silhouettes, grounded to the sea.
  box(stage, level.length / 2, -4, -60, width, 0.1, 0.3, far);
  for (let n = 0; n < 15; n++) {
    const x = n * 12 - 28,
      h = 0.7 + (n % 4) * 0.4;
    box(stage, x, -4 + h / 2, -55, 10.5, h, 3, far);
    box(stage, x - 2, -4 + h + 0.45, -55, 4.5, 0.9, 2.6, far);
  }
  // A connected low waterfront district: podium, varied rooflines, sparse windows.
  box(stage, level.length / 2, -3.65, -33, width, 0.7, 6, mid);
  for (let n = 0; n < 13; n++) {
    const x = n * 12 - 16,
      h = 1.8 + (n % 3) * 0.6;
    box(stage, x, -3.3 + h / 2, -34, 9.4, h, 4, mid);
    box(stage, x, -3.3 + h, -34, 10, 0.22, 4.3, far);
    if (n % 4 === 1) {
      box(stage, x + 2, h - 2.1, -34, 2.5, 2.4, 3, mid);
      box(stage, x + 2, h - 0.85, -34, 2.8, 0.15, 3.2, trim);
    }
    for (let k = 0; k < 3; k++)
      box(stage, x - 2.8 + k * 2.6, h - 4.15, -31.96, 1.4, 0.32, 0.035, glass);
  }
  // Service quay is the continuous architectural base for each chapter's machinery.
  box(stage, level.length / 2, -2.35, -13, level.length + 32, 3.3, 5, wall);
  box(stage, level.length / 2, -0.65, -13, level.length + 33, 0.25, 5.4, trim);
  for (let x = -12; x < level.length + 20; x += 6) {
    box(stage, x, -2.3, -10.4, 0.5, 3.2, 0.6, mid);
    box(stage, x + 2.8, -1.9, -10.45, 3.9, 1.5, 0.08, mid);
  }
  if (chapter === 0) {
    // Ferry sheds and cargo bays stay low, leaving air above the combat lane.
    for (let x = 4; x < level.length; x += 28) {
      box(stage, x, 0.55, -16, 10, 2.2, 4, mid);
      box(stage, x, 1.75, -16, 10.6, 0.2, 4.6, trim);
      for (let k = -1; k <= 1; k++)
        box(stage, x + k * 2.8, 0.4, -13.95, 2, 1.8, 0.06, wall);
    }
    // Harbor mouth beacon: a single recognizable silhouette, attached to a pier.
    box(stage, 59, -2, -26, 12, 4, 5, mid);
    cylinder(stage, 59, 2.6, -26, 0.8, 5.2, far);
    box(stage, 59, 5.3, -26, 2.1, 0.35, 2.1, trim);
    cylinder(stage, 59, 5.9, -26, 0.65, 0.9, glass);
    box(stage, 59, 6.45, -26, 1.8, 0.2, 1.8, wall);
  } else if (chapter === 1) {
    // Terraced pump hall, connected aqueduct and actual planted roof beds.
    box(stage, level.length / 2, 3.1, -17, level.length + 12, 0.5, 3, trim);
    for (let x = -4; x < level.length + 12; x += 12) {
      box(stage, x, 1.1, -17, 0.75, 3.8, 2, mid);
      box(stage, x + 4, 0.55, -19, 6, 2.2, 4, mid);
      box(stage, x + 4, 1.75, -19, 6.5, 0.25, 4.3, trim);
      for (let k = 0; k < 3; k++) {
        const leaf = sphere(stage, x + 2 + k * 1.8, 2.1, -18, 0.8, plant);
        leaf.scale.set(1.3, 0.55, 0.8);
      }
    }
  } else {
    // Seawall crown: linked buttresses and a distant control station, not towers.
    for (let x = 0; x < level.length; x += 14) {
      box(stage, x, 1.2, -20, 2, 3.6, 5, mid);
      beam(
        stage,
        new T.Vector3(x, -0.5, -17),
        new T.Vector3(x, 3, -20),
        0.6,
        trim,
      );
    }
    box(stage, level.length / 2, 3.2, -20, level.length + 14, 0.45, 3.2, mid);
    box(stage, 95, 4.8, -27, 12, 4, 6, mid);
    box(stage, 95, 7, -27, 15, 0.45, 7, trim);
    box(stage, 95, 5.8, -23.95, 10.5, 0.7, 0.05, glass);
    cylinder(stage, 95, 9, -27, 0.07, 4, trim);
  }
  const ripple = new T.MeshBasicMaterial({
    color: colors[1],
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
  });
  for (let n = 0; n < 48; n++)
    box(
      stage,
      n * 3.7 - 25,
      -3.97,
      -5 - (n % 9) * 5.5,
      1 + (n % 5),
      0.015,
      0.04,
      ripple,
    );
}
