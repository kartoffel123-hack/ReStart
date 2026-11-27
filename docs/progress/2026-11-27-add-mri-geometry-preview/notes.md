# Add MRI geometry preview

- Captured: 2026-11-27T19:01:13.794Z
- HEAD at capture: `ebdced6` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `29d2a959c54ff70e`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- none recorded

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
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `6ab13ee48127` | 82.91 % since `2026-11-27-merge-dependency-graph-and-align-all-screens` | The default route shows the hash-verified MRI geometry and clearly labels it as a preview without repair data. |
| `manual-route--phone-390x844.png` | phone-390x844 | `6ab13ee48127` | 57.35 % since `2026-11-27-merge-dependency-graph-and-align-all-screens` | The default route shows the hash-verified MRI geometry and clearly labels it as a preview without repair data. |

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
M README.md
 M package.json
 M src/app/App.tsx
 M src/app/dependency-graph.tsx
 M src/app/dof-overview.tsx
 M src/app/reviewer.tsx
 M tests/e2e/buried-pin.spec.ts
 M tests/e2e/joint-repair.spec.ts
 M tests/e2e/light-stud.spec.ts
 M tests/e2e/picker-layout.spec.ts
 M tests/e2e/review-session.spec.ts
 M tests/e2e/reviewed-access-plan.spec.ts
 M tests/integration/bootstrap.test.tsx
 M tools/progress/scenarios.ts
?? assets/.DS_Store
?? assets/LEGO_MRI.step
?? docs/progress/2026-11-27-add-mri-geometry-preview/
?? public/models/lego-mri/
?? src/app/mri-preview.css
?? src/app/mri-preview.tsx
?? tests/data/mri-step.test.ts
?? tests/e2e/mri-preview.spec.ts
?? tools/mri/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
