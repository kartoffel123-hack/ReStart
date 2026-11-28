# Find what blocks both halves with the pins retained

- Captured: 2026-11-28T09:23:16.244Z
- HEAD at capture: `16794cd` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `2a38b3d499680315`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
{
  "scopedDigest": "704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619",
  "relativeLiftMm": 40.0,
  "reverseTravelFromRaisedMm": 43.0913,
  "witnesses": [
    {
      "member": "4000041/L112",
      "obstacle": "4000041/L331",
      "homeSurfacePointMm": [
        335.03247,
        44.02923,
        -80.03202
      ],
      "homeGapMm": 32.7707,
      "insideSolidMm": 0.7879
    },
    {
      "member": "4000041/L192",
      "obstacle": "4000041/L110",
      "homeSurfacePointMm": [
        350.93058,
        38.86127,
        -74.43834
      ],
      "homeGapMm": 37.9386,
      "insideSolidMm": 0.8291
    }
  ]
}
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `typecheck`
- `test:ct-data`
- `turntable-access.ts`
- `turntable_access_witness`
- `model:verify --profile demo`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-turntable-access` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-turntable-access` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-28-ct-turntable-access` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-turntable-access` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-turntable-access` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/operator-handoff.md
 M docs/plans/0.2.0/02-software-design-implementation-plan.md
 M tests/ct/turntable-access.check.ts
 M tools/ct/turntable-access.ts
 M tools/ct/turntable_fit.py
 M vite.config.ts
?? assets/.DS_Store
?? data/review/4000041/turntable-access.md
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-turntable-carrier/
?? tools/ct/__pycache__/
?? tools/ct/turntable_access_witness.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
