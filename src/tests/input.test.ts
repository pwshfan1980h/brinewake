import { describe, it, expect, vi, afterEach } from "vitest";
import { InputBuffer } from "../input/InputBuffer";
import { neutralInput } from "../sim/types";
import { InputManager, defaultSettings } from "../input/InputManager";
afterEach(() => vi.unstubAllGlobals());
function manager() {
  const win = new EventTarget(),
    canvas = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("HTMLInputElement", class {});
  vi.stubGlobal("HTMLSelectElement", class {});
  vi.stubGlobal("navigator", { getGamepads: () => [] });
  const input = new InputManager(canvas as HTMLCanvasElement, {
    ...defaultSettings,
  });
  input.menuOpen = false;
  return { input, win, canvas };
}
describe("fixed tick input delivery", () => {
  it.each([120, 144, 240])("preserves all edge actions at %i Hz", (hz) => {
    const b = new InputBuffer();
    let accumulator = 0,
      received = 0;
    for (let frame = 0; frame < hz; frame++) {
      b.push({
        ...neutralInput(),
        jumpPressed: frame === 0,
        dashPressed: frame === 0,
        repairPressed: frame === 0,
        missilePressed: frame === 0,
      });
      accumulator += 1 / hz;
      while (accumulator >= 1 / 60) {
        const i = b.consume();
        if (i.jumpPressed) {
          expect(i.dashPressed && i.repairPressed && i.missilePressed).toBe(
            true,
          );
          received++;
        }
        accumulator -= 1 / 60;
      }
    }
    expect(received).toBe(1);
  });
  it("retains latest analog intent and releases held actions on clear", () => {
    const b = new InputBuffer();
    b.push({ ...neutralInput(), primary: true, moveX: 1 });
    b.push({ ...neutralInput(), moveX: -1 });
    expect(b.consume().moveX).toBe(-1);
    b.push({ ...neutralInput(), dashPressed: true });
    b.clear();
    expect(b.consume()).toEqual(neutralInput());
  });
  it("keeps corrected legacy mouse mapping through actual pointer events", () => {
    const { input, canvas } = manager();
    canvas.dispatchEvent(
      Object.assign(new Event("pointerdown"), { button: 2 }),
    );
    let i = input.sample(0, 0, { x: 3, y: 0 });
    expect(i.primary).toBe(true);
    expect(i.secondary).toBe(false);
    canvas.dispatchEvent(
      Object.assign(new Event("pointerdown"), { button: 0 }),
    );
    i = input.sample(0, 0, { x: 3, y: 0 });
    expect(i.secondary).toBe(true);
  });
  it("maps a synthetic standard controller with direct right-stick aim", () => {
    const { input } = manager();
    const buttons = Array.from({ length: 17 }, (_, n) => ({
      pressed: n === 7 || n === 4,
      value: n === 7 || n === 4 ? 1 : 0,
    }));
    vi.stubGlobal("navigator", {
      getGamepads: () => [
        {
          connected: true,
          id: "Test standard controller",
          axes: [-0.8, 0, 0, -1],
          buttons,
        },
      ],
    });
    const i = input.sample(2, 1, { x: 5, y: 0 });
    expect(i.primary).toBe(true);
    expect(i.secondary).toBe(false);
    expect(i.jumpPressed).toBe(true);
    expect(i.moveX).toBeLessThan(-0.6);
    expect(i.aim).toBeCloseTo(Math.PI / 2);
    expect(input.sample(2, 1, { x: 5, y: 0 }).jumpPressed).toBe(false);
  });
  it("pauses and clears held actions on blur and controller disconnect", () => {
    const { input, win } = manager();
    const pause = vi.fn();
    input.onPause = pause;
    input.keys.add("Space");
    input.mouse.right = true;
    win.dispatchEvent(new Event("blur"));
    expect(pause).toHaveBeenCalledOnce();
    expect(input.keys.size).toBe(0);
    expect(input.mouse.right).toBe(false);
    input.menuOpen = false;
    win.dispatchEvent(new Event("gamepaddisconnected"));
    expect(pause).toHaveBeenCalledTimes(2);
  });
});

it("consumes menu acceptance without leaking jump into play", () => {
  const { input } = manager();
  input.menuOpen = true;
  const pad = {
    connected: true,
    id: "Test",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, n) => ({
      pressed: n === 0,
      value: n === 0 ? 1 : 0,
    })),
  };
  vi.stubGlobal("navigator", { getGamepads: () => [pad] });
  input.onMenu = () => {
    input.menuOpen = false;
    input.clear();
  };
  expect(input.sample(0, 0, { x: 0, y: 0 }).jumpPressed).toBe(false);
  expect(input.sample(0, 0, { x: 0, y: 0 }).jump).toBe(false);
  pad.buttons[0].pressed = false;
  pad.buttons[0].value = 0;
  input.sample(0, 0, { x: 0, y: 0 });
  pad.buttons[4].pressed = true;
  pad.buttons[4].value = 1;
  expect(input.sample(0, 0, { x: 0, y: 0 }).jumpPressed).toBe(true);
});

import { backDestination } from "../ui/menu";
it("routes controller Back by the current screen without stale-parent leaks", () => {
  expect(backDestination("pause", "title")).toBe("hidden");
  expect(backDestination("title", "hidden")).toBeUndefined();
  expect(backDestination("dead", "hidden")).toBeUndefined();
  expect(backDestination("victory", "hidden")).toBeUndefined();
  expect(backDestination("settings", "pause")).toBe("pause");
  expect(backDestination("guide", "hidden")).toBe("hidden");
});
it("uses native Tab navigation and cancels native Enter after custom activation", () => {
  const { input, win } = manager();
  input.menuOpen = true;
  const menu = vi.fn();
  input.onMenu = menu;
  const tab = Object.assign(new Event("keydown", { cancelable: true }), {
    code: "Tab",
  });
  win.dispatchEvent(tab);
  expect(tab.defaultPrevented).toBe(false);
  expect(menu).not.toHaveBeenCalled();
  const enter = Object.assign(new Event("keydown", { cancelable: true }), {
    code: "Enter",
  });
  win.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(true);
  expect(menu).toHaveBeenCalledExactlyOnceWith("select");
});
