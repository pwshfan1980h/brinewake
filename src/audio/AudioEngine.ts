import type { Settings } from "../input/InputManager";
import type { GameEvent } from "../sim/types";
import { impacts, MAX_VOICES, safetyCurve, type ImpactLayer } from "./impact";
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
  private noiseBuffer?: AudioBuffer;
  private safety?: WaveShaperNode;
  private controls = "";
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
      // Zero-latency soft saturation bounds overlapping impacts before volume.
      this.safety = c.createWaveShaper();
      this.safety.curve = safetyCurve();
      this.filter.connect(this.safety);
      this.safety.connect(this.master);
      this.master.gain.value = 0;
      this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
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
    this.layer(
      {
        wave: type,
        frequency: freq,
        duration,
        gain: volume,
        end,
        attack: music ? 0.012 : 0.003,
      },
      music,
    );
  }
  noise(duration: number, volume: number, freq = 700) {
    this.layer({ noise: "bandpass", frequency: freq, duration, gain: volume });
  }
  footstep(frequency = 100): void {
    this.impact("footstep", Math.max(0.75, Math.min(1.25, frequency / 100)));
  }
  private impact(name: string, pitch = 1) {
    const layers = impacts[name];
    // Reserve a complete sound, not a stray transient under saturation.
    if (!layers || this.voices + layers.length > MAX_VOICES) return;
    const at = this.ctx?.currentTime ?? 0;
    for (const layer of layers)
      this.layer(
        {
          ...layer,
          frequency: layer.frequency * pitch,
          end: layer.end === undefined ? undefined : layer.end * pitch,
        },
        false,
        at,
      );
  }
  private layer(
    layer: ImpactLayer,
    music = false,
    at = this.ctx?.currentTime ?? 0,
  ) {
    if (
      !this.ctx ||
      this.ctx.state !== "running" ||
      this.voices >= MAX_VOICES ||
      this.settings.mute ||
      (music ? this.settings.music : this.settings.effects) <= 0 ||
      !Number.isFinite(layer.duration) ||
      layer.duration <= 0 ||
      !Number.isFinite(layer.frequency) ||
      layer.frequency <= 0 ||
      !Number.isFinite(layer.gain) ||
      layer.gain <= 0
    )
      return;
    const c = this.ctx;
    const start = at + (layer.delay ?? 0);
    const duration = Math.min(10, layer.duration);
    const finish = start + duration;
    const gain = c.createGain();
    const source = layer.noise ? c.createBufferSource() : c.createOscillator();
    let filter: BiquadFilterNode | undefined;
    let frequency: AudioParam;
    if (layer.noise) {
      const noise = source as AudioBufferSourceNode;
      noise.buffer = this.noiseBuffer!;
      noise.loop = true;
      filter = c.createBiquadFilter();
      filter.type = layer.noise;
      filter.Q.value = layer.q ?? 0.7;
      source.connect(filter);
      filter.connect(gain);
      frequency = filter.frequency;
    } else {
      const oscillator = source as OscillatorNode;
      oscillator.type = layer.wave ?? "sine";
      frequency = oscillator.frequency;
      source.connect(gain);
    }
    const safeFrequency = (f: number) =>
      Math.max(20, Math.min(c.sampleRate * 0.45, f));
    frequency.setValueAtTime(safeFrequency(layer.frequency), start);
    if (layer.end !== undefined && Number.isFinite(layer.end))
      frequency.exponentialRampToValueAtTime(safeFrequency(layer.end), finish);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(
      Math.min(0.5, layer.gain),
      start + Math.min(layer.attack ?? 0.002, duration * 0.3),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, finish);
    gain.gain.linearRampToValueAtTime(0, finish + 0.008);
    gain.connect(music ? this.music! : this.sfx!);
    this.voices++;
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      gain.disconnect();
      source.onended = null;
      this.voices--;
    };
    if (layer.noise)
      (source as AudioBufferSourceNode).start(start, Math.random());
    else source.start(start);
    source.stop(finish + 0.01);
  }
  event(e: GameEvent) {
    switch (e.type) {
      case "rivet":
      case "arc":
      case "pod":
      case "explosion":
      case "land":
        this.impact(e.type);
        break;
      case "bossDefeat":
        this.impact("explosion", 0.8);
        break;
      case "splash":
        this.noise(0.35, 0.11, 650);
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
    const controls = [
      this.settings.mute,
      this.settings.master,
      this.settings.effects,
      this.settings.music,
      paused,
      wet,
    ].join(":");
    // Do not append automation events at render-frame frequency.
    if (controls !== this.controls) {
      this.controls = controls;
      const level = (v: number) =>
        Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
      this.master!.gain.setTargetAtTime(
        this.settings.mute
          ? 0
          : level(this.settings.master) * (paused ? 0.35 : 1),
        t,
        0.1,
      );
      this.sfx!.gain.setTargetAtTime(level(this.settings.effects), t, 0.1);
      this.music!.gain.setTargetAtTime(level(this.settings.music), t, 0.1);
      this.filter!.frequency.setTargetAtTime(wet ? 850 : 17000, t, 0.25);
    }
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
