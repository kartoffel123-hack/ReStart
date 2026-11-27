# feat(data): stage all targets and fail verification on missing repairs

- Captured: 2026-11-27T08:07:50.680Z
- HEAD at capture: `beb6b82` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `c8c645597cb79904`
- Captures that differ from the previous capture set: **1 of 1**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  1 passed (1)
      Tests  1 passed (1)
Staged 12/70 modeled candidates at .staging/30465/7313571cf219ece0bf9b9a7e5a57f8f8b94e352ab8542f0808d9bb62e05a2cbd; 58 missing routes. Nothing promoted.
Verification reports 12 pending review and 58 missing motions. The tamper regression rejects changed manual bytes. Ticket 9 remains open.
~~~

## Verification rows touched

- V04

## Commands actually run

- `npm run typecheck && npx vitest run tests/release/staged.test.ts && npm run model:compile && { npm run model:verify && exit 2; test $? -eq 1; }`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 16.98 % since `2026-11-27-modeled-axial-repairs` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
A  data/review/motions.json
A  tests/release/staged.test.ts
A  tools/compile/run.ts
A  tools/compile/stage.ts
A  tools/verify/run.ts
?? docs/progress/2026-11-27-staged-coverage-gate/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
