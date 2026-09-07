import { describe, expect, it } from "vitest";
import * as T from "three";
import { buildCoast } from "../render/coast";
import { levels } from "../data/levels";
import { disposeTree } from "../render/kit";

const luminance = (c: T.Color) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
describe("blue-hour architecture", () => {
  for (const [chapter, level] of levels.entries()) {
    it(`chapter ${chapter + 1} has dark sky, distinct rim and warm practicals without added lights`, () => {
      const stage = new T.Group();
      buildCoast(stage, level, chapter);
      const sky = stage.getObjectByName("atmospheric-sky") as T.Mesh<
        T.PlaneGeometry,
        T.ShaderMaterial
      >;
      const horizon = sky.material.uniforms.horizon.value as T.Color;
      expect(luminance(horizon)).toBeLessThan(0.1);
      const rims: T.MeshBasicMaterial[] = [],
        windows: T.MeshBasicMaterial[] = [];
      let lights = 0;
      stage.traverse((o) => {
        if (o instanceof T.Light) lights++;
        if (o instanceof T.Mesh && o.material.name === "architectural-rim")
          rims.push(o.material);
        if (o instanceof T.Mesh && o.material.name === "warm-practical")
          windows.push(o.material);
      });
      expect(rims.length).toBeGreaterThan(20);
      expect(windows.length).toBeGreaterThan(5);
      expect(luminance(rims[0].color)).toBeGreaterThan(luminance(horizon) * 2);
      expect(windows[0].color.r).toBeGreaterThan(windows[0].color.b);
      expect(lights).toBe(0);
      disposeTree(stage);
    });
  }
});
