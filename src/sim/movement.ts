import {
  approach,
  clamp,
  type Player,
  type Input,
  type Platform,
  type Water,
} from "./types";
import { waterState, swimVelocity, surgeDirection } from "./water";
export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    hp: 100,
    fuel: 100,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpTime: 0,
    drop: 0,
    dash: 0,
    dashCd: 0,
    dashX: 1,
    dashY: 0,
    facing: 1,
    water: "dry",
    aim: 0,
    heat: 0,
    fireCd: 0,
    charge: 0,
    podCd: 0,
    repairCd: 0,
    repair: 0,
    invuln: 0,
    recoil: 0,
    land: 0,
    hit: 0,
    podAnim: 0,
    vent: 0,
    walk: 0,
  };
}
export function movePlayer(
  p: Player,
  i: Input,
  platforms: Platform[],
  waters: Water[],
  dt: number,
) {
  p.water = waterState(p.x, p.y, p.water, waters);
  const wet = p.water === "submerged" || p.water === "surface";
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.dash = Math.max(0, p.dash - dt);
  p.drop = Math.max(0, p.drop - dt);
  p.land = Math.max(0, p.land - dt * 4);
  p.coyote = p.grounded ? 0.11 : Math.max(0, p.coyote - dt);
  p.jumpBuffer = i.jumpPressed ? 0.13 : Math.max(0, p.jumpBuffer - dt);
  if (Math.abs(i.moveX) > 0.1) p.facing = Math.sign(i.moveX);
  if (i.dashPressed && p.dashCd <= 0) {
    const d = surgeDirection(i.moveX, i.moveY, p.facing, wet);
    p.dash = 0.19;
    p.dashCd = 0.9;
    p.dashX = d.x;
    p.dashY = d.y;
  }
  if (
    i.moveY < -0.5 &&
    p.grounded &&
    platforms.some((b) => b.oneWay && Math.abs(p.y - 0.9 - b.y) < 0.15)
  ) {
    p.drop = 0.24;
    p.y -= 0.08;
    p.grounded = false;
  }
  if (wet) {
    const w = waters.find((w) => p.x >= w.x && p.x <= w.x + w.w);
    const v = swimVelocity(
      i.moveX,
      i.moveY || (i.jump ? 1 : 0),
      p.vx,
      p.vy,
      w?.current || 0,
      dt,
    );
    p.vx = v.x;
    p.vy = v.y;
    p.fuel = clamp(p.fuel + 18 * dt, 0, 100);
    p.jumpBuffer = 0;
    if (p.water === "surface" && i.jump) {
      p.vy = 9.5;
      p.jumpTime = 0.25;
    } // intentional breach requires held upward thrust
  } else {
    p.vx = approach(
      p.vx,
      i.moveX * (p.repair > 0 ? 2.6 : 7.2),
      dt * (p.grounded ? 52 : 26),
    );
    p.vy -= 24 * dt;
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = 10.5;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.jumpTime = 0;
    }
    p.jumpTime += dt;
    if (i.jump && !p.grounded && p.jumpTime > 0.19 && p.fuel > 0) {
      p.vy = Math.min(7.3, p.vy + 34 * dt);
      p.fuel = Math.max(0, p.fuel - 28 * dt);
    }
    if (p.grounded) p.fuel = Math.min(100, p.fuel + 38 * dt);
    if (!i.jump && p.vy > 5 && p.jumpTime < 0.2) p.vy -= 18 * dt;
    if (i.moveY < -0.5) p.vy -= 22 * dt;
  }
  const ox = p.x,
    oy = p.y;
  if (p.dash > 0) {
    p.vx = p.dashX * 19;
    p.vy = p.dashY * 19;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const b of platforms) {
    if (p.x + 0.42 <= b.x || p.x - 0.42 >= b.x + b.w) continue;
    if (
      oy - 0.9 >= b.y - 0.08 &&
      p.y - 0.9 <= b.y &&
      p.vy <= 0 &&
      (!b.oneWay || p.drop <= 0)
    ) {
      if (p.vy < -6) p.land = 0.9;
      p.y = b.y + 0.9;
      p.vy = 0;
      p.grounded = true;
      continue;
    }
    if (b.oneWay) continue;
    if (p.y + 0.8 > b.y - b.h && p.y - 0.86 < b.y) {
      if (oy + 0.8 <= b.y - b.h && p.vy > 0) {
        p.y = b.y - b.h - 0.8;
        p.vy = 0;
      } else if (ox + 0.42 <= b.x) {
        p.x = b.x - 0.42;
        p.vx = 0;
      } else if (ox - 0.42 >= b.x + b.w) {
        p.x = b.x + b.w + 0.42;
        p.vx = 0;
      }
    }
  }
  p.walk += p.vx * dt;
  p.aim = i.aim;
}
