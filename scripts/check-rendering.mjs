import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
// Requires a Vite DEV server for the structural /src module probe, not dist.
// npm run dev -- --port 4176; node scripts/check-rendering.mjs
const base = process.argv[2] || "http://127.0.0.1:4176/";
const tag = process.argv[3] || "after";
const out = `docs/screenshots/rendering/${tag}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const evidence = [];
try {
  for (const level of [0, 1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ level }) =>
        localStorage.setItem(
          "brinewake.checkpoint.v1",
          JSON.stringify({
            version: 1,
            level,
            completed: 0,
            x: [50, 29, 56][level],
            y: [1, -5.8, 1][level],
          }),
        ),
      { level },
    );
    await page.goto(base + "?diagnostics");
    await page
      .getByRole("button", { name: "Continue from relay", exact: true })
      .click();
    await page.waitForFunction(
      () => window.__BRINEWAKE__.snapshot().menu === "hidden",
    );
    await page.bringToFront();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/chapter-${level + 1}.png` });
    const sample = async (key) => {
      await page.keyboard.down(key);
      const result = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const samples = [];
            let count = 0;
            function frame() {
              const s = window.__BRINEWAKE__.snapshot();
              const o = s.objectives[0];
              const label = [
                ...document.querySelectorAll(".objective-label"),
              ].find((e) => e.textContent.includes(o.name));
              const expected = window.__BRINEWAKE__.screen(o.x, o.y + 2.8);
              if (label)
                samples.push({
                  x: s.player.x,
                  expected: expected.x,
                  actual: parseFloat(label.style.left),
                  error: Math.abs(parseFloat(label.style.left) - expected.x),
                });
              if (++count < 20) requestAnimationFrame(frame);
              else resolve(samples);
            }
            requestAnimationFrame(frame);
          }),
      );
      await page.screenshot({ path: `${out}/chapter-${level + 1}-${key}.png` });
      await page.keyboard.up(key);
      return result;
    };
    const right = await sample("KeyD"),
      left = await sample("KeyA");
    // Dev-server-only structural probe: real constructed and batched geometry,
    // raycast vertically through the first walkable surface, not source matching.
    const surfaces = await page.evaluate(async (level) => {
      const [{ World }, { Campaign }, T] = await Promise.all([
        import("/src/render/World.ts"),
        import("/src/sim/campaign.ts"),
        import("/node_modules/three/build/three.module.js"),
      ]);
      const g = new Campaign();
      g.load(level);
      const host = document.createElement("div");
      const w = new World(host, { lowEffects: true, reducedMotion: true });
      w.load(g);
      w.stage.updateMatrixWorld(true);
      const p = g.level.platforms[0];
      const ray = new T.Raycaster(
        new T.Vector3(p.x + p.w * 0.43, p.y + 2, 0),
        new T.Vector3(0, -1, 0),
      );
      const hits = ray
        .intersectObject(w.stage, true)
        .filter(
          (h) => h.face?.normal.y > 0.9 && Math.abs(h.point.y - p.y) < 0.25,
        );
      const tops = hits.map((h) => ({
        y: h.point.y,
        color: h.object.material.color?.getHexString(),
      }));
      w.renderer.dispose();
      return tops;
    }, level);
    evidence.push({
      level,
      errors,
      right,
      left,
      surfaces,
      maxLabelError: Math.max(...right.concat(left).map((s) => s.error)),
    });
    await page.close();
  }
  await writeFile(`${out}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      evidence.map(
        ({ level, errors, maxLabelError, surfaces, right, left }) => ({
          level,
          errors,
          maxLabelError,
          surfaces,
          rightTravel: right.at(-1).x - right[0].x,
          leftTravel: left.at(-1).x - left[0].x,
        }),
      ),
      null,
      2,
    ),
  );
  for (const e of evidence) {
    assert.deepEqual(e.errors, []);
    assert.ok(
      e.right.at(-1).x > e.right[0].x && e.left.at(-1).x < e.left[0].x,
      "real left/right movement",
    );
    assert.ok(
      e.maxLabelError < 0.5,
      `chapter ${e.level + 1}: HUD must track the current rendered camera every frame; error ${e.maxLabelError}px`,
    );
    const tops = [
      ...new Set(
        e.surfaces.filter((s) => Math.abs(s.y) < 1e-5).map((s) => s.color),
      ),
    ];
    assert.equal(
      tops.length,
      1,
      "only the deck cap may occupy the walkable top plane",
    );
  }
} finally {
  await browser.close();
}
