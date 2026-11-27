# refine picker selection card

- Captured: 2026-11-27T21:45:04.853Z
- HEAD at capture: `cfee412` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `b231808ea5b39716`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- none recorded

## Commands actually run

- `npm run build`
- `npm run test:e2e -- tests/e2e/picker-layout.spec.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `picker-selected-piece--laptop-1280x800.png` | laptop-1280x800 | `53dbfc4bb9fc` | first capture | The selected-piece panel has a transparent outer card, pink piece inset, and a Replace action whose border matches its fill. |
| `picker-selected-piece--phone-390x844.png` | phone-390x844 | `53dbfc4bb9fc` | first capture | The selected-piece panel has a transparent outer card, pink piece inset, and a Replace action whose border matches its fill. |

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
M docs/progress/README.md
 M src/presentation/stud-pilot.css
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-refine-picker-selection-card/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
