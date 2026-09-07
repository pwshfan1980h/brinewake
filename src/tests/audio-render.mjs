// Real Chromium OfflineAudioContext QA; no playback/listening is implied.
// Run: node src/tests/audio-render.mjs
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  const results = await page.evaluate(async () => {
    const { AudioEngine } = await import("/src/audio/AudioEngine.ts");
    const { defaultSettings } = await import("/src/input/InputManager.ts");
    const native = window.AudioContext;
    const results = [];
    try {
      for (const type of ["rivet", "arc", "pod", "explosion", "footstep", "barrage", "muted"]) {
        const context = new OfflineAudioContext(1, 96000, 48000);
        // The engine checks real-time transport state. Offline rendering is
        // scheduled while suspended; adapt only that gate and resume method.
        Object.defineProperty(context, "state", { get: () => "running" });
        context.resume = async () => {};
        window.AudioContext = function () { return context; };
        const engine = new AudioEngine({ ...defaultSettings, master: 1, effects: 1, music: 0, mute: type === "muted" });
        engine.start();
        engine.master.gain.cancelScheduledValues(0);
        engine.master.gain.setValueAtTime(type === "muted" ? 0 : 1, 0);
        engine.sfx.gain.cancelScheduledValues(0);
        engine.sfx.gain.setValueAtTime(1, 0);
        if (type === "footstep") engine.footstep();
        else if (type === "barrage") {
          for (let i = 0; i < 100; i++) engine.event({ type: "explosion", x: 0, y: 0 });
        } else engine.event({ type: type === "muted" ? "explosion" : type, x: 0, y: 0 });
        const scheduled = engine.voices;
        const rendered = await context.startRendering();
        await new Promise(resolve => setTimeout(resolve, 0));
        const data = rendered.getChannelData(0);
        let peak = 0, power = 0, tailPeak = 0;
        for (let i = 0; i < data.length; i++) {
          peak = Math.max(peak, Math.abs(data[i]));
          power += data[i] * data[i];
          if (i > 72000) tailPeak = Math.max(tailPeak, Math.abs(data[i]));
        }
        results.push({ type, peak, rms: Math.sqrt(power / data.length), tailPeak, scheduled, remaining: engine.voices });
      }
    } finally { window.AudioContext = native; }
    return results;
  });
  for (const result of results) {
    assert(Number.isFinite(result.peak));
    assert(result.peak < 0.85, `${result.type}: output exceeded headroom`);
    assert(result.tailPeak < 0.00001, `${result.type}: unexpected lingering audio`);
    assert.equal(result.remaining, 0, `${result.type}: source cleanup`);
    assert(result.scheduled <= 32);
    if (result.type === "muted") assert.equal(result.peak, 0);
    else assert(result.peak > 0.01, `${result.type}: unexpectedly silent`);
  }
  console.table(results);
  console.log("PASS: real Web Audio renders are finite, bounded, non-silent, and clean up; mute renders silence.");
} finally {
  await browser?.close();
  await server.close();
}
