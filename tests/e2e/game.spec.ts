import { test, expect } from "@playwright/test";
test("first paint, actual keyboard movement, independent aim, fire, guide and pause", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?diagnostics");
  await expect(
    page.getByRole("button", { name: "Begin rescue" }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/01-title.png" });
  await page.getByRole("button", { name: "Begin rescue" }).click();
  await expect(page.locator('#menu')).toBeHidden();
  await page.waitForTimeout(300);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(450);
  await page.keyboard.up("KeyD");
  let s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
  expect(s.player.x).toBeGreaterThan(5);
  await page.mouse.move(900, 450);
  await page.mouse.down({ button: "right" });
  await page.waitForTimeout(600);
  await page.mouse.up({ button: "right" });
  s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
  expect(s.player.heat).toBeGreaterThan(0);
  await page.keyboard.down("Space");
  await page.waitForTimeout(400);
  await page.keyboard.up("Space");
  await page.screenshot({ path: "docs/screenshots/02-quay-jet.png" });
  await page.keyboard.press("KeyH");
  await expect(
    page.getByRole("heading", { name: "A sealed hull. A steady hand." }),
  ).toBeVisible();
  await page.keyboard.press("KeyH");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Resume rescue" }),
  ).toBeVisible();
  const x = (await page.evaluate(() => window.__BRINEWAKE__.snapshot())).player
    .x;
  await page.waitForTimeout(300);
  expect(
    (await page.evaluate(() => window.__BRINEWAKE__.snapshot())).player.x,
  ).toBe(x);
  await page.getByRole("button", { name: "Resume rescue" }).click();
  expect(errors).toEqual([]);
});

import { Pilot } from "./pilot";
import { BrowserDriver } from "./driver";
test("full campaign: keyboard/mouse only, water in every chapter, every boss phase and victory", async ({
  page,
}, testInfo) => {
  test.setTimeout(300000);
  const errors: string[] = [],
    networkFailures: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => networkFailures.push(r.url()));
  await page.goto("/?diagnostics");
  await page.getByRole("button", { name: "Begin rescue" }).click();
  const pilot = new Pilot(),
    driver = new BrowserDriver(page),
    levels = new Set<number>(),
    water = new Set<number>(),
    phases = new Set<number>(),
    captured = new Set<string>(),
    frames: number[] = [];
  let previous = 0;
  let last: any;
  for (let n = 0; n < 2200; n++) {
    const s = (last = await page.evaluate(() =>
      window.__BRINEWAKE__.snapshot(),
    ));
    levels.add(s.level);
    frames.push(s.render.frameMs);
    expect(
      s.status,
      JSON.stringify({
        level: s.level,
        player: s.player,
        pilotStage: pilot.stage,
      }),
    ).not.toBe("dead");
    if (s.status === "victory") break;
    const names: string[] = [];
    if (!captured.has(`level${s.level}`)) names.push(`level${s.level}`);
    if (s.player.water === "submerged") {
      water.add(s.level);
      if (!captured.has(`water${s.level}`)) names.push(`water${s.level}`);
    }
    if (s.boss && s.boss.state !== "dormant") {
      phases.add(s.boss.phase);
      if (!captured.has(`boss${s.boss.phase}`))
        names.push(`boss${s.boss.phase}`);
    }
    for (const name of names) {
      captured.add(name);
      await page.screenshot({ path: `docs/screenshots/campaign-${name}.png` });
    }
    const dt = Math.max(1 / 60, s.time - previous);
    previous = s.time;
    await driver.apply(pilot.decide(s, dt), s);
    await page.waitForTimeout(90);
  }
  await driver.release();
  expect(last.status, JSON.stringify(last)).toBe("victory");
  expect([...levels]).toEqual([0, 1, 2]);
  expect([...water]).toEqual([0, 1, 2]);
  expect([...phases]).toEqual([0, 1, 2]);
  await page.screenshot({ path: "docs/screenshots/10-victory.png" });
  expect(errors).toEqual([]);
  expect(networkFailures).toEqual([]);
  frames.sort((a, b) => a - b);
  await testInfo.attach("campaign-evidence", {
    body: JSON.stringify(
      {
        seconds: last.time,
        levels: [...levels],
        water: [...water],
        phases: [...phases],
        medianFrameMs: frames[Math.floor(frames.length * 0.5)],
        p95FrameMs: frames[Math.floor(frames.length * 0.95)],
        errors,
        networkFailures,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("synthetic standard gamepad: menus, shoulder jet, twin-stick strafe, trigger fire, disconnect pause", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      id: "Synthetic standard gamepad — NOT physical hardware",
      index: 0,
      connected: true,
      mapping: "standard",
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({
        pressed: false,
        touched: false,
        value: 0,
      })),
    };
    (window as any).__testPad = pad;
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad] });
  });
  await page.goto("/?diagnostics");
  const button = async (n: number, on: boolean) => {
    await page.evaluate(
      ({ n, on }) => {
        const b = (window as any).__testPad.buttons[n];
        b.pressed = on;
        b.value = on ? 1 : 0;
      },
      { n, on },
    );
    await page.waitForTimeout(80);
  };
  await button(0, true);
  await button(0, false);
  await expect(page.locator("#menu")).toBeHidden();
  await page.evaluate(() => {
    (window as any).__testPad.axes = [-0.8, 0, 0, -1];
  });
  await button(4, true);
  await button(7, true);
  await page.waitForTimeout(500);
  let s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
  expect(s.device).toBe("gamepad");
  expect(s.player.aim).toBeCloseTo(Math.PI / 2);
  expect(s.player.y).toBeGreaterThan(2);
  expect(s.player.heat).toBeGreaterThan(0);
  await page.screenshot({ path: "docs/screenshots/11-synthetic-gamepad.png" });
  await button(4, false);
  await button(7, false);
  await page.evaluate(() => {
    (window as any).__testPad.connected = false;
    dispatchEvent(new Event("gamepaddisconnected"));
  });
  await expect(
    page.getByRole("button", { name: "Resume rescue" }),
  ).toBeVisible();
});

