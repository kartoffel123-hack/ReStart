# merge dependency graph and align all screens

- Captured: 2026-11-27T12:25:32.046Z
- HEAD at capture: `a8a7915` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `664ccba5d0a59854`
- Captures that differ from the previous capture set: **7 of 14**

## Verification rows touched

- none recorded

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `82e13a15e2a1` | 0.33 % since `2026-11-27-redesign-repair-reviewer` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `82e13a15e2a1` | 20.48 % since `2026-11-27-redesign-repair-reviewer` | The real assembly picker highlights the light stud, the first playable target. |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | `d38cd7372d98` | 54.68 % since `2026-11-27-redesign-repair-reviewer` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `review-route--phone-390x844.png` | phone-390x844 | `d38cd7372d98` | 21.40 % since `2026-11-27-redesign-repair-reviewer` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `buried-pin-step--laptop-1280x800.png` | laptop-1280x800 | `f06e8fa33134` | 0.50 % since `2026-11-27-redesign-repair-reviewer` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `buried-pin-step--phone-390x844.png` | phone-390x844 | `f06e8fa33134` | 43.25 % since `2026-11-27-redesign-repair-reviewer` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `review-diff--laptop-1280x800.png` | laptop-1280x800 | `ac55053fb1f7` | 90.28 % since `2026-11-27-redesign-repair-reviewer` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `review-diff--phone-390x844.png` | phone-390x844 | `ac55053fb1f7` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-ready-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-ready-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-restore-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |
| `concept-restore-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-repair-reviewer` | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

These render the same structure with different wording, so they are one screen, not
several. A pixel comparison calls them distinct because the text differs; the layout
identity does not. Build the screens or capture a state that genuinely differs.

- one layout: `concept-ready-route--laptop-1280x800.png`, `concept-restore-route--laptop-1280x800.png`
- one layout: `concept-ready-route--phone-390x844.png`, `concept-restore-route--phone-390x844.png`

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

Nothing was dropped: every capture in this folder is either a built screen, a
capture that differs from the previous commit, or the only image this commit has.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `review-diff--phone-390x844.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--laptop-1280x800.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--phone-390x844.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-ready-route--laptop-1280x800.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-ready-route--phone-390x844.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-restore-route--laptop-1280x800.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-restore-route--phone-390x844.png` unchanged since `2026-11-27-redesign-repair-reviewer` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
A  "ReStart Pitch.html"
A  data/review/connection-dof.json
M  package.json
M  src/app/App.tsx
A  src/app/dependency-graph.tsx
A  src/app/dof-overview.tsx
UU src/app/reviewer.tsx
UU src/app/stud-pilot.tsx
A  src/domain/dependency-tree.ts
A  src/domain/dof.ts
A  src/graph-view/dependency-tree-diagram.tsx
AM src/presentation/dependency-graph.css
AM src/presentation/dof-overview.css
 M src/presentation/piece-picker-screen.tsx
 M src/presentation/reviewer.css
 M src/presentation/stud-pilot.css
UU src/scene/stud-scene.tsx
A  tests/domain/dependency-tree.test.ts
M  tests/integration/bootstrap.test.tsx
A  tools/dof/run.ts
?? assets/.DS_Store
?? docs/progress/2026-11-27-merge-dependency-graph-and-align-all-screens/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
