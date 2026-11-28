# Compare raw Studio faces with the reopened facing solids

- Captured: 2026-11-28T09:58:08.906Z
- HEAD at capture: `643316f` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `27a62661c48ed74d`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Archive: b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2
STEP: 33be022914d8b8d0aeed30eb2810f4c429eb19c8d517933449f653fb14056f39
Raw-face estimate (six-direction majority at 0.05 mm): 79.894 mm3
Reopened STEP solid intersection: 82.898079 mm3
CT-V03: source has open drawing seams; do not infer a kit fit.
~~~

## Verification rows touched

- CT-V02
- CT-V03

## Commands actually run

- `test_facing_origin`
- `tools.ct.facing_origin`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-facing-solids` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-facing-solids` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 26.15 % since `2026-11-28-ct-facing-solids` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-facing-solids` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-facing-solids` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? "dist 3.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-facing-origin/
?? tests/ct/test_facing_origin.py
?? tools/ct/__pycache__/
?? tools/ct/facing_origin.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
