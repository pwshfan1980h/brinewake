import { it, expect } from "vitest";
import { Campaign } from "../sim/campaign";
import { Pilot } from "../../tests/e2e/pilot";
it("plays the full campaign through normal simulation inputs with no state shortcuts", () => {
  const g = new Campaign(),
    bot = new Pilot(),
    seen = new Set<number>(),
    water = new Set<number>();
  let ticks = 0,
    minArmor = 100,
    repairs = 0,
    damageEvents = 0,
    shots = 0;
  const chapterSeconds: number[] = [];
  let previousLevel = 0;
  for (; ticks < 60 * 600 && g.status !== "victory"; ticks++) {
    seen.add(g.index);
    if (g.player.water === "submerged") water.add(g.index);
    if (g.status === "dead") {
      throw new Error(
        `Pilot died: ${JSON.stringify({ level: g.index, time: g.time, x: g.player.x, y: g.player.y, stage: bot.stage, boss: g.boss })}`,
      );
    }
    g.tick(bot.decide(g.snapshot(), 1 / 60), 1 / 60);
    minArmor = Math.min(minArmor, g.player.hp);
    for (const e of g.events) {
      if (e.type === "repair") repairs++;
      if (e.type === "hit") damageEvents++;
      if (["rivet", "arc", "pod"].includes(e.type)) shots++;
    }
    if (g.index !== previousLevel) {
      chapterSeconds.push(Number(g.time.toFixed(2)));
      previousLevel = g.index;
    }
  }
  if (g.status !== "victory")
    console.log(
      JSON.stringify({
        level: g.index,
        player: g.player,
        stage: bot.stage,
        enemies: g.enemies,
        objectives: g.objectives,
        boss: g.boss,
      }),
    );
  expect({
    status: g.status,
    level: g.index,
    x: g.player.x,
    y: g.player.y,
    stage: bot.stage,
    hp: g.player.hp,
    objectives: g.objectives,
    boss: g.boss,
    ticks,
  }).toMatchObject({ status: "victory" });
  expect([...seen]).toEqual([0, 1, 2]);
  expect([...water]).toEqual([0, 1, 2]);
  expect([...bot.bossSeen]).toEqual([0, 1, 2]);
  expect(g.tutorial.done).toBe(true);
  console.info(
    "NORMAL-INPUT CAMPAIGN RESULT",
    JSON.stringify({
      seconds: Number(g.time.toFixed(2)),
      ticks,
      chapterSeconds,
      minArmor,
      repairs,
      damageEvents,
      weaponEvents: shots,
      finalArmor: g.player.hp,
      levels: [...seen],
      submergedLevels: [...water],
      bossPhases: [...bot.bossSeen],
      victory: g.status === "victory",
      tutorialComplete: g.tutorial.done,
    }),
  );
});
