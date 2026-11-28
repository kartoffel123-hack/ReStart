# Isolate manual and graph loading by dataset

- Captured: 2026-11-28T00:01:22.137Z
- HEAD at capture: `46b25a2` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `d9e84831fba095a6`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  33 passed (33)
      Tests  277 passed (277)
  13 passed (36.3s)
Legacy pilot: 13/13 browser scenarios at 2 workers; CT-V05 still needs a CT browser run.
~~~

## Verification rows touched

- CT-V05
- CT-V06
- CT-V09

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e -- --workers=2`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-fusion-roundtrip` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-fusion-roundtrip` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 8.33 % since `2026-11-28-ct-fusion-roundtrip` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-fusion-roundtrip` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-fusion-roundtrip` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M src/app/App.tsx
 M src/app/checkpoint.ts
 M src/app/dependency-graph.tsx
 M src/app/dof-overview.tsx
 M src/app/package-loader.ts
 M src/app/pilot-data.ts
 M src/app/reviewer.tsx
 M src/app/stud-pilot.tsx
 M src/presentation/piece-picker-screen.tsx
 M src/scene/stud-scene.tsx
 M tools/ct/check_step.py
 M tools/ct/requirements-cad.txt
 M tools/ct/solids.py
 M tools/pilot/run.ts
?? assets/.DS_Store
?? docs/progress/2026-11-28-ct-dataset-loader/
?? src/app/dataset.ts
?? tests/integration/dataset.test.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
