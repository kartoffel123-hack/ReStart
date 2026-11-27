# ci: exercise the pilot and report exact release coverage

- Captured: 2026-11-27T08:23:43.247Z
- HEAD at capture: `554fc9b` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `a4679c74f41791c0`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  30 passed (30)
      Tests  257 passed (257)
  identity crosswalk       70/70 matched, lowest score 0.9912, smallest margin 0.5000
  connections              84 joints, one per piece pair per axis line, from 1632 face pairs (RV-003b); grip 1.80–8.00 mm, 0 split grips, 5 stepped fits, 0 piece pairs on more than one line
Staged 12/70 modeled candidates at .staging/30465/72b693f261fbf1ca77abc14fc0fe93ca1c5b9a0bc03db5639e673eefcbdd522e; 58 missing routes. Nothing promoted.
Static pilot package intact: 12 single-target manuals.
  5 passed (7.0s)
The feature build covers 12 modeled targets; release tags enforce the full gate. Browser and physical acceptance on real equipment remain recorded separately.
~~~

## Verification rows touched

- V04

## Commands actually run

- `if test -L node_modules; then unlink node_modules; fi; npm ci && npm run typecheck && npm test && npm run model:import && npm run model:compile && npm run model:worklist && { npm run model:verify && exit 2; test $? -eq 1; } && npm run build && npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `b4f4b2df371e` | 0.00 % since `2026-11-27-kit-review-handoff` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `b4f4b2df371e` | 0.00 % since `2026-11-27-kit-review-handoff` | The real assembly picker highlights the light stud, the first playable target. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 24.74 % since `2026-11-27-kit-review-handoff` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-kit-review-handoff` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-kit-review-handoff` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
A  .github/workflows/verify.yml
M  tests/release/staged.test.ts
?? docs/progress/2026-11-27-ci-pilot-and-release-coverage/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
