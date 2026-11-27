# celebrate completed repair

- Captured: 2026-11-27T23:06:22.898Z
- HEAD at capture: `ec398d6` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `b82f18443afa65fd`
- Captures that differ from the previous capture set: **1 of 2**

## Verification rows touched

- V05

## Commands actually run

- `npm run typecheck`
- `npm run test:e2e -- tests/e2e/light-stud.spec.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `repair-complete--laptop-1280x800.png` | laptop-1280x800 | `f676154268fc` | 0.09 % since `2026-11-27-show-the-completed-repair-record` | The restored helicopter slowly rotates behind the repair record while confetti falls across the full screen. |
| `repair-complete--phone-390x844.png` | phone-390x844 | `f676154268fc` | 0.29 % since `2026-11-27-show-the-completed-repair-record` | The restored helicopter slowly rotates behind the repair record while confetti falls across the full screen. |

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

- `repair-complete--laptop-1280x800.png` unchanged since `2026-11-27-show-the-completed-repair-record` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M src/app/stud-pilot.tsx
 M src/presentation/manual-screen.css
 M src/presentation/manual-screen.tsx
 M src/presentation/stud-pilot.css
 M tests/e2e/light-stud.spec.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-28-celebrate-completed-repair/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
