# feat(graph): return measured counterexamples to local proposals

- Captured: 2026-11-27T08:19:14.326Z
- HEAD at capture: `fa46db4` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `b7e5f172169d99bb`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  1 passed (1)
      Tests  1 passed (1)
A missing return obstruction names the obstacle and phase. Unknown pusher clearance cannot pass. At most three local responses are checkpointed; no live inference run.
~~~

## Verification rows touched

- V10

## Commands actually run

- `npm run typecheck && npx vitest run tests/data/proposal.test.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `b4f4b2df371e` | 0.00 % since `2026-11-27-mechanical-review-worklist` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `b4f4b2df371e` | 0.00 % since `2026-11-27-mechanical-review-worklist` | The real assembly picker highlights the light stud, the first playable target. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 8.47 % since `2026-11-27-rehearsal-and-exit-evidence` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-mechanical-review-worklist` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-mechanical-review-worklist` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M  package.json
A  tests/data/proposal.test.ts
A  tools/classification/proposal.ts
A  tools/classification/propose-run.ts
?? docs/progress/2026-11-27-local-proposal-counterexamples/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