test("settings persist, keyboard-only guide navigation, resize and nested-path production assets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/brinewake/?diagnostics");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Mute all audio").check();
  await page.getByLabel("Reduce flashes and motion").check();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Mute all audio")).toBeChecked();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Begin rescue" }).click();
  await page.setViewportSize({ width: 900, height: 700 });
  await page.mouse.move(220, 300);
  await page.waitForTimeout(150);
  let s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
  expect(Number.isFinite(s.player.aim)).toBe(true);
  await page.keyboard.press("KeyH");
  await expect(
    page.getByRole("heading", { name: "A sealed hull. A steady hand." }),
  ).toBeVisible();
  await page.keyboard.press("KeyH");
  await page.screenshot({ path: "docs/screenshots/12-compact-viewport.png" });
  expect(errors).toEqual([]);
});

test("takes real enemy damage, repairs, loses hull and restarts at a valid checkpoint", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/?diagnostics");
  await page.getByRole("button", { name: "Begin rescue" }).click();
  const driver = new BrowserDriver(page),
    pilot = new Pilot();
  let lastTime = 0,
    s: any;
  for (let n = 0; n < 350; n++) {
    s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
    if (s.player.x > 44) break;
    const i = pilot.decide(
      { ...s, enemies: [] },
      Math.max(0.016, s.time - lastTime),
    );
    lastTime = s.time;
    i.primary = false;
    i.secondary = false;
    i.missilePressed = false;
    await driver.apply(i, s);
    await page.waitForTimeout(100);
  }
  await driver.release();
  await expect
    .poll(
      async () => {
        s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
        return s.player.hp;
      },
      { timeout: 30000 },
    )
    .toBeLessThan(100);
  await page.keyboard.press("KeyQ");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "docs/screenshots/13-field-patch.png" });
  await expect
    .poll(
      async () => {
        s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
        return s.status;
      },
      { timeout: 90000 },
    )
    .toBe("dead");
  await page.screenshot({ path: "docs/screenshots/14-hull-offline.png" });
  await page.getByRole("button", { name: "Return to checkpoint" }).click();
  s = await page.evaluate(() => window.__BRINEWAKE__.snapshot());
  expect(s.player.hp).toBe(100);
  expect(s.status).toBe("playing");
  expect(s.player.x).toBeCloseTo(s.checkpoint.x, 0);
});
