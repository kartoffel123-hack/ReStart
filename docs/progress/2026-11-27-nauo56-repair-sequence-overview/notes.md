# NAUO56 repair sequence overview

- Captured: 2026-11-27T20:00:58.693Z
- HEAD at capture: `364521b` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `4d6cd0b8aa7eb851`
- Captures that differ from the previous capture set: **1 of 1**

## Verification rows touched

- V04

## Commands actually run

- `npm run typecheck`
- `npx playwright test tests/e2e/dependency-graph-layout.spec.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `nauo56-repair-sequence--laptop-1280x800.png` | laptop-1280x800 | `c1cf73589c71` | 6.37 % since `2026-11-27-progress-capture` | The grouped removal sequence for replacing NAUO56 is shown beside the 3D assembly; NAUO57 remains installed. |

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
M src/app/dependency-graph.tsx
 M src/presentation/dependency-graph.css
 M tests/e2e/dependency-graph-layout.spec.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-nauo56-repair-sequence-overview/
?? docs/progress/2026-11-27-progress-capture/
?? src/app/cross-block-overview.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
