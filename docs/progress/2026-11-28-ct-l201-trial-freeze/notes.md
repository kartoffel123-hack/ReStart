# Freeze the gantry manual for an independent kit trial

- Captured: 2026-11-28T10:06:20.487Z
- HEAD at capture: `afcf700` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `932df2791b87e5d2`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
30465 index 7b7668fb6110860e7ce9ed7634f7c3a691b491b80d491530e0ad8dc7cdefde74 procedure 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
4000041 index c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45 procedure 5c500211464f9a7e9a80c5ec485a24f9081180d71b0bda7bebfe1cfddeadc46f
Verified frozen ZIP and extracted site: b1db600444284e3ac44b3aa2001e390a2abc1df43bb4852c9ccabe2a0f2b3070
CT-V08 physical data: not collected
~~~

## Verification rows touched

- CT-V08

## Commands actually run

- `model:verify --profile demo`
- `verify frozen ZIP and both package indexes`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-facing-provenance` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-facing-provenance` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 13.18 % since `2026-11-28-ct-facing-provenance` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-facing-provenance` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-facing-provenance` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M vite.config.ts
?? assets/.DS_Store
?? data/review/4000041/l201-trial-freeze.json
?? data/review/4000041/l201-trial-sheet.md
?? "dist 2.zip"
?? "dist 3.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-l201-trial-freeze/
?? tools/ct/__pycache__/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
