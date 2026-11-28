# Exchange the back-room tile in the CT manual

- Captured: 2026-11-28T00:19:34.767Z
- HEAD at capture: `50518da` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `ac7543a3c31cf15f`
- Captures that differ from the previous capture set: **4 of 4**

## Verification rows touched

- CT-V04
- CT-V05

## Commands actually run

- `model:import`
- `model:compile`
- `model:verify --profile demo`
- `npm run build`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `ct-picker--laptop-1280x800.png` | laptop-1280x800 | `d6d62b07fdb5` | first capture | The full scanner and all 566 selectable source placements. |
| `ct-picker--phone-390x844.png` | phone-390x844 | `d6d62b07fdb5` | first capture | The full scanner and all 566 selectable source placements. |
| `ct-tile--laptop-1280x800.png` | laptop-1280x800 | `eebe63416238` | first capture | Remove one specific white grooved tile at the end of the long wall. |
| `ct-tile--phone-390x844.png` | phone-390x844 | `eebe63416238` | first capture | Remove one specific white grooved tile at the end of the long wall. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

Nothing was dropped: every capture in this folder is either a built screen, a
capture that differs from the previous commit, or the only image this commit has.

## Unchanged since the previous capture

Nothing here repeats the previous commit’s capture.

## Working tree at capture

```
M .gitignore
 M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M package.json
 M playwright.config.ts
 M src/app/package-loader.ts
 M src/app/reviewer.tsx
 M src/app/stud-pilot.tsx
 M src/scene/stud-scene.tsx
 M tests/e2e/buried-pin.spec.ts
 M tests/e2e/cross-block.spec.ts
 M tests/e2e/joint-repair.spec.ts
 M tests/e2e/light-stud.spec.ts
 M tests/e2e/picker-layout.spec.ts
 M tests/e2e/review-session.spec.ts
 M tools/ct/source.py
 M tools/pilot/geometry.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
 M tools/verify/site-run.ts
?? assets/.DS_Store
?? data/review/4000041/demo-targets.json
?? data/review/4000041/evidence.json
?? docs/progress/2026-11-28-ct-mechanic-tile/
?? tests/e2e/ct-manual.spec.ts
?? tests/integration/ct-checkpoint.test.ts
?? tools/ct/compile.ts
?? tools/ct/evidence.ts
?? tools/ct/import.ts
?? tools/ct/site.ts
?? tools/ct/tile-clearance.ts
?? tools/ct/verify.ts
?? tools/model.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
