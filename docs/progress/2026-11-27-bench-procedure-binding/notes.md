# feat(review): bind bench evidence to motion and check content

- Captured: 2026-11-27T08:05:53.199Z
- HEAD at capture: `6f022fb` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `a76fc766e08b5384`
- Captures that differ from the previous capture set: **1 of 1**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  2 passed (2)
      Tests  4 passed (4)
Changing a return waypoint invalidates the bench record; a graph-only revision does not. The team ledger contains zero real trials (ticket 10).
~~~

## Verification rows touched

- V06

## Commands actually run

- `npm run typecheck && npx vitest run tests/domain/evidence.test.ts tests/domain/hash.test.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 1.90 % since `2026-11-27-planner-comparable-ties` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

These routes are still rendered by a placeholder and their capture was identical
to the previous commit’s, so committing them would add pictures that highlight
nothing while the evidence panel above carries the change (plan §8.3). The
routes and the tickets that will replace them stay recorded here:

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

## Unchanged since the previous capture

Nothing here repeats the previous commit’s capture.

## Working tree at capture

```
A  data/review/procedures.json
A  src/domain/evidence.ts
M  src/domain/fingerprint.ts
A  tests/domain/evidence.test.ts
?? docs/progress/2026-11-27-bench-procedure-binding/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
