# Distinguish tile fit from round-brick interference

- Captured: 2026-11-28T09:35:15.509Z
- HEAD at capture: `2bd70bd` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `cbb93d4125991795`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Scoped GLB: 704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619
Black tile: 2 opposing grip patches; max nominal swept overlap 0.00118872 mm3.
5 micron cube half-width: tile core has 0 intersections.
Bridge vs L248 overlap (mm3), home -> +2 mm: [0.816111, 0.969156]
4000041/L184 inside 4000041/L192 0.2067 mm at + 2 mm lift.
4000041/L331 inside 4000041/L149 0.6667 mm at + 2 mm lift.
4000041/L112 inside 4000041/L237 0.8318 mm at + 42 mm lift.
CT-V03: no gear exchange; thin-jaw fit and pin retention need kit review.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `typecheck`
- `test:ct-data (7 passed)`
- `CAD unittest (4 passed)`
- `tools.ct.blocker_fit`
- `model:verify --profile demo`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-blocker-trays` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-blocker-trays` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 25.39 % since `2026-11-28-ct-blocker-trays` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-blocker-trays` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-blocker-trays` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/turntable-access.md
 M docs/plans/0.2.0/02-software-design-implementation-plan.md
 M tools/ct/requirements-cad.txt
 M tools/ct/turntable-blockers.ts
 M vite.config.ts
?? assets/.DS_Store
?? data/review/4000041/turntable-blocker-trials.md
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-blocker-fit/
?? tests/ct/test_blocker_fit.py
?? tools/ct/__pycache__/
?? tools/ct/blocker_fit.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
