import { describe, it, expect, vi, afterEach } from "vitest";
import * as THREE from "three";
import { World } from "../render/World";
import { Campaign } from "../sim/campaign";
import { disposeTree } from "../render/kit";
// Exercise procedural geometry, batching, dynamic exclusions and resource transitions.
// This deliberately does not pretend to validate WebGL shaders or browser pixels.
afterEach(() => vi.unstubAllGlobals());
function sceneBuilder() {
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillText: () => {} }),
    }),
  });
  const w = Object.create(World.prototype) as World;
  Object.assign(w, {
    stage: new THREE.Group(),
    telegraphs: new THREE.Group(),
    scene: new THREE.Scene(),
    skyLight: new THREE.DirectionalLight(),
    effects: { clear: () => {} },
    enemyModels: new Map(),
    objectiveModels: [],
    moving: [],
    waterMats: [],
    bossArms: [],
  });
  return w;
}
describe("original procedural scenery", () => {
  it.each([0, 1, 2])(
    "constructs chapter %i with finite geometry and a bounded mesh count",
    (level) => {
      const w = sceneBuilder(),
        g = new Campaign(level);
      w.load(g);
      let meshCount = 0;
      w.stage.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          meshCount++;
          expect(o.geometry.attributes.position.count).toBeGreaterThan(0);
          for (const n of o.geometry.attributes.position.array)
            expect(Number.isFinite(n)).toBe(true);
        }
      });
      expect(meshCount).toBeLessThan(450);
      expect(w.enemyModels.size).toBe(g.enemies.length);
      expect(w.objectiveModels.length).toBe(g.objectives.length);
      expect(w.waterMats.length).toBe(g.level.water.length * 2);
      expect(!!w.bossModel).toBe(level === 2);
      for (const m of w.enemyModels.values())
        expect(m.userData.gun.parent).toBe(m);
      disposeTree(w.stage);
    },
  );
  it("rebuilds all three chapters without retaining old stage objects", () => {
    const w = sceneBuilder();
    w.load(new Campaign(0));
    const old = [...w.stage.children];
    w.load(new Campaign(1));
    for (const child of old) expect(child.parent).toBeNull();
    expect(w.liftDeck).toBeDefined();
    w.load(new Campaign(2));
    expect(w.liftDeck).toBeUndefined();
    expect(w.bossModel).toBeDefined();
    disposeTree(w.stage);
  });
});
