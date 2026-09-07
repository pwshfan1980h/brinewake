// Original procedural impact recipes: no samples or external audio assets.
export interface ImpactLayer {
  wave?: OscillatorType;
  noise?: BiquadFilterType;
  frequency: number;
  end?: number;
  duration: number;
  gain: number;
  attack?: number;
  delay?: number;
  q?: number;
}
export const MAX_VOICES = 32;
export const OUTPUT_CEILING = 0.85;
export function safetyCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(4097);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = OUTPUT_CEILING * Math.tanh(x / OUTPUT_CEILING);
  }
  return curve;
}
export const impacts: Record<string, readonly ImpactLayer[]> = {
  rivet: [
    {
      noise: "highpass",
      frequency: 2700,
      duration: 0.025,
      gain: 0.18,
      attack: 0.001,
    },
    { wave: "triangle", frequency: 210, end: 52, duration: 0.12, gain: 0.22 },
    {
      noise: "bandpass",
      frequency: 1150,
      end: 480,
      duration: 0.11,
      gain: 0.1,
      delay: 0.009,
    },
    {
      wave: "sine",
      frequency: 1780,
      end: 1350,
      duration: 0.065,
      gain: 0.035,
      delay: 0.017,
    },
  ],
  arc: [
    {
      noise: "highpass",
      frequency: 3600,
      duration: 0.04,
      gain: 0.16,
      attack: 0.001,
    },
    {
      wave: "sawtooth",
      frequency: 1150,
      end: 140,
      duration: 0.24,
      gain: 0.095,
    },
    { wave: "sine", frequency: 170, end: 45, duration: 0.19, gain: 0.22 },
    {
      noise: "bandpass",
      frequency: 2400,
      end: 600,
      duration: 0.32,
      gain: 0.1,
      delay: 0.025,
    },
  ],
  pod: [
    {
      noise: "bandpass",
      frequency: 1700,
      duration: 0.035,
      gain: 0.19,
      attack: 0.001,
    },
    { wave: "triangle", frequency: 155, end: 48, duration: 0.18, gain: 0.22 },
    {
      noise: "lowpass",
      frequency: 480,
      end: 2200,
      duration: 0.48,
      gain: 0.25,
      attack: 0.035,
      delay: 0.025,
    },
    {
      wave: "sawtooth",
      frequency: 90,
      end: 420,
      duration: 0.34,
      gain: 0.045,
      attack: 0.045,
      delay: 0.04,
    },
  ],
  explosion: [
    {
      noise: "highpass",
      frequency: 1800,
      duration: 0.045,
      gain: 0.25,
      attack: 0.001,
    },
    { wave: "sine", frequency: 125, end: 29, duration: 0.56, gain: 0.36 },
    {
      noise: "lowpass",
      frequency: 1300,
      end: 140,
      duration: 0.85,
      gain: 0.38,
      attack: 0.008,
    },
    {
      noise: "bandpass",
      frequency: 780,
      end: 230,
      duration: 0.52,
      gain: 0.12,
      delay: 0.055,
    },
  ],
  footstep: [
    { wave: "triangle", frequency: 105, end: 43, duration: 0.075, gain: 0.06 },
    {
      noise: "highpass",
      frequency: 1800,
      duration: 0.026,
      gain: 0.04,
      attack: 0.001,
    },
    { wave: "sine", frequency: 870, end: 800, duration: 0.09, gain: 0.024 },
    {
      wave: "sine",
      frequency: 1433,
      duration: 0.06,
      gain: 0.014,
      delay: 0.003,
    },
  ],
  land: [
    { wave: "triangle", frequency: 120, end: 38, duration: 0.21, gain: 0.2 },
    { noise: "bandpass", frequency: 900, end: 300, duration: 0.13, gain: 0.15 },
    { wave: "sine", frequency: 740, end: 670, duration: 0.18, gain: 0.042 },
    {
      wave: "sine",
      frequency: 1207,
      duration: 0.12,
      gain: 0.024,
      delay: 0.012,
    },
  ],
};
