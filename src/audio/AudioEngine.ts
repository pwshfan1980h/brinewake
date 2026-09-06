import type { Settings } from "../input/InputManager";
import type { GameEvent } from "../sim/types";
export class AudioEngine {
  ctx?: AudioContext;
  master?: GainNode;
  sfx?: GainNode;
  music?: GainNode;
  filter?: BiquadFilterNode;
  voices = 0;
  beat = 0;
  timer = 0;
  ambient?: OscillatorNode;
  started = false;
  constructor(public settings: Settings) {}
  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended")
        void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const c = (this.ctx = new AudioContext());
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.filter = c.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 17000;
      this.filter.connect(this.master);
      this.sfx = c.createGain();
      this.sfx.connect(this.filter);
      this.music = c.createGain();
      this.music.connect(this.filter);
      this.started = true;
      this.update(false, 0, false, 0);
      void c.resume().catch(() => {});
    } catch {
      /* Silent mode remains fully playable. */
    }
  }
  tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    end?: number,
    music = false,
  ) {
    if (!this.ctx || this.voices > 28 || this.ctx.state !== "running") return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (end)
      o.frequency.exponentialRampToValueAtTime(
        Math.max(20, end),
        c.currentTime + duration,
      );
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      c.currentTime + 0.012,
    );
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(music ? this.music! : this.sfx!);
    o.start();
    o.stop(c.currentTime + duration + 0.02);
    this.voices++;
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      this.voices--;
    };
  }
  noise(duration: number, volume: number, freq = 700) {
    if (!this.ctx || this.voices > 28) return;
    const c = this.ctx,
      b = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate),
      data = b.getChannelData(0);
    for (let n = 0; n < data.length; n++)
      data[n] = (Math.random() * 2 - 1) * (1 - n / data.length);
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = b;
    filter.type = "bandpass";
    filter.frequency.value = freq;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx!);
    source.start();
    this.voices++;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.voices--;
    };
  }
  event(e: GameEvent) {
    switch (e.type) {
      case "rivet":
        this.tone(230, 0.07, 0.07, "square", 65);
        this.noise(0.07, 0.08, 2200);
        break;
      case "arc":
        this.tone(1500, 0.35, 0.12, "sawtooth", 80);
        break;
      case "pod":
        this.tone(140, 0.5, 0.1, "sawtooth", 650);
        break;
      case "explosion":
      case "bossDefeat":
        this.noise(0.65, 0.23, 220);
        this.tone(95, 0.4, 0.14, "sine", 30);
        break;
      case "splash":
        this.noise(0.35, 0.11, 650);
        break;
      case "land":
        this.tone(85, 0.13, 0.09, "triangle", 40);
        this.noise(0.1, 0.06, 300);
        break;
      case "dash":
        this.noise(0.25, 0.09, 1300);
        this.tone(100, 0.2, 0.07, "sawtooth", 500);
        break;
      case "lock":
        this.tone(780, 0.1, 0.025, "sine", 900);
        break;
      case "hit":
        this.noise(0.12, 0.12, 500);
        break;
      case "repair":
        this.tone(400, 1.2, 0.03, "triangle", 850);
        this.noise(0.8, 0.035, 1800);
        break;
      case "checkpoint":
      case "repaired":
      case "coreOpen":
        for (let n = 0; n < 3; n++)
          this.tone([440, 554, 660][n], 0.55 + n * 0.15, 0.035, "sine");
        break;
      case "bossEnter":
      case "bossAttack":
        this.tone(60, 0.7, 0.14, "sawtooth", 38);
        break;
      case "victory":
        for (const f of [220, 330, 440, 554]) this.tone(f, 2, 0.04, "sine");
        break;
    }
  }
  update(wet: boolean, intensity: number, paused: boolean, dt: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master!.gain.setTargetAtTime(
      this.settings.mute ? 0 : this.settings.master * (paused ? 0.35 : 1),
      t,
      0.1,
    );
    this.sfx!.gain.setTargetAtTime(this.settings.effects, t, 0.1);
    this.music!.gain.setTargetAtTime(this.settings.music, t, 0.1);
    this.filter!.frequency.setTargetAtTime(wet ? 850 : 17000, t, 0.25);
    if (paused) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.4;
      this.beat++;
      const notes = [110, 0, 165, 0, 146.83, 0, 130.81, 164.81];
      const f = notes[this.beat % 8];
      if (f) this.tone(f, 0.6, 0.035, "triangle", undefined, true);
      if (this.beat % 4 === 0) {
        this.tone(
          [220, 261.63, 293.66, 329.63][Math.floor(this.beat / 8) % 4],
          2.4,
          0.016,
          "sine",
          undefined,
          true,
        );
        this.tone(55, 0.15, 0.035 + intensity * 0.025, "sine", 28, true);
      }
      if (intensity > 0.3 && this.beat % 2 === 0)
        this.tone(85, 0.08, 0.025, "triangle", 40, true);
      if (this.beat % 8 === 0) this.noise(1.5, 0.018, wet ? 160 : 450);
    }
  }
}
