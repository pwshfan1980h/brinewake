import { neutralInput, type Input } from "../sim/types";
import { stickAim, aimAt } from "../sim/aim";
export type Device = "keyboard" | "gamepad";
export interface Settings {
  master: number;
  music: number;
  effects: number;
  mute: boolean;
  lowEffects: boolean;
  reducedMotion: boolean;
  deadzone: number;
  doubleTap: boolean;
  padPreset: "shoulder" | "classic";
}
export const defaultSettings: Settings = {
  master: 0.65,
  music: 0.35,
  effects: 0.65,
  mute: false,
  lowEffects: false,
  reducedMotion: false,
  deadzone: 0.2,
  doubleTap: false,
  padPreset: "shoulder",
};
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem("brinewake.settings.v1") || "{}");
    const r = { ...defaultSettings };
    for (const k of ["master", "music", "effects", "deadzone"] as const)
      if (Number.isFinite(s[k]))
        r[k] = Math.max(
          k === "deadzone" ? 0.1 : 0,
          Math.min(k === "deadzone" ? 0.4 : 1, s[k]),
        );
    for (const k of [
      "mute",
      "lowEffects",
      "reducedMotion",
      "doubleTap",
    ] as const)
      if (typeof s[k] === "boolean") r[k] = s[k];
    if (s.padPreset === "classic") r.padPreset = "classic";
    return r;
  } catch {
    return { ...defaultSettings };
  }
}
export class DeviceHandoff {
  device: Device = "keyboard";
  last = -Infinity;
  use(device: Device, time: number, meaningful: boolean) {
    if (meaningful && (device === this.device || time - this.last > 0.25)) {
      this.device = device;
      this.last = time;
    }
    return this.device;
  }
}
export class InputManager {
  keys = new Set<string>();
  pressed = new Set<string>();
  mouse = { x: 0, y: 0, active: false, left: false, right: false };
  handoff = new DeviceHandoff();
  padId = "";
  lastPad: boolean[] = [];
  padConnected = false;
  lastTap = { code: "", time: 0 };
  surge = false;
  aim = 0;
  suppressPad = false;
  onPause = () => {};
  onGuide = () => {};
  onGesture = () => {};
  onMenu = (action: string) => {};
  menuOpen = true;
  constructor(
    public canvas: HTMLCanvasElement,
    public settings: Settings,
  ) {
    window.addEventListener("keydown", (e) => {
      const formControl =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        ) &&
        !formControl
      )
        e.preventDefault();
      this.onGesture();
      if (e.repeat) return;
      this.handoff.use("keyboard", performance.now() / 1000, true);
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (e.code === "Escape") {
        this.onPause();
        return;
      }
      if (e.code === "KeyH") {
        this.onGuide();
        return;
      }
      if (this.menuOpen) {
        if (formControl || e.code === "Tab") return;
        if (
          ["Enter", "Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(
            e.code,
          )
        )
          e.preventDefault();
        if (["ArrowDown", "KeyS"].includes(e.code)) this.onMenu("next");
        if (["ArrowUp", "KeyW"].includes(e.code)) this.onMenu("prev");
        if (["Enter", "Space"].includes(e.code)) this.onMenu("select");
      }
      const now = performance.now();
      if (this.settings.doubleTap && ["KeyA", "KeyD"].includes(e.code)) {
        if (this.lastTap.code === e.code && now - this.lastTap.time < 260)
          this.surge = true;
        this.lastTap = { code: e.code, time: now };
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    canvas.addEventListener("pointermove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
      this.handoff.use(
        "keyboard",
        performance.now() / 1000,
        Math.abs(e.movementX) + Math.abs(e.movementY) > 1,
      );
    });
    canvas.addEventListener("pointerdown", (e) => {
      this.onGesture();
      this.handoff.use("keyboard", performance.now() / 1000, true);
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    });
    window.addEventListener("pointerup", (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("blur", () => {
      this.clear();
      if (!this.menuOpen) this.onPause();
    });
    window.addEventListener("gamepaddisconnected", () => {
      this.padConnected = false;
      this.padId = "";
      this.clear();
      if (!this.menuOpen) this.onPause();
    });
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.mouse.left = this.mouse.right = false;
    this.surge = false;
    this.lastPad = [];
    this.suppressPad = true;
  }
  sample(px: number, py: number, worldMouse: { x: number; y: number }): Input {
    const wasMenu = this.menuOpen;
    const i = neutralInput(),
      k = this.keys;
    const gamepads = navigator.getGamepads?.() || [];
    const pad = Array.from(gamepads).find((p) => p?.connected);
    const time = performance.now() / 1000;
    if (pad) {
      this.padConnected = true;
      this.padId = pad.id;
      const b = pad.buttons.map((b) => b.pressed || b.value > 0.5),
        edge = (n: number) => !!b[n] && !this.lastPad[n];
      this.handoff.use(
        "gamepad",
        time,
        pad.axes.some((a) => Math.abs(a) > 0.25) || b.some(Boolean),
      );
      if (edge(9)) this.onPause();
      if (edge(8)) this.onGuide();
      if (this.menuOpen) {
        if (edge(13) || (pad.axes[1] > 0.6 && !this.lastPad[20]))
          this.onMenu("next");
        if (edge(12) || (pad.axes[1] < -0.6 && !this.lastPad[21]))
          this.onMenu("prev");
        if (edge(0)) this.onMenu("select");
        if (edge(1)) this.onMenu("back");
        if (edge(14)) this.onMenu("decrease");
        if (edge(15)) this.onMenu("increase");
      }
      if (!b.some(Boolean)) this.suppressPad = false;
      if (this.handoff.device === "gamepad" && !this.suppressPad) {
        const x = pad.axes[0] || 0,
          y = -(pad.axes[1] || 0),
          d = this.settings.deadzone,
          n = Math.hypot(x, y);
        const scale = n > d ? (Math.min(1, n) - d) / ((1 - d) * n) : 0;
        i.moveX = x * scale;
        i.moveY = y * scale;
        this.aim = stickAim(pad.axes[2] || 0, pad.axes[3] || 0, this.aim, d);
        const jump = this.settings.padPreset === "shoulder" ? 4 : 0;
        i.jump = !!b[jump] || !!b[0];
        i.jumpPressed = edge(jump) || edge(0);
        i.dashPressed = edge(5);
        i.primary = !!b[7];
        i.secondary = !!b[6];
        i.missilePressed = edge(1);
        i.repairPressed = edge(3);
        i.interact = !!b[2];
      }
      this.lastPad = b;
      this.lastPad[20] = pad.axes[1] > 0.6;
      this.lastPad[21] = pad.axes[1] < -0.6;
      if (b.some(Boolean)) this.onGesture();
    }
    if (this.handoff.device === "keyboard") {
      i.moveX =
        (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
        (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      i.moveY =
        (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
        (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
      i.jump = k.has("Space") || k.has("KeyW");
      i.jumpPressed = this.pressed.has("Space") || this.pressed.has("KeyW");
      i.dashPressed =
        this.pressed.has("ShiftLeft") ||
        this.pressed.has("ShiftRight") ||
        this.surge;
      i.primary = this.mouse.right;
      i.secondary = this.mouse.left;
      i.missilePressed = this.pressed.has("KeyE");
      i.repairPressed = this.pressed.has("KeyQ");
      i.interact = k.has("KeyF");
      if (this.mouse.active)
        this.aim = aimAt(px, py + 0.3, worldMouse.x, worldMouse.y, this.aim);
    }
    i.aim = this.aim;
    this.pressed.clear();
    this.surge = false;
    return wasMenu || this.menuOpen ? { ...neutralInput(), aim: this.aim } : i;
  }
  vibrate() {
    const p = Array.from(navigator.getGamepads?.() || []).find(
      (p) => p?.connected,
    );
    const a = (p as any)?.vibrationActuator;
    if (a?.playEffect)
      a.playEffect("dual-rumble", {
        duration: 90,
        weakMagnitude: 0.18,
        strongMagnitude: 0.12,
      }).catch(() => {});
  }
}
