# BRINEWAKE — implementation and playtest evidence

## Alpha start-screen hotfix

The published alpha exposed a CSS cascade bug: `#menu:not(.title)` overrode the hidden menu's `display:none`, leaving the title overlay over a running game. Restricted the panel selector to non-hidden menus. `scripts/check-start.mjs` reproduced the failure against the original live build, then passed locally after the fix (start and pause/resume, zero page errors). The real Chromium first-paint/keyboard-movement/aim/fire/guide/pause test also passed locally. All 82 unit tests and production build passed. The earlier blocked-environment notes below are historical; full browser campaign verification remains outstanding.


Updated 2026-09-06. This log distinguishes executed checks from authored tests and blocked verification. **The complete campaign passed in the deterministic simulation; real browser gameplay, screenshot inspection, audio listening and physical controller play have not been completed.**

## Executed results

The final command outputs are retained in `docs/results/`. Use those files for the exact final counts and sizes.

| Check | Result | What it proves |
|---|---|---|
| Vitest | 82 tests, 8 files passing | Movement, water, aiming, actual Three.js muzzle transforms, combat, boss phases, checkpoint semantics, input buffering, synthetic controller mapping, menu navigation logic, original scene construction and complete campaign simulation |
| TypeScript / Vite production build | Passed | Typecheck, static bundle generation and standalone offline HTML generation |
| Playwright test discovery | 5 tests registered | Test files parse and register; **not browser execution** |
| Complete normal-input simulation pilot | Victory | Tutorial plus all three chapters, immersion in every chapter, both pump interlocks and lift, all boss phases; no teleports, health edits, instant kills or level skips |
| Independent code review | Two passes completed | Concrete defects identified and fixed with regressions; final source inspected independently |
| Chromium browser launch | Blocked by environment | No visual or gameplay result |
| HTTP dev/preview server | Blocked by environment | No successful HTTP browser session or repository-subpath check |
| WebKit / physical Safari | Not run | Unverified |
| Physical gamepad / vibration | Not run | Unverified |

### Recorded campaign pilot

`src/tests/full-campaign.test.ts` constructs a fresh `Campaign` and repeatedly supplies normal `Input` values from `tests/e2e/pilot.ts`. The pilot only reads detached state. This is automated simulation, not a person playing, and not a rendered browser run.

The latest recorded run:

- **Victory and observed-action tutorial complete**.
- **73.27 simulated seconds; 4,396 fixed ticks**.
- Level transitions at **15.37 s** and **37.62 s**.
- Levels visited: **0, 1, 2**; submerged in **0, 1, 2**.
- Boss phases visited: **0, 1, 2**.
- Minimum armor **72**; two repair starts; two received damage events; 167 weapon events; final armor **100**.
- No deaths or direct state shortcuts in this campaign run. Separate fixtures exercise defeat and checkpoint restoration.

The pilot knows authored route coordinates and aims precisely. Its completion time does **not** estimate a new player’s campaign duration or demonstrate subjective challenge/fun. It originally stalled above a relay on a grated platform and at a terrace lip; adding explicit downward and fresh jump inputs resolved the route without teleportation. The lift implementation was also refined after the pilot exposed a dismount/recovery issue.

### Coverage details

- Dry/wading/surface/submerged boundaries, hysteresis, exit, diagonal normalization, drag, bounded currents, underwater surge, submerged grated drop-through, wading speed and recovery.
- Acceleration, jump buffering, coyote time, held jet fuel, surge cooldown, one-way landing/drop and high-speed segment collision.
- Behind-player/near-zero aim; radial deadzone and last direction; actual articulated socket position and barrel direction while strafing/airborne; ray/plane round-trip at 16:9, 4:3 and 9:16; boss arena framing when aiming away.
- Repeater heat/cadence, arc charge/release, guided pods below water, muzzle obstruction, earliest cover collision, shield reduction, repair interruption, death and reset.
- Exactly three levels, exactly one final boss, ordered relays, corrupted-save fallback, safe resource restoration, physically carried floodgate lift and immediate pre-boss checkpoint.
- Full boss tells, executions, recovery windows, damage reduction, locked target position and attack phase held through its warning.
- Edge events delivered once at 120/144/240 Hz input cadence; pointer button roles; standard synthetic gamepad trigger/jump/aim; blur/disconnect clearing; menu-accept suppression; contextual Back; keyboard default handling.
- All three original scenes construct with finite vertex data, fewer than 450 mesh objects per chapter after static batching, intact dynamic machinery, and no retained prior-stage children. These are **CPU geometry checks, not WebGL shader or pixel tests**.

## Browser attempts and concrete blockers

