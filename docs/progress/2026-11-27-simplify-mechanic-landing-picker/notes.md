# simplify mechanic landing picker

- Captured: 2026-11-27T20:49:53.503Z
- HEAD at capture: `5473b8c` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `41e76d4ffa330bdf`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- none recorded

## Commands actually run

- `npm test`
- `npm run test:e2e`
- `npm run build`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 43.96 % since `2026-11-27-merge-dependency-graph-and-align-all-screens` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 61.14 % since `2026-11-27-merge-dependency-graph-and-align-all-screens` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |

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
 M src/app/stud-pilot.tsx
 M src/presentation/piece-picker-screen.tsx
 M src/presentation/stud-pilot.css
 M src/scene/stud-scene.tsx
 M tests/e2e/buried-pin.spec.ts
 M tests/e2e/cross-block.spec.ts
 M tests/e2e/joint-repair.spec.ts
 M tests/e2e/light-stud.spec.ts
 M tests/e2e/picker-layout.spec.ts
 M tests/e2e/review-session.spec.ts
 M tests/integration/bootstrap.test.tsx
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-simplify-mechanic-landing-picker/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
