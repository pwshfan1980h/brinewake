import { levels } from "../data/levels";
import { createPlayer, movePlayer } from "./movement";
import { weapons, updateProjectiles, damagePlayer } from "./combat";
import { createEnemy, updateEnemies } from "./enemies";
import { createBoss, updateBoss } from "./boss";
import { Tutorial } from "../ui/tutorial";
import type {
  Player,
  Enemy,
  Projectile,
  Objective,
  Boss,
  GameEvent,
  Input,
} from "./types";
export interface Checkpoint {
  version: 1;
  level: number;
  completed: number;
  x: number;
  y: number;
}
export class Campaign {
  index = 0;
  player!: Player;
  enemies: Enemy[] = [];
  shots: Projectile[] = [];
  objectives: Objective[] = [];
  boss?: Boss;
  events: GameEvent[] = [];
  tutorial = new Tutorial();
  time = 0;
  status: "playing" | "dead" | "victory" = "playing";
  checkpoint!: Checkpoint;
  transition = 0;
  lift = 0;
  liftPlatform?: {
    x: number;
    y: number;
    w: number;
    h: number;
    oneWay: boolean;
  };
  kills = 0;
  deaths = 0;
  message = "";
  messageTime = 0;
  constructor(index = 0) {
    this.load(index);
  }
  get level() {
    return levels[this.index];
  }
  load(index: number, checkpoint?: Checkpoint) {
    this.index = Math.max(0, Math.min(2, index));
    const l = this.level;
    this.player = createPlayer(
      checkpoint?.x ?? l.spawn.x,
      checkpoint?.y ?? l.spawn.y,
    );
    this.enemies = l.enemies.map((e, n) => createEnemy(e.kind, e.x, e.y, n));
    this.objectives = l.objectives.map((o, n) => ({
      ...o,
      done: n < (checkpoint?.completed ?? 0),
      progress: 0,
    }));
    this.shots = [];
    this.boss = l.boss ? createBoss(l.boss.x, l.boss.y) : undefined;
    this.status = "playing";
    this.transition = 0;
    this.lift = 0;
    this.liftPlatform =
      this.index === 1
        ? { x: 98, y: 4.2, w: 6, h: 0.4, oneWay: false }
        : undefined;
    this.checkpoint = checkpoint ?? {
      version: 1,
      level: this.index,
      completed: 0,
      ...l.spawn,
    };
    if (checkpoint)
      for (const e of this.enemies) if (e.x < checkpoint.x + 7) e.hp = 0;
    this.say(l.brief);
  }
  say(message: string) {
    this.message = message;
    this.messageTime = 7;
  }
  restart() {
    this.deaths++;
    this.load(this.index, this.checkpoint);
    this.events.push({ type: "restart", x: this.player.x, y: this.player.y });
  }
  tick(i: Input, dt: number) {
    this.events = [];
    if (this.status !== "playing") return;
    this.time += dt;
    this.messageTime = Math.max(0, this.messageTime - dt);
    const p = this.player;
    const oldWater = p.water,
      oldGround = p.grounded,
      oldDash = p.dash;
    if (this.liftPlatform && this.objectives.every((o) => o.done)) {
      const mounted =
        p.x > 97.6 &&
        p.x < 104.4 &&
        Math.abs(p.y - 0.9 - this.liftPlatform.y) < 0.18 &&
        p.vy <= 0;
      if (mounted) {
        const rise = Math.min(6.4 - this.lift, dt * 2);
        this.lift += rise;
        p.y += rise;
      } else if (p.x < 97.6 || p.x > 104.4 || p.y < this.liftPlatform.y)
        this.lift = Math.max(0, this.lift - dt * 3);
      this.liftPlatform.y = 4.2 + this.lift;
    }
    movePlayer(
      p,
      i,
      this.liftPlatform
        ? [...this.level.platforms, this.liftPlatform]
        : this.level.platforms,
      this.level.water,
      dt,
    );
    p.x = Math.max(0.5, Math.min(this.level.length - 1, p.x));
    if (p.y < -12) {
      damagePlayer(p, 15, this.events);
      p.x = this.checkpoint.x;
      p.y = this.checkpoint.y;
      p.vx = p.vy = 0;
      this.say("Recovery tether engaged. Your checkpoint is secure.");
    }
    if (oldWater !== p.water)
      this.events.push({ type: "splash", x: p.x, y: p.y });
    if (!oldGround && p.grounded)
      this.events.push({ type: "land", x: p.x, y: p.y });
    if (p.dash > oldDash) this.events.push({ type: "dash", x: p.x, y: p.y });
    weapons(p, i, this.shots, this.events, this.level.platforms, dt);
    updateEnemies(this.enemies, p, this.shots, this.events, dt);
    if (this.boss)
      updateBoss(
        this.boss,
        p,
        this.shots,
        this.events,
        dt,
        this.objectives.every((o) => o.done),
      );
    updateProjectiles(
      this.shots,
      p,
      this.enemies,
      this.boss,
      this.level.platforms,
      this.events,
      dt,
    );
    for (const [objectiveIndex, o] of this.objectives.entries()) {
      if (o.done) continue;
      const sequenceReady = this.objectives
        .slice(0, objectiveIndex)
        .every((o) => o.done);
      const near = Math.hypot(p.x - o.x, p.y - o.y) < 2.8;
      const threat = this.enemies.some(
        (e) => e.hp > 0 && Math.hypot(e.x - o.x, e.y - o.y) < 11,
      );
      if (near && i.interact && !threat && sequenceReady) {
        o.progress += dt / 1.25;
        if (o.progress >= 1) {
          o.done = true;
          p.hp = 100;
          p.fuel = 100;
          p.repairCd = 0;
          p.podCd = 0;
          this.checkpoint = {
            version: 1,
            level: this.index,
            completed: this.objectives.filter((o) => o.done).length,
            x: o.x,
            y: o.y,
          };
          this.events.push({ type: "checkpoint", x: o.x, y: o.y });
          this.say(
            this.objectives.every((o) => o.done)
              ? this.index === 2
                ? "Safety circuit restored. The governor is ahead. Watch for the exposed core."
                : "Route restored. Follow the rescue lights to extraction."
              : "Relay restored. Armor and reserves replenished. Keep moving.",
          );
        }
      } else {
        o.progress = Math.max(0, o.progress - dt * 2);
        if (near && i.interact && (threat || !sequenceReady)) {
          this.message = sequenceReady
            ? "RELAY LOCKED · Clear nearby defense units."
            : "Restore the previous relay first. Follow the numbered route.";
          this.messageTime = 1;
        }
      }
    }
    if (this.index === 0)
      this.tutorial.update(
        p,
        i,
        this.objectives.some((o) => o.done),
      );
    for (const e of [...this.events]) {
      if (e.type === "bossEnter") {
        this.checkpoint = { version: 1, level: 2, completed: 1, x: 89, y: 0.9 };
        p.hp = 100;
        p.fuel = 100;
        p.podCd = 0;
        p.repairCd = 0;
        this.events.push({ type: "checkpoint", x: p.x, y: p.y });
        this.say(
          "Arena relay secured. Read the amber targeting tell; strike when the governor opens cyan.",
        );
      }
      if (e.type === "repairInterrupted")
        this.say("Patch interrupted by damage. Find cover before repairing.");
      if (e.type === "explosion") this.kills++;
    }
    if (p.hp <= 0) {
      this.status = "dead";
      return;
    }
    if (
      this.objectives.every((o) => o.done) &&
      (!this.boss || this.boss.hp <= 0)
    ) {
      this.transition = Math.min(1, this.transition + dt * 0.7);
      if (this.boss && this.boss.hp <= 0) {
        this.transition += dt;
        if (this.transition >= 1) {
          this.status = "victory";
          this.events.push({ type: "victory", x: p.x, y: p.y });
        }
      } else if (
        Math.hypot(p.x - this.level.exit.x, p.y - this.level.exit.y) < 3 &&
        (this.index !== 1 || this.lift > 5.8)
      ) {
        this.load(this.index + 1);
        this.events.push({ type: "level", x: this.player.x, y: this.player.y });
      }
    }
  }
  snapshot() {
    return JSON.parse(
      JSON.stringify({
        level: this.index,
        name: this.level.name,
        time: this.time,
        status: this.status,
        player: this.player,
        enemies: this.enemies,
        objectives: this.objectives,
        boss: this.boss,
        shots: this.shots,
        checkpoint: this.checkpoint,
        tutorial: { step: this.tutorial.step, done: this.tutorial.done },
        transition: this.transition,
        lift: this.lift,
      }),
    );
  }
}
export function parseCheckpoint(text: string | null): Checkpoint | undefined {
  try {
    const c = JSON.parse(text || "null");
    if (
      c?.version !== 1 ||
      !Number.isInteger(c.level) ||
      c.level < 0 ||
      c.level > 2 ||
      !Number.isInteger(c.completed) ||
      c.completed < 0 ||
      c.completed > levels[c.level].objectives.length ||
      !Number.isFinite(c.x) ||
      !Number.isFinite(c.y) ||
      c.x < 0 ||
      c.x > levels[c.level].length ||
      c.y < -8 ||
      c.y > 12
    )
      return;
    return c;
  } catch {
    return;
  }
}
