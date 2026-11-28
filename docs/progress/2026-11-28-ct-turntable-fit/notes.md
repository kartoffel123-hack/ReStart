# Check the two axial exits of the MRI turntable

- Captured: 2026-11-28T09:12:04.736Z
- HEAD at capture: `610baff` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `f8502018383504b7`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
{
  "geometrySha256": "704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619",
  "top": "4000041/L112",
  "bottom": "4000041/L192",
  "witnesses": [
    {
      "strokeXMm": -2,
      "topPointMm": [
        340.71604,
        70.41444,
        -49.70404
      ],
      "initialGapMm": 0.4747,
      "insideBottomMm": 0.2471
    },
    {
      "strokeXMm": 2,
      "topPointMm": [
        337.96026,
        63.96479,
        -58.26848
      ],
      "initialGapMm": 0.283,
      "insideBottomMm": 0.7176
    }
  ]
}
~~~

## Verification rows touched

- CT-V03
- CT-V05

## Commands actually run

- `tools.ct.turntable_fit`
- `test:ct-data (4 passed)`
- `test:e2e:ct (7 passed)`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-scoped-compiler` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-scoped-compiler` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-28-ct-scoped-compiler` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-scoped-compiler` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-scoped-compiler` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/gantry-brick.json
 M data/review/4000041/operator-handoff.md
 M tests/ct/clearance.check.ts
 M tools/ct/requirements-cad.txt
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-turntable-fit/
?? tests/e2e/ct-scoped.spec.ts
?? tools/ct/__pycache__/
?? tools/ct/turntable_fit.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
