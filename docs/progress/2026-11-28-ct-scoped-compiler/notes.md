# Compile the two-group CT without a back-room repair

- Captured: 2026-11-28T09:05:07.588Z
- HEAD at capture: `217ca4d` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `df042c9ca68839b2`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~

> restart-manual@0.1.0 model:verify
> tsx tools/model.ts verify --dataset 4000041 --profile demo

CT 93007b34a99afa519c52de1bdbd24372e283788b30a9d72efc170a973dacd0df: 284/284 scoped source, STEP, GLB and inventory IDs; 1 complete modeled exchange; 283 unavailable; 0 physically verified. Buried brick 1e434d2484993059e93935d7eafaf6bd6e78fe46922e0935206450e73187e47f; 10 healthy pieces in two intact sections.
{"schemaVersion":1,"stage":"candidate","path":"candidates/197341fd60036d4eb759f4cbee890df846532d6cd523834d3b3a0aa40d64c427/"}
~~~

## Verification rows touched

- CT-V01
- CT-V02
- CT-V04

## Commands actually run

- `model:import`
- `test:ct-data (4 passed)`
- `model:compile`
- `model:verify --profile demo`
- `typecheck`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-demo-scope` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-demo-scope` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 30.79 % since `2026-11-28-ct-demo-scope` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-demo-scope` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-demo-scope` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/demo-assembly.json
 M tools/ct/compile.ts
 M tools/ct/gantry-brick.ts
 M tools/ct/import.ts
 M tools/ct/site.ts
 M tools/ct/verify.ts
 M tools/model.ts
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-scoped-compiler/
?? tests/ct/scoped-compiler.check.ts
?? tools/ct/__pycache__/
?? tools/ct/demo_clearance.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
