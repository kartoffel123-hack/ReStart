# Select the MRI and Mid section without the string

- Captured: 2026-11-28T08:58:33.511Z
- HEAD at capture: `72c9521` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `1d5f7e6b254e231f`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Archive SHA-256: b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2
Full source: 566 placements
Demo: {'MRI': 270, 'Mid section': 14} 284 pieces
L111 string excluded. L112 black toothed top retained; L192 is the bottom.
CT-03: scoped STEP export awaiting closure of Fusion Properties dialog.
~~~

## Verification rows touched

- CT-V01
- CT-V02

## Commands actually run

- `python3 -B -m unittest discover -s tests/ct`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-crown-blockers` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-crown-blockers` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 7.02 % since `2026-11-28-ct-crown-blockers` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-crown-blockers` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-crown-blockers` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M docs/plans/0.2.0/01-software-design-plan.md
 M docs/plans/0.2.0/02-software-design-implementation-plan.md
 M docs/plans/0.2.0/03-software-verification-plan.md
 M tools/ct/check_step.py
 M tools/ct/fusion_assembly.py
 M vite.config.ts
?? assets/.DS_Store
?? data/review/4000041/demo-assembly.json
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-demo-scope/
?? tests/ct/test_demo_assembly.py
?? tools/ct/demo_assembly.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
