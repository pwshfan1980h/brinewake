import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "../audio/AudioEngine";
import {
  impacts,
  MAX_VOICES,
  OUTPUT_CEILING,
  safetyCurve,
} from "../audio/impact";
import { defaultSettings } from "../input/InputManager";

class Param {
  value = 0;
  setValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
  buffer?: unknown;
  loop = false;
}
class Context {
  currentTime = 2;
  sampleRate = 48000;
  state = "running";
  destination = new Node();
  nodes: Node[] = [];
  sources: Node[] = [];
  resume = vi.fn(async () => {});
  node() {
    const n = new Node();
    this.nodes.push(n);
    return n;
  }
  source() {
    const n = this.node();
    this.sources.push(n);
    return n;
  }
  createGain = () => this.node();
  createWaveShaper = () => this.node();
  createBiquadFilter = () => this.node();
  createOscillator = () => this.source();
  createBufferSource = () => this.source();
  createBuffer = vi.fn((_channels: number, frames: number) => ({
    getChannelData: () => new Float32Array(frames),
  }));
}
function setup() {
  vi.stubGlobal("AudioContext", Context);
  const engine = new AudioEngine({ ...defaultSettings, music: 0 });
  engine.start();
  return { engine, ctx: engine.ctx as unknown as Context };
}
afterEach(() => vi.unstubAllGlobals());
describe("procedural combat audio", () => {
  it.each(["rivet", "arc", "pod", "explosion", "land"])(
    "layers and cleans up %s",
    (type) => {
      const { engine, ctx } = setup();
      const baseline = ctx.nodes.length;
      engine.event({ type, x: 0, y: 0 });
      expect(engine.voices).toBe(impacts[type].length);
      for (const source of ctx.sources) {
        expect(source.start).toHaveBeenCalledOnce();
        expect(source.stop).toHaveBeenCalledOnce();
        expect(source.stop.mock.calls[0][0]).toBeGreaterThan(
          source.start.mock.calls[0][0],
        );
        source.onended!();
      }
      expect(engine.voices).toBe(0);
      for (const node of ctx.nodes.slice(baseline))
        expect(node.disconnect).toHaveBeenCalledOnce();
    },
  );
  it("caps dense barrages and reuses one noise buffer", () => {
    const { engine, ctx } = setup();
    for (let i = 0; i < 200; i++)
      engine.event({ type: "explosion", x: 0, y: 0 });
    expect(engine.voices).toBe(MAX_VOICES);
    expect(ctx.createBuffer).toHaveBeenCalledOnce();
    for (const source of ctx.sources) source.onended!();
    expect(engine.voices).toBe(0);
    engine.event({ type: "rivet", x: 0, y: 0 });
    expect(engine.voices).toBe(4);
  });
  it("does not allocate while suspended, muted, or effects disabled", () => {
    const { engine, ctx } = setup();
    const count = ctx.nodes.length;
    ctx.state = "suspended";
    engine.noise(0.2, 0.2);
    engine.footstep();
    ctx.state = "running";
    engine.settings.mute = true;
    engine.event({ type: "pod", x: 0, y: 0 });
    engine.settings.mute = false;
    engine.settings.effects = 0;
    engine.tone(100, 0.1, 0.1);
    expect(ctx.nodes.length).toBe(count);
  });
  it("keeps metallic footfalls distinct from the public tone API", () => {
    const { engine, ctx } = setup();
    engine.footstep(125);
    expect(engine.voices).toBe(4);
    expect(ctx.sources[0].frequency.setValueAtTime).toHaveBeenCalledWith(
      131.25,
      2,
    );
    engine.tone(100, 0.06, 0.035, "triangle", 40);
    expect(engine.voices).toBe(5);
  });
  it("does not allocate nodes or automation for unchanged render updates", () => {
    const { engine, ctx } = setup();
    engine.update(true, 0, true, 0);
    const nodes = ctx.nodes.length;
    const master = engine.master!.gain as unknown as Param;
    const calls = master.setTargetAtTime.mock.calls.length;
    for (let i = 0; i < 10000; i++) engine.update(true, 0, true, 1 / 60);
    expect(ctx.nodes.length).toBe(nodes);
    expect(master.setTargetAtTime).toHaveBeenCalledTimes(calls);
    expect(engine.filter!.frequency.setTargetAtTime).toHaveBeenLastCalledWith(
      850,
      2,
      0.25,
    );
    engine.settings.mute = true;
    engine.update(false, 0, true, 0);
    expect(master.setTargetAtTime).toHaveBeenLastCalledWith(0, 2, 0.1);
  });
  it("bounds the saturator, preserves silence, and avoids discontinuities", () => {
    const curve = safetyCurve();
    expect(curve[2048]).toBe(0);
    for (let i = 0; i < curve.length; i++) {
      expect(Math.abs(curve[i])).toBeLessThan(OUTPUT_CEILING);
      if (i) expect(curve[i] - curve[i - 1]).toBeGreaterThanOrEqual(0);
    }
  });
});
