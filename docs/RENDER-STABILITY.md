# Rendering stability and dusk update

## Fixes
- World labels now project each rendered camera frame, using stable keyed DOM nodes. Previously their 0.08-second HUD timer left them behind a moving camera.
- Recessed structural platform bodies under their deck caps. Only the cap occupies the authoritative walkable top; collision heights and level geometry rules are unchanged. Previously both visible faces occupied that plane and competed in the depth buffer.
- Darker blue-hour/night sky and fog palettes, restrained cool architectural edge strips and warm practical/window accents. Foreground lighting and water readability retained; no extra per-building dynamic lights.

## Evidence
- 104 unit tests pass, including all-chapter deck-top uniqueness and dusk architecture regressions.
- TypeScript, production bundle and standalone HTML build pass.
- `check-anchors.mjs` measured up to 23.0477px anchor error on the preceding live release; fixed production measurements are below 0.03px over 70 left/right movement frames.
- `check-rendering.mjs` exercised real left/right movement in all three chapter fixtures, with no page errors. Vertical raycasts find the cap at the collision top and the structural surface 0.2 units beneath it, rather than two differently colored surfaces at the top.
- Production captures of all chapters, walking, missiles and underwater treatment inspected; see `screenshots/presentation/` and `screenshots/rendering/`.
- Start and pause/resume regression passed.
- All five browser tests passed after the anchoring/surface fixes. A later full-suite rerun with the dusk palette timed out with the campaign pilot stalled near the chapter-two terrace at 83m; first-paint, synthetic controller and settings/nested-path checks passed in that run. An isolated retry of the final production campaign passed through all three chapters, all water regions and boss phases to victory in 3.4 minutes. The timeout is retained here as evidence of a timing-sensitive automation run; it is not erased by the retry.

The release fixture now uses an exclusive port with server reuse disabled, preventing a leftover development server from being mistaken for the production asset server. Physical controller comfort and hardware FPS remain unverified; the existing large-bundle advisory remains.
