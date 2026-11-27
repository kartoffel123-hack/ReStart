# Add assembly-wide provisional removal layers

- Captured: 2026-11-27T18:33:36.530Z
- HEAD at capture: `a1c2535` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `4a25b1f5ac7644a3`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- V02

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `assembly-disassembly-layers--laptop-1280x800.png` | laptop-1280x800 | `592bd8dbe79b` | first capture | The assembly graph displays all currently available candidate peel layers, alternative exits, remaining blockers, and the explicit provisional-not-a-route caveat. |
| `assembly-disassembly-layers--phone-390x844.png` | phone-390x844 | `592bd8dbe79b` | first capture | The assembly graph displays all currently available candidate peel layers, alternative exits, remaining blockers, and the explicit provisional-not-a-route caveat. |

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
 M src/app/dof-overview.tsx
 M src/app/stud-pilot.tsx
 M src/domain/dependency-tree.ts
 M src/presentation/dependency-graph.css
 M tests/domain/dependency-tree.test.ts
 M tools/progress/scenarios.ts
?? assets/.DS_Store
?? assets/LEGO_MRI.step
?? data/review/nauo80-access-plan.json
?? docs/progress/2026-11-27-add-assembly-wide-provisional-removal-layers/
?? src/app/reviewed-access-plan.ts
?? src/domain/disassembly-layers.ts
?? src/presentation/disassembly-layers-panel.tsx
?? src/presentation/reviewed-access-panel.tsx
?? tests/e2e/disassembly-layers.spec.ts
?? tests/e2e/reviewed-access-plan.spec.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
