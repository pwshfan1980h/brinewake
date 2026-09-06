export type WaterState = "dry" | "wading" | "surface" | "submerged";
export interface Vec {
  x: number;
  y: number;
}
export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay?: boolean;
}
export interface Water {
  x: number;
  w: number;
  surface: number;
  bottom: number;
  current: number;
}
export interface Input {
  moveX: number;
  moveY: number;
  jump: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  primary: boolean;
  secondary: boolean;
  missilePressed: boolean;
  repairPressed: boolean;
  interact: boolean;
  aim: number;
}
export const neutralInput = (): Input => ({
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpPressed: false,
  dashPressed: false,
  primary: false,
  secondary: false,
  missilePressed: false,
  repairPressed: false,
  interact: false,
  aim: 0,
});
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  fuel: number;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  jumpTime: number;
  drop: number;
  dash: number;
  dashCd: number;
  dashX: number;
  dashY: number;
  facing: number;
  water: WaterState;
  aim: number;
  heat: number;
  fireCd: number;
  charge: number;
  podCd: number;
  repairCd: number;
  repair: number;
  invuln: number;
  recoil: number;
  land: number;
  hit: number;
  podAnim: number;
  vent: number;
  walk: number;
}
export type EnemyKind = "skitter" | "sentry" | "dart" | "breaker" | "buoy";
export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  time: number;
  cooldown: number;
  tell: number;
  attack: number;
  hit: number;
  dead: number;
  aim: number;
}
export interface Projectile {
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  friendly: boolean;
  kind: "rivet" | "arc" | "pod" | "hostile";
  radius: number;
  target?: number;
}
export interface Objective {
  x: number;
  y: number;
  name: string;
  done: boolean;
  progress: number;
}
export interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  time: number;
  phase: 0 | 1 | 2;
  state: "dormant" | "tell" | "attack" | "open" | "dead";
  clock: number;
  targetX: number;
  targetY: number;
  sectors: number[];
  hit: number;
  entered: boolean;
}
export interface GameEvent {
  type: string;
  x: number;
  y: number;
  value?: number;
}
export interface Level {
  id: number;
  name: string;
  subtitle: string;
  brief: string;
  length: number;
  spawn: Vec;
  exit: Vec;
  platforms: Platform[];
  water: Water[];
  objectives: Omit<Objective, "done" | "progress">[];
  enemies: { kind: EnemyKind; x: number; y: number }[];
  boss?: Vec;
  palette: { sky: string; fog: string; water: string; accent: string };
}
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const approach = (v: number, target: number, delta: number) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
