import type { Settings } from "../input/InputManager";
export type MenuMode =
  "title" | "pause" | "settings" | "guide" | "dead" | "victory" | "hidden";
export function backDestination(
  mode: MenuMode,
  parent: MenuMode,
): MenuMode | undefined {
  if (mode === "pause") return "hidden";
  if (mode === "settings" || mode === "guide") return parent;
  return undefined;
}
export class Menu {
  element: HTMLElement;
  mode: MenuMode = "title";
  previous: MenuMode = "title";
  onAction = (action: string) => {};
  constructor(public settings: Settings) {
    this.element = document.createElement("section");
    this.element.id = "menu";
    this.element.setAttribute("aria-label", "Game menu");
    document.body.append(this.element);
    this.element.addEventListener("click", (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button[data-action]",
      );
      if (button) this.onAction(button.dataset.action!);
    });
    this.element.addEventListener("input", (e) => {
      const input = e.target as HTMLInputElement;
      const key = input.dataset.setting as keyof Settings;
      if (!key) return;
      (this.settings as any)[key] =
        input.type === "checkbox"
          ? input.checked
          : input.type === "range"
            ? Number(input.value)
            : input.value;
      try {
        localStorage.setItem(
          "brinewake.settings.v1",
          JSON.stringify(this.settings),
        );
      } catch {}
      if (input.type === "range")
        input.nextElementSibling!.textContent =
          Math.round(Number(input.value) * 100) + "%";
    });
  }
  show(mode: MenuMode, hasSave = false) {
    this.mode = mode;
    this.element.className = mode;
    this.element.hidden = mode === "hidden";
    if (mode === "hidden") return;
    const mark =
      '<div class="division"><span class="cross">✚</span> COASTAL RESCUE DIVISION <span class="serial">EST. 2086</span></div>';
    const button = (id: string, text: string, primary = false) =>
      `<button data-action="${id}" class="${primary ? "primary" : ""}">${text}<span aria-hidden="true">↗</span></button>`;
    if (mode === "title")
      this.element.innerHTML = `<div class="title-content">${mark}<p class="eyebrow">A SIGNAL AGAINST THE STORM</p><h1>BRINE<span>WAKE</span><i>™</i></h1><p class="tagline">Keep the lights on.<br>Bring them home.</p><p class="intro">Pilot a sealed rescue mech through a drowned coastal city.<br>Three routes. One seawall. Everyone still waiting.</p><div class="menu-actions">${button("start", "Begin rescue", true)}${hasSave ? button("continue", "Continue from relay") : ""}${button("training", "Systems check")}${button("settings", "Settings")}${button("guide", "Field guide")}</div><div class="title-foot"><span>01—03 / ORIGINAL CAMPAIGN</span><span>KEYBOARD + MOUSE · CONTROLLER</span></div></div><div class="world-caption"><span class="live-dot"></span> LANTERN QUAY<span>WIND SW · SEA STATE 04</span></div>`;
    else if (mode === "pause")
      this.element.innerHTML = `<div class="panel">${mark}<p class="eyebrow">TELEMETRY HELD</p><h2>Take a breath.</h2><p>Your rescue route is waiting.</p>${button("resume", "Resume rescue", true)}${button("restart", "Restart at relay")}${button("guide", "Field guide")}${button("skip", "Skip systems check")}${button("settings", "Settings")}${button("title", "Return to title")}</div>`;
    else if (mode === "dead")
      this.element.innerHTML = `<div class="panel">${mark}<p class="eyebrow">RECOVERY TETHER SECURED</p><h2>Hull offline.</h2><p>Your last relay is safe.<br>Restore your mech and try another approach.</p>${button("restart", "Return to checkpoint", true)}${button("guide", "Review field guide")}${button("title", "Return to title")}</div>`;
    else if (mode === "victory")
      this.element.innerHTML = `<div class="panel victory-panel">${mark}<p class="eyebrow">CHANNEL OPEN · ALL ROUTES RESTORED</p><h2>The sea settles.<br>The city carries on.</h2><p>The governor is silent. The seawall still stands.<br>Below the crown, the last ferries follow your lights home.</p><div class="completion"><b>03 / 03</b><span>ROUTES RESTORED</span><b>01 / 01</b><span>GOVERNOR DISABLED</span></div>${button("start", "Play the campaign again", true)}${button("title", "Return to title")}<small>BRINEWAKE · Original geometry, story and synthesized score.</small></div>`;
    else if (mode === "settings") {
      const slider = (key: string, label: string) =>
        `<label>${label}<input aria-label="${label}" data-setting="${key}" type="range" min="${key === "deadzone" ? 0.1 : 0}" max="${key === "deadzone" ? 0.4 : 1}" step=".01" value="${(this.settings as any)[key]}"><output>${Math.round((this.settings as any)[key] * 100)}%</output></label>`;
      const check = (key: string, label: string) =>
        `<label class="toggle">${label}<input data-setting="${key}" type="checkbox" ${(this.settings as any)[key] ? "checked" : ""}></label>`;
      this.element.innerHTML = `<div class="panel settings-panel"><p class="eyebrow">PERSONAL TELEMETRY</p><h2>Make it yours.</h2>${slider("master", "Master volume")}${slider("music", "Music")}${slider("effects", "Effects")}${check("mute", "Mute all audio")}${slider("deadzone", "Stick deadzone")}${check("doubleTap", "Double-tap A / D to dash")}${check("reducedMotion", "Reduce flashes and motion")}${check("lowEffects", "Low effects / lower resolution")}<label>Controller preset<select data-setting="padPreset"><option value="shoulder" ${this.settings.padPreset === "shoulder" ? "selected" : ""}>Shoulder jump (LB + A)</option><option value="classic" ${this.settings.padPreset === "classic" ? "selected" : ""}>Classic face jump (A)</option></select></label>${button("back", "Back", true)}</div>`;
    } else
      this.element.innerHTML = `<div class="panel guide-panel"><p class="eyebrow">BRINEWAKE / FIELD GUIDE</p><h2>A sealed hull.<br>A steady hand.</h2><div class="guide-grid"><div><h3>On the breakwater</h3><p><kbd>A D</kbd> Run / left stick<br><kbd>Space / W</kbd> Jump, hold for jet / LB<br><kbd>Shift</kbd> Surge / RB<br><kbd>S</kbd> Fast fall; drop through grated platforms</p><h3>Below the surface</h3><p><kbd>W A S D</kbd> Swim in two dimensions / left stick<br><kbd>Space</kbd> Rise and breach / LB<br><kbd>Shift</kbd> Directional surge / RB<br>No oxygen timer. Currents cannot overpower thrust.</p></div><div><h3>Independent fire control</h3><p><kbd>Mouse</kbd> Aim / right stick<br><kbd>RMB</kbd> Rivet repeater / RT<br><kbd>LMB</kbd> Hold, release arc lance / LT<br><kbd>E</kbd> Guided wake pods / B (right face)</p><h3>Keep the route alive</h3><p><kbd>Q</kbd> Field patch / Y (top face)<br><kbd>F</kbd> Hold at cleared relay / X (left face)<br><kbd>H</kbd> Field guide / View<br><kbd>Esc</kbd> Pause / Menu</p></div></div><p class="guide-note">All weapons function underwater. Pods become torpedoes; rivets trail bubbles. Breaker shields resist rivets: use the arc lance or flank. The Tideminder’s amber tells precede attacks; move clear, then fire into the cyan exposed core. Relays replenish armor and reserves.</p><p class="guide-note">Controller menus: D-pad / left stick to navigate, A to select, B to go back, D-pad left/right to adjust. Press a controller button to connect.</p>${button("back", "Back to rescue", true)}</div>`;
    requestAnimationFrame(() =>
      this.element
        .querySelector<HTMLElement>("button,input,select")
        ?.focus({ preventScroll: true }),
    );
  }
  navigate(action: string) {
    const els = Array.from(
      this.element.querySelectorAll<HTMLElement>("button,input,select"),
    );
    if (!els.length) return;
    let n = els.indexOf(document.activeElement as HTMLElement);
    if (action === "next" || action === "prev") {
      n = (n + (action === "next" ? 1 : -1) + els.length) % els.length;
      els[n].focus();
    } else if (action === "back") this.onAction("back");
    else if (action === "select") {
      const el = els[Math.max(0, n)];
      el.click();
    } else if (action === "increase" || action === "decrease") {
      const el = els[Math.max(0, n)] as HTMLInputElement;
      if (el.type === "range") {
        el.value = String(
          Number(el.value) + (action === "increase" ? 0.05 : -0.05),
        );
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (el instanceof HTMLSelectElement) {
        el.selectedIndex = 1 - el.selectedIndex;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }
}
