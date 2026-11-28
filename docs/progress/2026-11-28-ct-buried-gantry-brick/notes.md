# Exchange the hidden CT gantry support brick

- Captured: 2026-11-28T01:31:41.442Z
- HEAD at capture: `a472702` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `64fa436e7b00ebe1`
- Captures that differ from the previous capture set: **6 of 6**

## Verification rows touched

- CT-V03
- CT-V04
- CT-V05

## Commands actually run

- `npm run test:ct-data`
- `npm run test:e2e:ct (6 passed)`
- `npm run test:e2e (13 passed)`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `ct-gantry-locator--laptop-1280x800.png` | laptop-1280x800 | `2b4e7a4e045d` | first capture | The selector ghosts the two crown sections to identify the exact brick without beginning a repair. |
| `ct-gantry-locator--phone-390x844.png` | phone-390x844 | `2b4e7a4e045d` | first capture | The selector ghosts the two crown sections to identify the exact brick without beginning a repair. |
| `ct-crown--laptop-1280x800.png` | laptop-1280x800 | `c1db1e26d730` | first capture | All five pieces of the first roof section are highlighted together before lifting. |
| `ct-crown--phone-390x844.png` | phone-390x844 | `c1db1e26d730` | first capture | All five pieces of the first roof section are highlighted together before lifting. |
| `ct-gantry-brick--laptop-1280x800.png` | laptop-1280x800 | `ea6c18dfecc3` | first capture | With both roof sections parked, the turquoise separator reaches the middle two studs on the white gantry brick. |
| `ct-gantry-brick--phone-390x844.png` | phone-390x844 | `ea6c18dfecc3` | first capture | With both roof sections parked, the turquoise separator reaches the middle two studs on the white gantry brick. |

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
M README.md
 M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/operator-handoff.md
 M package.json
 M src/app/manual-scene-state.ts
 M src/app/pilot-data.ts
 M src/app/reviewer.tsx
 M src/app/stud-pilot.tsx
 M src/domain/planner.ts
 M src/presentation/stud-pilot.css
 M src/scene/stud-scene.tsx
 M tools/ct/compile.ts
 M tools/ct/site.ts
 M tools/ct/verify.ts
 M tools/model.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? assets/.DS_Store
?? docs/progress/2026-11-28-ct-buried-gantry-brick/
?? tests/ct/gantry.check.ts
?? tests/e2e/ct-gantry.spec.ts
?? tools/ct/gantry-brick.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
