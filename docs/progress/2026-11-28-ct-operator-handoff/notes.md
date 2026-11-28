# Stage the surface-checked CT manual for the operator

- Captured: 2026-11-28T01:01:31.028Z
- HEAD at capture: `233118d` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `e4a0fcb7a041bad4`
- Captures that differ from the previous capture set: **4 of 4**

## Verification rows touched

- CT-V04
- CT-V05
- CT-V06
- CT-V09

## Commands actually run

- `npm run test:ct-data`
- `npm run test:e2e:ct`
- `npm run test:e2e -- --workers=2`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `ct-picker--laptop-1280x800.png` | laptop-1280x800 | `473d23203eb5` | 2.52 % since `2026-11-28-ct-mechanic-tile` | The full scanner and all 566 selectable source placements. |
| `ct-picker--phone-390x844.png` | phone-390x844 | `473d23203eb5` | 26.25 % since `2026-11-28-ct-mechanic-tile` | The full scanner and all 566 selectable source placements. |
| `ct-tile--laptop-1280x800.png` | laptop-1280x800 | `20c68acc8e9c` | 2.93 % since `2026-11-28-ct-bench-framing` | Remove one specific white grooved tile at the end of the long wall. |
| `ct-tile--phone-390x844.png` | phone-390x844 | `20c68acc8e9c` | 1.18 % since `2026-11-28-ct-bench-framing` | Remove one specific white grooved tile at the end of the long wall. |

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
 M package.json
 M src/app/dof-overview.tsx
 M src/app/package-loader.ts
 M src/app/stud-pilot.tsx
 M src/scene/stud-scene.tsx
 M tests/e2e/ct-manual.spec.ts
 M tools/ct/compile.ts
 M tools/ct/import.ts
 M tools/ct/site.ts
 M tools/ct/verify.ts
?? assets/.DS_Store
?? data/review/4000041/operator-handoff.md
?? docs/progress/2026-11-28-ct-operator-handoff/
?? tests/ct/
?? tools/ct/generation.ts
?? tools/ct/pack_site.py
?? tools/ct/patterns.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