1. `npm run test:e2e` attempted to start Vite at `127.0.0.1:4173`. The managed shell returned `listen EPERM: operation not permitted 127.0.0.1:4173` before browser tests started.
2. A direct Playwright Chromium startup using the installed Chromium headless shell was also attempted. macOS denied `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`, and the browser process terminated. No test page rendered.
3. The available Node runtime was checked for a normal local production HTTP server; it also returned `listen EPERM`. No server was left running.
4. A self-contained offline artifact was produced. The computer-use browser tool rejected opening its `file://` URL: **“The browser URL policy blocks this action.”** Its instruction prohibited bypasses, and no file-URL workaround was attempted.
5. The user was asked to start a standard localhost HTTP server outside the sandbox. That external-state change is still pending in this log.

These failures are environment restrictions, not passing tests and not proof the browser runtime is error-free. `npm run test:e2e -- --list` successfully lists five tests; **zero Playwright browser tests have passed in this environment**. No fake screenshots were produced.

## Playwright suite ready for an unrestricted local terminal

```sh
npm ci
npx playwright install chromium
npm run build
npm run test:e2e
```

The runner serves the production bundle using `npm run preview`, at 1440×900 by default. It contains:

1. First paint, keyboard movement, pointer aim, repeater fire, jet pose, guide and pause.
2. Full campaign through ordinary keyboard/mouse events, all water regions, all boss phases and victory, with screenshots and raw frame-interval evidence.
3. Synthetic standard gamepad menu acceptance, shoulder jump, strafe/right-stick aim, RT firing, disconnect pause. **This is explicitly not physical hardware verification.**
4. Persisted settings, guide, compact resize and a `/brinewake/` nested URL.
5. Actual enemy damage, field patch attempt, hull defeat and checkpoint restart.

The browser campaign driver has not yet been tuned against real rendered-frame timing. Its authored tests may reveal further issues or need driver adjustments; their success is not assumed. Screenshot destinations are listed in `docs/screenshots/README.md`. Browser traces and the HTML report are produced only when the runner can execute.

## Independent review and resulting fixes

The approved plan explicitly requested independent review. A separate read-only reviewer performed two bounded passes; no Moonsec source/assets were consulted or copied.

Fixed findings:

- Buffered action edges so high-refresh render frames cannot discard jump, surge, missile or repair presses before a fixed tick.
- Re-read the on-disk plan when the source-audit correction changed during implementation; updated mouse controls, tutorial, guide, HUD and tests to RMB repeater / LMB arc.
- Allowed downward input through submerged grated platforms.
- Made boss shots follow the exact saved target shown by the telegraph, and latched attack phase for the full warning.
- Enforced relay order so count-based checkpoint persistence cannot change objective identity.
- Added arena camera framing independent of aim, including narrow aspect ratios; delayed boss entry and added an arena checkpoint.
- Derived frame diagnostics from raw RAF intervals rather than capped simulation deltas.
- Routed controller Back by the current menu; stopped menu acceptance leaking into gameplay and stopped custom handling from doubling native keyboard form actions.

Other refinements: static scenery batching, receiver recoil separated from a stable real barrel socket, water-plane pointer alignment, interpolated leg/chassis motion, wading splashes, repair sparks, boss entrance/recovery poses, lower-effects settings and an empty-lift recovery rule.

## Remaining verification and scope limits

- **Browser visual QA is outstanding.** No representative action, water, chapter or victory screenshot was actually captured. The visual design, shader appearance, text layout and all-action animation checklist require inspection in a real rendered session.
- **Browser campaign and nested-path loading are outstanding.** A successful production build is not a browser gameplay pass. Console/network cleanliness, actual focus/resize behavior and real DOM menu navigation remain unverified.
- **Performance is unmeasured in a browser.** The 60 fps goal remains a target. Draw calls are reduced through batching, effects are capped at 360 instances, projectile visuals at 256 instances, pixel ratio is capped and low effects are available. CPU geometry counts are not GPU performance evidence.
- **Physical controller comfort and vibration are unverified.** Standard Gamepad API mapping has synthetic tests, presets and an adjustable radial deadzone. No physical controller claim is made.
- **Audio listening is outstanding.** Audio is original browser synthesis, not recorded Foley; actual levels, musical balance and underwater filtering need a listening pass. AudioContext only starts after interaction, but browser autoplay behavior is not tested here.
- Water is stylized authored-volume buoyancy/drag and shader ripples/foam/caustic-like color patterns, not fluid simulation. Lighting uses emissive materials and restrained light variation; a postprocessed selective-bloom pass was deliberately omitted pending browser performance evidence.
- The five enemy families use concise geometric rigs and shared hit/death effects. The boss has three attack phases within one encounter. This is a short authored campaign, not an inventory/progression game.
- The production bootstrap is a single Three.js bundle and triggers Vite’s default 500 kB uncompressed chunk advisory. It is roughly 149 kB gzip and enables the standalone HTML. This is an advisory, not a failed build.

No remote repository, hosting project, upload or deployment was created. All deliverables are local. The working tree remains uncommitted because `.git` is read-only under the session permissions.
