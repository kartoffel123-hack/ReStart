# Require independent records before CT becomes the default

- Captured: 2026-11-28T00:27:15.234Z
- HEAD at capture: `156035d` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `25ce48b7be421d05`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  3 passed (3)
      Tests  9 passed (9)
  3 passed (24.0s)
  13 passed (25.6s)
CT-07: zero signed trials; building with CT as the default requires a matching ledger and both browser records.
~~~

## Verification rows touched

- CT-V07
- CT-V08
- CT-V09

## Commands actually run

- `vitest integration`
- `helicopter and CT Playwright`
- `model:verify --profile bench`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-fusion-complete` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-fusion-complete` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 8.16 % since `2026-11-28-ct-fusion-complete` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-fusion-complete` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-fusion-complete` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M src/app/App.tsx
 M src/app/dataset.ts
 M tests/data/test_ct_source.py
 M tests/integration/package-loader.test.ts
 M tools/ct/compile.ts
 M tools/ct/import.ts
 M tools/ct/site.ts
 M tools/ct/solids.py
 M tools/ct/source.py
 M tools/verify/site-run.ts
?? assets/.DS_Store
?? docs/progress/2026-11-28-ct-cutover-check/
?? src/app/default-dataset.json
?? tools/ct/fidelity.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
