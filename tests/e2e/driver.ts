import type { Page } from "@playwright/test";
export class BrowserDriver {
  held = new Set<string>();
  mouse = new Set<"left" | "right">();
  constructor(public page: Page) {}
  async apply(i: any, s: any) {
    const next = new Set<string>();
    if (i.moveX > 0.1) next.add("KeyD");
    if (i.moveX < -0.1) next.add("KeyA");
    if (i.moveY > 0.1) next.add("KeyW");
    if (i.moveY < -0.1) next.add("KeyS");
    if (i.jump) next.add("Space");
    if (i.interact) next.add("KeyF");
    for (const key of this.held)
      if (!next.has(key)) await this.page.keyboard.up(key);
    for (const key of next)
      if (!this.held.has(key)) await this.page.keyboard.down(key);
    this.held = next;
    const target = await this.page.evaluate(
      ({ x, y }) => window.__BRINEWAKE__.screen(x, y),
      {
        x: s.player.x + Math.cos(i.aim) * 8,
        y: s.player.y + 0.3 + Math.sin(i.aim) * 8,
      },
    );
    await this.page.mouse.move(target.x, target.y);
    for (const [button, active] of [
      ["right", i.primary],
      ["left", i.secondary],
    ] as const) {
      if (active && !this.mouse.has(button)) {
        await this.page.mouse.down({ button });
        this.mouse.add(button);
      } else if (!active && this.mouse.has(button)) {
        await this.page.mouse.up({ button });
        this.mouse.delete(button);
      }
    }
    for (const [key, active] of [
      ["ShiftLeft", i.dashPressed],
      ["KeyE", i.missilePressed],
      ["KeyQ", i.repairPressed],
    ] as const)
      if (active) await this.page.keyboard.press(key);
  }
  async release() {
    for (const k of this.held) await this.page.keyboard.up(k);
    this.held.clear();
    for (const b of this.mouse) await this.page.mouse.up({ button: b });
    this.mouse.clear();
  }
}
declare global {
  interface Window {
    __BRINEWAKE__: {
      snapshot: () => any;
      screen: (x: number, y: number) => { x: number; y: number };
    };
  }
}
