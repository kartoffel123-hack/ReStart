# Reconcile the alternate CT inventory

- Captured: 2026-11-28T00:37:13.660Z
- HEAD at capture: `70406b1` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `fecf92e31fe8f40e`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
566 physical placements; 114 root references; 409 resolved drawable definitions; 565 distinct Studio IDs
.tmp/ct/source.json: source SHA-256 b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2
Alternate XML omissions: ['88738_raw.dat', '3068bp71.dat', '96874.dat']
CT-03: source-surface replay is required as well as a pose match.
~~~

## Verification rows touched

- CT-V01

## Commands actually run

- `python3 -B -m tools.ct.source`
- `unittest source fixtures`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-cutover-check` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-cutover-check` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 16.30 % since `2026-11-28-ct-cutover-check` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-cutover-check` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-cutover-check` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M tests/data/test_ct_source.py
 M tools/ct/fusion_assembly.py
 M tools/ct/import.ts
 M tools/ct/solids.py
 M tools/ct/source.py
 M tools/ct/verify.ts
?? assets/.DS_Store
?? docs/progress/2026-11-28-ct-xml-reconciliation/
?? tests/geometry/test_ct_fidelity.py
?? tools/ct/fidelity.py
?? tools/ct/patterns.py
?? tools/ct/resample.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
