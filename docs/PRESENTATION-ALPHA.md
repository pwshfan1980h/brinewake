# Presentation alpha

## Changes
- Original layered synthesized weapon reports, missile ignition/thrust, heavier explosions and mechanical footsteps with capped sources and cleanup.
- Broader beveled combat-mech armor and articulated distance-driven planted-foot gait.
- Connected coastal backgrounds with grounded structures, layered sky/horizon and distinct chapter architecture.
- Missile bodies, pointed warheads, fins, rear exhaust and underwater bubble wakes.
- Combat, movement and campaign rules unchanged. ALPHA label retained.

## Verified before publication
- 98 unit tests in 10 files passed.
- TypeScript, production build and offline HTML generation passed.
- All 5 Playwright tests passed in one final run, including keyboard/mouse full campaign through all chapters, water regions, boss phases and victory; synthetic controller; settings/nested-path assets; damage/repair/death/restart.
- Start and pause/resume regression passed without page errors.
- Real Chromium offline audio renders passed bounded-output, non-silence, mute and source-cleanup checks. This is not a listening assessment.
- Screenshots inspected in `screenshots/presentation/`: chapter compositions, walking, missile and torpedo fixtures. Fixtures are not campaign-completion evidence; the full campaign has its own Playwright test.
- Independent bounded code review found no blockers.

## Test harness corrections
The nested-path test now uses an actual production asset mount at `/brinewake/`, rather than Vite's HTML fallback for missing nested assets. Synthetic controller start waits for its first poll and observed menu dismissal instead of tapping entirely during startup. Both regressions passed before the final full suite.

## Limits
Physical controller comfort/vibration, hardware performance and subjective audio balance remain unverified. Software-rendered automated browser timing is not a hardware FPS guarantee. The production bundle still raises Vite's advisory 500 kB chunk warning.

Earlier blocked-environment and screenshot-status notes in PLAYTEST.md describe the initial implementation environment and are superseded by the checks above.
