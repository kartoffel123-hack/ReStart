# Test turntable release at every coaxial twist angle

- Captured: 2026-11-28T10:17:40.459Z
- HEAD at capture: `4fde388` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `8731c4801bcd9772`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Scoped geometry: 704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619
Bench pair: 4000041/L112 4000041/L192
Installed witness inside bottom (mm): 0.659563
-2.0 mm X, 360 degrees: 5 witnesses; continuous penetration bound 0.138746 mm
2.0 mm X, 360 degrees: 16 witnesses; continuous penetration bound 0.511568 mm
CT-V03: no rigid coaxial release or reverse insertion. Flex and kit function untested.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `CAD unittest (8 passed)`
- `tools.ct.turntable_bench`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-frozen-rollback` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-frozen-rollback` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 18.13 % since `2026-11-28-ct-frozen-rollback` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-frozen-rollback` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-frozen-rollback` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? "dist 3.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-bench-twist/
?? tests/ct/test_turntable_bench.py
?? tools/ct/__pycache__/
?? tools/ct/turntable_bench.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
