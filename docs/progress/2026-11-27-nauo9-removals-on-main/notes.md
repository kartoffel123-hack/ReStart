# NAUO9 removals on main

- Captured: 2026-11-27T15:43:40.393Z
- HEAD at capture: `9b243b3` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `33aee936448a8297`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- V02
- V03

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run build`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `nauo9-indirect-removal--laptop-1280x800.png` | laptop-1280x800 | `7341fd34cf60` | 55.17 % since `2026-11-27-nauo9-direct-and-indirect-removals` | NAUO9 graph shows direct removals in yellow and the indirect washer dependencies NAUO3 and NAUO5 in light yellow, with axle connections labelled for slide review. |
| `nauo9-indirect-removal--phone-390x844.png` | phone-390x844 | `7341fd34cf60` | 51.77 % since `2026-11-27-nauo9-direct-and-indirect-removals` | NAUO9 graph shows direct removals in yellow and the indirect washer dependencies NAUO3 and NAUO5 in light yellow, with axle connections labelled for slide review. |

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
A  data/review/nauo9-access-plan.json
A  docs/NAUO9-reparatur-entwurf.txt
A  docs/progress/2026-11-27-nauo9-direct-and-indirect-removals/nauo9-indirect-removal--laptop-1280x800.png
A  docs/progress/2026-11-27-nauo9-direct-and-indirect-removals/nauo9-indirect-removal--phone-390x844.png
A  docs/progress/2026-11-27-nauo9-direct-and-indirect-removals/notes.md
M  src/app/dependency-graph.tsx
M  src/app/dof-overview.tsx
M  src/domain/dependency-tree.ts
M  src/domain/dof.ts
M  src/graph-view/dependency-tree-diagram.tsx
M  src/presentation/dependency-graph.css
M  tests/data/workbooks.test.ts
M  tests/domain/dependency-tree.test.ts
M  tools/lib/workbooks.ts
M  tools/progress/scenarios.ts
?? docs/progress/2026-11-27-nauo9-removals-on-main/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
