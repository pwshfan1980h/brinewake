# BRINEWAKE — ALPHA

[Play the alpha on GitHub Pages](https://pwshfan1980h.github.io/brinewake/)

Early testing build. Browser polish, audio balance and physical controller behavior remain under evaluation.

**Keep the lights on. Bring them home.**

An original, local Three.js 2.5D rescue-mech game. Restore evacuation routes across a flooded coastal city, then disable the seawall governor without destroying the seawall. All geometry, scenery, layouts, animation, story and synthesized audio were authored in this project. No Moonsec source or assets were copied or imported.

The implementation includes the complete three-level campaign and has passed a normal-input deterministic campaign run. **Browser visual/gameplay QA remains blocked in the implementation environment.** See [real test results and limitations](docs/PLAYTEST.md); this is not a claim of completed browser polish verification.

## Play locally

Requires Node 20.19+ or 22.12+ and a WebGL-capable desktop browser.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Click **Begin rescue**. **Systems check** replays the safe opening of Lantern Quay and continues into that same campaign map; it is not a fourth level.

```sh
npm test                 # deterministic simulation, input and procedural scene checks
npm run build           # typecheck, production bundle and offline HTML
npm run preview         # serve the production bundle
npm run test:e2e         # five real Playwright browser tests; requires build first
```

Install browser binaries if necessary with `npx playwright install chromium`. To try WebKit on a machine that permits browser installation, run `npx playwright install webkit` and `npm run test:e2e -- --browser=webkit`. WebKit and physical Safari are not verified here.

`dist/BRINEWAKE.html` is a self-contained build with inline JavaScript and CSS. It can be opened directly in browsers that permit local HTML, with no server or network assets. The normal `dist/index.html` build uses relative assets and supports hosting at a repository subpath. The alpha is published on GitHub Pages from the `gh-pages` branch. There is no backend or account requirement.

The implementation environment could install cached dependencies and build, but could not bind a local server or launch Chromium. Run dev/preview/Playwright from a regular terminal outside that sandbox to finish browser QA. See the playtest log for the precise failures.

## Controls

| Action | Keyboard / mouse | Standard gamepad |
|---|---|---|
| Move on land | A / D or Left / Right | Left stick horizontal |
| Jump / hold jet | Space; W alias on land | LB; A also jumps in default preset |
| Swim | WASD / arrow keys | Left stick in two dimensions |
| Rise / breach water | Space or upward thrust | LB / up on left stick |
| Fast fall / grated drop | S / Down | Left stick down |
| Aim independently | Pointer | Right stick, direct 360° direction |
| Rivet repeater | **Hold RMB** | RT |
| Arc lance | **Hold LMB, release**; short tap works | Hold LT, release |
| Guided wake pods | E | B / right face |
| Directional surge | Shift | RB |
| Field patch | Q | Y / top face |
| Restore relay | Hold F nearby after clearing threats | Hold X / left face |
| Field guide | H | View |
| Pause | Escape | Menu |

The mouse weapon roles follow the source-audit correction in the approved plan; the gamepad intentionally uses conventional RT suppression / LT precision. Movement never chooses weapon direction. Double-tap A/D surge is optional and off by default.

Controller menus use D-pad / left stick, A to select, B to go back, and D-pad left/right for sliders. Press a button to make the controller visible to the browser. Settings offer shoulder or face jump, radial deadzone, master/music/effects volume, mute, reduced motion/flashes and low effects. Keyboard Tab and native form controls remain available. Controller tests use synthetic input; physical comfort and hardware vibration are unverified.

## The rescue route

1. **Lantern Quay** — sunset harbor, shallow shelf and deep training pool, cranes and ferries. Restore harbor power, then open the evacuation bridge. Two combat pockets introduce skitters and sentries. The nine observed-action tutorial steps are embedded here and can be skipped from pause.
2. **The Hanging Gardens** — planted pump terraces, cascades, underwater intake and layered grated platforms. Restore both interlocks and ride the actual floodgate lift. Dart drones, shielded breakers and artillery buoys join the defenses.
3. **Storm Crown** — night seawall, turbines, rain and a submerged approach. Restore the safety circuit; the arena relay saves immediately before **the Tideminder**, the campaign’s only boss. Read the targeting sweep and marked mortar sectors, then fire during exposed-core recovery windows. Victory quiets the machinery and reopens the channel.

The mech is sealed: there is no oxygen timer. Water has explicit dry, wading, surface and submerged states with hysteresis, bounded currents, buoyancy and normalized swimming. All weapons work below the surface; wake pods guide as torpedoes. Use S to descend through submerged grated platforms. A water exit never requires a consumable.

Relays must be restored in order, replenish armor and reserves, and save locally. Repair has a windup and is interrupted by damage. Rivets heat up; pause firing to cool them. The arc lance bypasses breaker shielding and becomes stronger when charged. Pods and surge recharge automatically. Death returns to the last relay. A recovery tether handles falls below authored terrain.

## Implementation

- `src/sim/`: fixed 60 Hz simulation, movement, water, swept collision, weapons, enemies, boss and checkpoint campaign.
- `src/input/`: keyboard/mouse/Gamepad API mapping, meaningful device handoff, persistent settings and buffered edge actions.
- `src/render/`: articulated Three.js mech, original procedural coastal kit, batched scenery, water shader, pooled effects and arena framing.
- `src/audio/AudioEngine.ts`: bounded synthesized SFX voices, filtered underwater sound and adaptive original motifs. Audio starts after interaction.
- `src/data/levels.ts`: exactly three authored layouts and one boss location.
- `src/ui/`: tutorial, HUD, menus, settings and field guide.
- `src/tests/`: deterministic and CPU scene tests.
- `tests/e2e/`: Playwright gameplay, synthetic gamepad, persistence, death/restart and complete campaign driver.

Append `?diagnostics` to opt into `window.__BRINEWAKE__`. It exposes detached snapshots and world-to-screen projection only. It cannot teleport, change health, skip a level or kill an enemy. Diagnostics are enabled automatically in Vite development mode. The campaign pilot exists only in test files and is not imported by the release.

Versions are locked in `package-lock.json`. An explicit esbuild 0.28.1 override was needed to install from the available offline npm cache. The production bootstrap intentionally contains Three.js in one bundle, about 149 kB gzip; this also allows the standalone HTML build.

[Implementation plan](.hermes/plans/2026-09-05-brinewake.md) · [Playtest evidence](docs/PLAYTEST.md) · [Screenshot status](docs/screenshots/README.md)
