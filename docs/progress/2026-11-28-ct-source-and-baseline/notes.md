# Pin CT source and helicopter baseline

- Captured: 2026-11-27T23:45:44.214Z
- HEAD at capture: `10817d9` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `83c2b709c6585ab2`
- Captures that differ from the previous capture set: **3 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  32 passed (32)
      Tests  274 passed (274)
  13 passed (28.1s)
b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2  assets/lego-ct/4000041.io
CT-02: reconcile 566 source placements before creating CAD geometry.
~~~

## Verification rows touched

- CT-V01
- CT-V09

## Commands actually run

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 8.47 % since `2026-11-27-simplify-mechanic-landing-picker` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 23.98 % since `2026-11-27-simplify-mechanic-landing-picker` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 25.54 % since `2026-11-27-ci-pilot-and-release-coverage` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
?? assets/.DS_Store
?? assets/lego-ct/
?? docs/plans/0.2.0/
?? docs/progress/2026-11-28-ct-source-and-baseline/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
