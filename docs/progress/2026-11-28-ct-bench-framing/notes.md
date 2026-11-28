# Keep the CT tile and instruction visible on the bench

- Captured: 2026-11-28T00:29:14.919Z
- HEAD at capture: `272efda` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `2318359af8008517`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- CT-V05

## Commands actually run

- `npm run build`
- `npm run test:e2e:ct`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `ct-tile--laptop-1280x800.png` | laptop-1280x800 | `20c68acc8e9c` | 8.41 % since `2026-11-28-ct-mechanic-tile` | Remove one specific white grooved tile at the end of the long wall. |
| `ct-tile--phone-390x844.png` | phone-390x844 | `20c68acc8e9c` | 53.76 % since `2026-11-28-ct-mechanic-tile` | Remove one specific white grooved tile at the end of the long wall. |

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
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M src/app/stud-pilot.tsx
 M src/presentation/manual-contract.ts
 M src/presentation/manual-screen.css
 M src/presentation/manual-screen.tsx
 M src/scene/stud-scene.tsx
 M tests/data/test_ct_source.py
 M tests/e2e/ct-manual.spec.ts
 M tools/ct/fusion_assembly.py
 M tools/ct/import.ts
 M tools/ct/solids.py
 M tools/ct/source.py
 M tools/ct/verify.ts
?? assets/.DS_Store
?? docs/progress/2026-11-28-ct-bench-framing/
?? tests/geometry/test_ct_fidelity.py
?? tools/ct/fidelity.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
