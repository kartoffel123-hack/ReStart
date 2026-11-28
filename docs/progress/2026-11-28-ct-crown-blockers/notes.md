# Measure what traps the internal CT gantry brick

- Captured: 2026-11-28T01:26:07.609Z
- HEAD at capture: `c558482` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `31aa97100b122c6e`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Generation: bf3164512bb2367c02eeba0970c7ecf7c883b08c38bf44b4a50a23ad49f69d79
Brick exit: L208, 12.8 mm column overlap
Tool approach: L254, 8.98 mm column overlap
Two intact five-piece sections; operator grip remains unverified.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `tools.ct.gantry_clearance`
- `npm run test:ct-data`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-surface-fidelity` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-surface-fidelity` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 24.31 % since `2026-11-28-ct-surface-fidelity` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-surface-fidelity` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-surface-fidelity` — drop it with `--only`, or render this commit’s output with `--evidence-file`

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
 M tools/ct/requirements-cad.txt
 M tools/ct/verify.ts
 M tools/model.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? assets/.DS_Store
?? data/review/4000041/gantry-brick.json
?? docs/progress/2026-11-28-ct-buried-gantry-brick/
?? docs/progress/2026-11-28-ct-crown-blockers/
?? tests/ct/gantry.check.ts
?? tests/e2e/ct-gantry.spec.ts
?? tools/ct/gantry-brick.ts
?? tools/ct/gantry_clearance.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
