# Test the side wall before the turntable bridge

- Captured: 2026-11-28T09:42:03.409Z
- HEAD at capture: `ea41802` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `592b8828b30766dd`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
CT generation: c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45
Bridge / shifted wall intersections: 0 at [-0.21, 0, 0] mm
brickRemoval 4000041/L248 vs 4000041/L127 0.000134 -> 8.446372 mm3
wallAndPlateShift 4000041/L230 vs 4000041/L273 0.0 -> 2.102863 mm3
wallAndPlateRemoval 4000041/L230 vs 4000041/L214 8e-06 -> 110.324094 mm3
CT-V03: wall tray still unreachable on these strokes; no new manual.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `side-wall.ts`
- `tools.ct.side_wall_fit`
- `typecheck`
- `test:ct-data (8 passed)`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-blocker-fit` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-blocker-fit` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 22.44 % since `2026-11-28-ct-blocker-fit` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-blocker-fit` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-blocker-fit` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/turntable-blocker-trials.md
 M tests/ct/turntable-access.check.ts
 M tools/ct/turntable-blockers.ts
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-side-wall-release/
?? tools/ct/__pycache__/
?? tools/ct/side-wall.ts
?? tools/ct/side_wall_fit.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
