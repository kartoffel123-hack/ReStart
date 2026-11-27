# Show the completed repair record

- Captured: 2026-11-27T21:49:26.970Z
- HEAD at capture: `071319b` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `0198385e4a293d50`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- V05

## Commands actually run

- `npm run build`
- `npm run test:e2e -- tests/e2e/light-stud.spec.ts tests/e2e/joint-repair.spec.ts tests/e2e/cross-block.spec.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `repair-complete--laptop-1280x800.png` | laptop-1280x800 | `ee09dcbb2bce` | first capture | The restored helicopter and repair record show the replaced light stud and confirmed fit check. |
| `repair-complete--phone-390x844.png` | phone-390x844 | `ee09dcbb2bce` | first capture | The restored helicopter and repair record show the replaced light stud and confirmed fit check. |

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
M src/app/stud-pilot.tsx
 M src/presentation/stud-pilot.css
 M tests/e2e/light-stud.spec.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-show-the-completed-repair-record/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
