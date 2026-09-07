import "./style.css";
import { Campaign, parseCheckpoint } from "./sim/campaign";
import { World } from "./render/World";
import { InputManager, loadSettings } from "./input/InputManager";
import { AudioEngine } from "./audio/AudioEngine";
import { Menu, backDestination, type MenuMode } from "./ui/menu";
import { HUD } from "./ui/hud";
import { InputBuffer } from "./input/InputBuffer";
import { neutralInput } from "./sim/types";
const pendingInput = new InputBuffer();
const settings = loadSettings();
const game = new Campaign();
let world: World;
try {
  world = new World(document.getElementById("app")!, settings);
} catch (e) {
  document.getElementById("app")!.innerHTML =
    '<div class="fallback"><h1>BRINEWAKE</h1><p>This rescue requires WebGL. Enable hardware acceleration in your browser and reload.</p></div>';
  throw e;
}
const input = new InputManager(world.renderer.domElement, settings),
  audio = new AudioEngine(settings),
  menu = new Menu(settings),
  hud = new HUD();
let active = false,
  accumulator = 0,
  last = performance.now(),
  lastInput = neutralInput(),
  returnMode: MenuMode = "title",
  footTime = 0;
function saved() {
  try {
    return parseCheckpoint(localStorage.getItem("brinewake.checkpoint.v1"));
  } catch {
    return;
  }
}
function save() {
  try {
    localStorage.setItem(
      "brinewake.checkpoint.v1",
      JSON.stringify(game.checkpoint),
    );
  } catch {}
}
function show(mode: MenuMode) {
  menu.show(mode, !!saved());
  input.menuOpen = mode !== "hidden";
  input.clear();
  pendingInput.clear();
  lastInput = neutralInput();
  game.player.charge = 0;
  accumulator = 0;
  document.body.classList.toggle("reduced", settings.reducedMotion);
  world.renderer.setPixelRatio(
    Math.min(devicePixelRatio, settings.lowEffects ? 1 : 1.7),
  );
}
function pause() {
  if (menu.mode === "hidden") {
    show("pause");
  } else if (menu.mode === "pause") show("hidden");
  else if (menu.mode === "guide" || menu.mode === "settings") show(returnMode);
}
function start(training = false) {
  game.time = 0;
  game.kills = 0;
  game.deaths = 0;
  game.tutorial = new (
    game.tutorial.constructor as { new (): typeof game.tutorial }
  )();
  game.load(0);
  world.lastLevel = -1;
  active = true;
  if (training)
    game.say(
      "Safe systems check: practice on the quay, then enter the shallow shelf and pool. The campaign continues beyond the water.",
    );
  save();
  show("hidden");
}
menu.onAction = (action) => {
  audio.start();
  if (action === "start" || action === "training") start(action === "training");
  else if (action === "continue") {
    const c = saved();
    if (c) {
      game.load(c.level, c);
      if (c.completed || c.level) game.tutorial.skip();
      world.lastLevel = -1;
      active = true;
      show("hidden");
    }
  } else if (action === "skip") {
    game.tutorial.skip();
    show("hidden");
  } else if (action === "resume") show("hidden");
  else if (action === "restart") {
    game.restart();
    world.lastLevel = -1;
    active = true;
    show("hidden");
  } else if (action === "title") {
    active = false;
    game.load(0);
    world.lastLevel = -1;
    show("title");
  } else if (action === "settings" || action === "guide") {
    returnMode = menu.mode;
    show(action);
  } else if (action === "back") {
    const destination = backDestination(menu.mode, returnMode);
    if (destination) show(destination);
  }
};
input.onPause = pause;
input.onGuide = () => {
  if (menu.mode === "settings") return;
  if (menu.mode === "guide") show(returnMode);
  else {
    returnMode = menu.mode;
    show("guide");
  }
};
input.onGesture = () => audio.start();
input.onMenu = (a) => menu.navigate(a);
hud.el("pause-button").onclick = pause;
hud.root.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).id === "skip-tutorial") game.tutorial.skip();
});
show("title");
world.load(game);
function frame(now: number) {
  const rawDt = Math.max(0.001, (now - last) / 1000),
    dt = Math.min(0.05, rawDt);
  last = now;
  world.frameMs += (rawDt * 1000 - world.frameMs) * 0.03;
  world.fps = Math.round(1000 / world.frameMs);
  const sampled = input.sample(
    game.player.x,
    game.player.y,
    world.mouseWorld(input.mouse.x, input.mouse.y),
  );
  if (menu.mode === "hidden" && active) {
    accumulator = Math.min(0.12, accumulator + dt);
    pendingInput.push(sampled);
    lastInput = sampled;
    while (accumulator >= 1 / 60) {
      const before = game.index;
      game.tick(pendingInput.consume(), 1 / 60);
      accumulator -= 1 / 60;
      for (const e of game.events) {
        if (!["repairInterrupted", "level"].includes(e.type))
          world.effects.emit(e, settings.lowEffects);
        audio.event(e);
        if (e.type === "checkpoint" || e.type === "level") save();
        if (e.type === "hit") input.vibrate();
      }
      if (game.index !== before) {
        world.lastLevel = -1;
        save();
      }
    }
    if (game.status === "dead") show("dead");
    if (game.status === "victory") {
      try {
        localStorage.removeItem("brinewake.checkpoint.v1");
      } catch {}
      show("victory");
    }
    footTime -= dt;
    if (footTime <= 0 && game.player.grounded && Math.abs(game.player.vx) > 1) {
      audio.footstep(100 + Math.sin(game.player.walk) * 8);
      footTime = 0.23;
    }
  }
  if (menu.mode === "title") game.time += dt;
  world.update(
    game,
    lastInput,
    dt,
    input.mouse,
    input.handoff.device,
    menu.mode !== "hidden",
  );
  hud.update(
    game,
    input.handoff.device,
    menu.mode === "hidden",
    (x, y) => world.screen(x, y),
    dt,
  );
  audio.update(
    game.player.water === "submerged",
    game.boss?.entered
      ? 0.9
      : game.enemies.some((e) => e.hp > 0 && Math.abs(e.x - game.player.x) < 14)
        ? 0.6
        : 0.1,
    menu.mode !== "hidden",
    dt,
  );
  requestAnimationFrame(frame);
}
// Opt-in diagnostics are read-only snapshots, never a mutation / teleport / damage bypass API.
if (
  import.meta.env.DEV ||
  new URLSearchParams(location.search).has("diagnostics")
)
  Object.defineProperty(window, "__BRINEWAKE__", {
    value: Object.freeze({
      snapshot: () => ({
        ...game.snapshot(),
        menu: menu.mode,
        device: input.handoff.device,
        padConnected: input.padConnected,
        audio: { state: audio.ctx?.state || "unstarted", voices: audio.voices },
        render: {
          fps: world.fps,
          frameMs: world.frameMs,
          calls: world.glCalls,
          geometries: world.renderer.info.memory.geometries,
        },
        screen: (x: number, y: number) => world.screen(x, y),
      }),
      screen: (x: number, y: number) => world.screen(x, y),
    }),
    writable: false,
  });
requestAnimationFrame(frame);
