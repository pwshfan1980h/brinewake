# Screenshot evidence

These are real Chromium captures, not intended output paths. The initial implementation worker's browser restrictions no longer prevent capture.

- `01-title.png`, `02-quay-jet.png`: title and active movement/jet.
- `campaign-level0.png` through `campaign-level2.png`: full campaign browser driver.
- `campaign-water0.png` through `campaign-water2.png`: campaign water regions.
- `campaign-boss0.png` through `campaign-boss2.png`, `10-victory.png`: boss phases and campaign victory.
- `11-synthetic-gamepad.png`: emulated controller, not physical hardware evidence.
- `12-compact-viewport.png`: compact layout.
- `13-field-patch.png`, `14-hull-offline.png`: recovery and defeat.
- `presentation/`: isolated saved-checkpoint fixtures for art inspection, walking, missile and torpedo. These are not campaign-completion evidence. `presentation/before/` retains the preceding visual baseline.

See `../PRESENTATION-ALPHA.md` for test results and remaining limits. New test runs can refresh captures; screenshot existence alone does not establish that a test passed.
