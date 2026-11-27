# confirmed-removals-disappear

- Captured: 2026-11-27T20:10:53.266Z
- HEAD at capture: `7be68be` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `f9da95ea277e8604`
- Captures that differ from the previous capture set: **1 of 1**

## Verification rows touched

- V05

## Commands actually run

- `npm run typecheck`
- `npx vitest run tests/app/manual-scene-state.test.ts tests/ui/manual-screen.test.tsx`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `buried-pin-step--laptop-1280x800.png` | laptop-1280x800 | `103154361aa9` | 2.50 % since `2026-11-27-merge-dependency-graph-and-align-all-screens` | After the cap removal is confirmed, the cap disappears from the assembly and the diagram highlights the blue friction pin and its withdrawal stroke. |

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
 M src/scene/stud-scene.tsx
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-confirmed-removals-disappear/
?? src/app/manual-scene-state.ts
?? tests/app/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
