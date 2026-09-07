import type { Campaign } from "../sim/campaign";
import { tutorialSteps } from "./tutorial";
export class HUD {
  root: HTMLElement;
  labels: HTMLElement;
  private labelNodes = new Map<string, HTMLElement>();
  constructor() {
    this.root = document.createElement("div");
    this.root.id = "hud";
    this.root.innerHTML = `<div class="hud-top"><div><p class="eyebrow" id="chapter"></p><h2 id="location"></h2></div><div class="route"><span id="route-label"></span><div class="route-line"><i id="route-progress"></i></div></div><button id="pause-button" aria-label="Pause game">Ⅱ</button></div><div id="radio"><span class="radio-icon">⌁</span><div><b>DISPATCH / MARA</b><p></p></div></div><div id="boss-hud"><div><span>SEAWALL GOVERNOR</span><b>THE TIDEMINDER</b><span id="boss-phase"></span></div><i><em></em></i><p id="boss-instruction"></p></div><div class="hud-bottom"><div class="hull"><div class="hull-heading"><span>R-07 / RESCUE HULL</span><b id="armor-value">100</b></div><div class="meter armor"><i id="armor"></i></div><div class="fuel-row"><span>THRUST</span><div class="meter"><i id="fuel"></i></div><span id="water-state">SEALED</span></div><div class="hull-status"><span id="repair-state"></span><span id="dash-state"></span></div></div><div id="tutorial"></div><div class="weapons"><div><b>01</b><span>RIVET<span class="weapon-key" id="primary-key">RMB</span></span><i><em id="heat"></em></i></div><div><b>02</b><span>ARC LANCE<span class="weapon-key" id="secondary-key">LMB</span></span><i><em id="charge"></em></i></div><div><b>03</b><span>WAKE PODS<span class="weapon-key" id="pod-key">E</span></span><i><em id="pods"></em></i></div></div></div><div id="underwater"></div><div id="damage-vignette"></div><div class="help-key" id="help-key">H / FIELD GUIDE</div>`;
    document.body.append(this.root);
    this.labels = document.createElement("div");
    this.labels.id = "world-labels";
    document.body.append(this.labels);
  }
  el(id: string) {
    return this.root.querySelector<HTMLElement>("#" + id)!;
  }
  update(
    g: Campaign,
    device: string,
    visible: boolean,
    project: (x: number, y: number) => { x: number; y: number },
    _dt: number,
  ) {
    this.root.hidden = !visible;
    this.labels.hidden = !visible;
    if (!visible) return;
    const p = g.player;
    this.el("chapter").textContent = g.level.subtitle;
    this.el("location").textContent = g.level.name;
    this.el("route-label").textContent =
      `${g.objectives.filter((o) => o.done).length} / ${g.objectives.length} RELAYS RESTORED · ${Math.round(p.x)} m`;
    this.el("route-progress").style.width = (p.x / g.level.length) * 100 + "%";
    this.el("armor-value").textContent = Math.ceil(p.hp)
      .toString()
      .padStart(3, "0");
    for (const [id, v] of [
      ["armor", p.hp],
      ["fuel", p.fuel],
      ["heat", p.heat],
      ["charge", (p.charge / 1.3) * 100],
      ["pods", (1 - p.podCd / 4) * 100],
    ] as const)
      this.el(id).style.width = v + "%";
    this.el("armor").style.background = p.hp < 30 ? "#fb8185" : "";
    this.el("water-state").textContent =
      p.water === "submerged"
        ? "SUBMERGED"
        : p.water === "surface"
          ? "SURFACE"
          : "SEALED";
    this.el("underwater").style.opacity = p.water === "submerged" ? "1" : "0";
    this.el("damage-vignette").style.opacity = String(p.hit * 1.5);
    this.el("repair-state").textContent =
      p.repair > 0
        ? "PATCHING…"
        : p.repairCd > 0
          ? `PATCH ${p.repairCd.toFixed(1)}s`
          : `${device === "gamepad" ? "Y" : "Q"} / PATCH READY`;
    this.el("dash-state").textContent =
      p.dashCd > 0
        ? `SURGE ${p.dashCd.toFixed(1)}s`
        : `${device === "gamepad" ? "RB" : "SHIFT"} / SURGE`;
    this.el("primary-key").textContent = device === "gamepad" ? "RT" : "RMB";
    this.el("secondary-key").textContent = device === "gamepad" ? "LT" : "LMB";
    this.el("pod-key").textContent = device === "gamepad" ? "B" : "E";
    this.el("help-key").textContent =
      device === "gamepad" ? "VIEW / FIELD GUIDE" : "H / FIELD GUIDE";
    this.el("radio").classList.toggle("active", g.messageTime > 0);
    this.el("radio").querySelector("p")!.textContent = g.message;
    const tutorial = this.el("tutorial");
    if (g.index === 0 && !g.tutorial.done) {
      const step = tutorialSteps[g.tutorial.step];
      tutorial.innerHTML = `<span class="eyebrow">SYSTEMS CHECK / ${g.tutorial.step + 1} OF 9</span><b>${step[0]}</b><p>${step[device === "gamepad" ? 2 : 1]}</p><button id="skip-tutorial">Skip guide ↗</button>`;
      tutorial.style.display = "block";
    } else tutorial.style.display = "none";
    const b = g.boss;
    this.el("boss-hud").style.display =
      b && b.state !== "dormant" && b.state !== "dead" ? "block" : "none";
    if (b) {
      this.el("boss-hud").querySelector<HTMLElement>("em")!.style.width =
        (b.hp / b.maxHp) * 100 + "%";
      this.el("boss-phase").textContent = `PHASE 0${b.phase + 1}`;
      this.el("boss-instruction").textContent =
        b.state === "open"
          ? "CORE EXPOSED · FIRE INTO THE CYAN GOVERNOR"
          : b.state === "tell"
            ? b.phase === 1
              ? "MORTAR SECTORS MARKED · MOVE CLEAR"
              : "TARGETING SWEEP · CHANGE ELEVATION"
            : "BRACED HULL · EVADE THE VOLLEY";
    }
    // Projection belongs to the rendered camera frame, never a slower HUD timer.
    // Keep nodes stable so movement does not continually rebuild/rasterize text.
    const seen = new Set<string>();
    const place = (
      key: string,
      className: string,
      html: string,
      s: { x: number; y: number },
    ) => {
      seen.add(key);
      let node = this.labelNodes.get(key);
      if (!node) {
        node = document.createElement("div");
        this.labelNodes.set(key, node);
        this.labels.append(node);
      }
      node.className = className;
      node.style.left = s.x + "px";
      node.style.top = s.y + "px";
      if (node.innerHTML !== html) node.innerHTML = html;
    };
    {
      for (const [index, o] of g.objectives.entries()) {
        const sequenceReady = g.objectives.slice(0, index).every((o) => o.done);
        const s = project(o.x, o.y + 2.8);
        if (s.x < 0 || s.x > innerWidth) continue;
        const near = Math.hypot(p.x - o.x, p.y - o.y) < 2.8;
        const threat = g.enemies.some(
          (e) => e.hp > 0 && Math.hypot(e.x - o.x, e.y - o.y) < 11,
        );
        const html = `<b>${o.done ? "✓" : near ? (threat ? "⚠" : "⌁") : "◇"} ${o.name}</b><span>${o.done ? "ROUTE ONLINE" : near ? (!sequenceReady ? "RESTORE PREVIOUS RELAY" : threat ? "CLEAR NEARBY DEFENSE UNITS" : `HOLD ${device === "gamepad" ? "X" : "F"} TO RESTORE`) : `${Math.round(Math.hypot(p.x - o.x, p.y - o.y))} m`}</span>${near && !o.done ? `<i style="width:${o.progress * 100}%"></i>` : ""}`;
        place(
          `objective-${g.index}-${index}`,
          "objective-label" + (o.done ? " done" : ""),
          html,
          s,
        );
      }
      for (const e of g.enemies) {
        if (e.hp <= 0 || Math.abs(e.x - p.x) > 16) continue;
        const s = project(e.x, e.y + 1.3);
        const html = `<span>${e.tell > 0 ? "! WINDUP" : e.kind.toUpperCase()}</span><i><em style="width:${(e.hp / e.maxHp) * 100}%"></em></i>`;
        place(`enemy-${g.index}-${e.id}`, "enemy-label", html, s);
      }
      if (g.objectives.every((o) => o.done) && !g.boss) {
        const s = project(g.level.exit.x, g.level.exit.y + 5);
        place("exit", "objective-label done", "ROUTE OPEN →", s);
      }
    }
    for (const [key, node] of this.labelNodes) {
      if (!seen.has(key)) {
        node.remove();
        this.labelNodes.delete(key);
      }
    }
  }
}
