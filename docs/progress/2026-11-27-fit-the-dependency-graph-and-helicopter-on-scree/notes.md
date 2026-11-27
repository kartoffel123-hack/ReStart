# Fit the dependency graph and helicopter on screen

- Captured: 2026-11-27T13:30:50.292Z
- HEAD at capture: `9b243b3` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `c9dd2f437b7a0a64`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- V05

## Commands actually run

- `npm run build`
- `npm test`
- `npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `dependency-graph--laptop-1280x800.png` | laptop-1280x800 | `267b23729a04` | first capture | The dependency tree and helicopter are visible together before scrolling or searching for a part. |
| `dependency-graph--phone-390x844.png` | phone-390x844 | `267b23729a04` | first capture | The dependency tree and helicopter are visible together before scrolling or searching for a part. |

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
M docs/ui-ux-design.md
 M src/app/dependency-graph.tsx
 M src/graph-view/assembly-diagram.tsx
 M src/presentation/dependency-graph.css
 M tools/progress/scenarios.ts
?? assets/.DS_Store
?? docs/progress/2026-11-27-fit-the-dependency-graph-and-helicopter-on-scree/
?? tests/e2e/dependency-graph-layout.spec.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
