# Measure installed facing interference before bench release

- Captured: 2026-11-28T09:51:55.441Z
- HEAD at capture: `1cb8e79` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `9a4ea2355341c1a4`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Generation: c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45
Nominal solid overlap (mm3): installed -> intermediate pose
side 4000041/L127 vs 4000041/L126 0.001697 -> 0.001775
side 4000041/L129 vs 4000041/L300 82.898065 -> 62.544593
sideTogether 4000041/L129 vs 4000041/L300 82.898065 -> 62.544593
up 4000041/L127 vs 4000041/L141 1.2e-05 -> 4.307934
up 4000041/L129 vs 4000041/L142 0.027739 -> 4.342011
side 4000041/L248 vs 4000041/L127 0.000134 -> 8.446372
side 4000041/L331 vs 4000041/L248 0.816111 -> 0.969156
CT-V03: no facing tray reached; inspect installed L129/L300 fit.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `facing_fit`
- `test:ct-data`
- `CAD unittest`
- `model:verify --profile demo`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-facings-installed` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-facings-installed` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 23.41 % since `2026-11-28-ct-facings-installed` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-facings-installed` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-facings-installed` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/rail-plate-sequence.md
 M vite.config.ts
?? assets/.DS_Store
?? data/review/4000041/facing-access.md
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-facing-solids/
?? tools/ct/__pycache__/
?? tools/ct/facing_fit.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
