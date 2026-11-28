# Measure the intact MRI turntable access corridor

- Captured: 2026-11-28T09:18:10.110Z
- HEAD at capture: `cb313f3` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `29cdc462f5713964`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
up: 51 installed obstacles
positiveX: 150 installed obstacles
negativeX: 64 installed obstacles
With both caps parked: outward 43,0,0, return 0,0,43. blocked after both crown sections parked.
Remaining IDs: 4000041/L110, 4000041/L121, 4000041/L137, 4000041/L138, 4000041/L147, 4000041/L148, 4000041/L149, 4000041/L180, 4000041/L181, 4000041/L182, 4000041/L183, 4000041/L184, 4000041/L185, 4000041/L186, 4000041/L187, 4000041/L188, 4000041/L189, 4000041/L190, 4000041/L191, 4000041/L194, 4000041/L195, 4000041/L196, 4000041/L212, 4000041/L214, 4000041/L215, 4000041/L217, 4000041/L218, 4000041/L225, 4000041/L228, 4000041/L237, 4000041/L240, 4000041/L294, 4000041/L295, 4000041/L298, 4000041/L299, 4000041/L301, 4000041/L316, 4000041/L317, 4000041/L318, 4000041/L319, 4000041/L331, 4000041/L332, 4000041/L68. Outside demo: none.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `typecheck`
- `test:ct-data`
- `tools/ct/turntable-access.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-turntable-fit` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-turntable-fit` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-28-ct-turntable-fit` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-turntable-fit` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-turntable-fit` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-turntable-access/
?? tests/ct/turntable-access.check.ts
?? tools/ct/__pycache__/
?? tools/ct/turntable-access.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
