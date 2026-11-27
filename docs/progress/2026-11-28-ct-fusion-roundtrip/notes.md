# Round-trip real CT sample through Fusion STEP

- Captured: 2026-11-27T23:52:39.379Z
- HEAD at capture: `f768c7a` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `82ccba5167cdb4d4`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
5/5 source placements matched by definition and pose, 22 positive-volume solids; STEP SHA-256 6504b8d595a3c5720445b193396b78122ca30c9f78fa31f391abf66b0f9b2f37
CT-03: 89/114 candidate definitions reconstructed; 25 require geometry repair. Not approved for promotion.
~~~

## Verification rows touched

- CT-V01
- CT-V02

## Commands actually run

- `python3 -B -m tools.ct.surfaces`
- `tools.ct.solids`
- `Fusion assemble(sample=True)`
- `tools.ct.check_step --sample`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-source-placements` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-source-placements` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 15.56 % since `2026-11-28-ct-source-placements` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-source-placements` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-source-placements` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
?? assets/.DS_Store
?? docs/progress/2026-11-28-ct-fusion-roundtrip/
?? tests/data/test_ct_surfaces.py
?? tools/ct/check_step.py
?? tools/ct/fusion_assembly.py
?? tools/ct/requirements-cad.txt
?? tools/ct/solids.py
?? tools/ct/surfaces.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
