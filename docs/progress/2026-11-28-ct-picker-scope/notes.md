# Show only the MRI and Mid section on the CT route

- Captured: 2026-11-28T09:41:09.155Z
- HEAD at capture: `35f3d2a` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `61d31ec4cefa5f41`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- CT-V02
- CT-V05

## Commands actually run

- `model:ct-stage`
- `build`
- `test:e2e:ct`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `ct-picker--laptop-1280x800.png` | laptop-1280x800 | `c65c75fb1043` | 11.93 % since `2026-11-28-ct-operator-handoff` | The normal CT picker renders only the MRI and Mid section: 284 pieces, without string or room scenery. |
| `ct-picker--phone-390x844.png` | phone-390x844 | `c65c75fb1043` | 18.17 % since `2026-11-28-ct-operator-handoff` | The normal CT picker renders only the MRI and Mid section: 284 pieces, without string or room scenery. |

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
 M src/app/stud-pilot.tsx
 M src/scene/stud-scene.tsx
 M tests/ct/turntable-access.check.ts
 M tests/e2e/ct-gantry.spec.ts
 M tests/e2e/ct-manual.spec.ts
 M tests/e2e/ct-scoped.spec.ts
 M tools/ct/site.ts
 M tools/ct/turntable-blockers.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-picker-scope/
?? tools/ct/__pycache__/
?? tools/ct/side-wall.ts
?? tools/ct/side_wall_fit.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
