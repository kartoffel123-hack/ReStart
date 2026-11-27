# feat(review): inspect and replay local blocker drafts in a worker

- Captured: 2026-11-27T08:10:02.490Z
- HEAD at capture: `67fb2e3` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `93f6a90b1305d9fe`
- Captures that differ from the previous capture set: **7 of 7**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Static pilot package intact: 12 single-target manuals.
  5 passed (7.2s)
 Test Files  1 passed (1)
      Tests  5 passed (5)
The same light stud changes from four to six steps under one local blocker. Blocking both exits yields no route; the baseline stays playable.
~~~

## Verification rows touched

- V06

## Commands actually run

- `npm run build && npm run test:e2e && npx vitest run tests/integration/bootstrap.test.tsx`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | `eb59a16299e1` | 39.97 % since `2026-11-27-layout-identity-captures` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `review-route--phone-390x844.png` | phone-390x844 | `eb59a16299e1` | 58.54 % since `2026-11-27-layout-identity-captures` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `buried-pin-step--laptop-1280x800.png` | laptop-1280x800 | `608c937750c5` | first capture | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `buried-pin-step--phone-390x844.png` | phone-390x844 | `608c937750c5` | first capture | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `review-diff--laptop-1280x800.png` | laptop-1280x800 | `a31a81447ba6` | first capture | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `review-diff--phone-390x844.png` | phone-390x844 | `a31a81447ba6` | first capture | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 12.16 % since `2026-11-27-live-mechanic-target-picker` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

Nothing here repeats the previous commit’s capture.

## Working tree at capture

```
M  src/app/App.tsx
A  src/app/preview-worker.ts
A  src/app/reviewer.tsx
A  src/graph-view/assembly-diagram.tsx
A  src/presentation/reviewer.css
A  tests/e2e/review-session.spec.ts
M  tests/integration/bootstrap.test.tsx
M  tools/progress/capture.ts
M  tools/progress/scenarios.ts
?? docs/progress/2026-11-27-reviewer-detour-and-buried-step/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
