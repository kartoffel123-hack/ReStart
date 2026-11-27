# orthographic isometric 3d view

- Captured: 2026-11-27T10:44:17.448Z
- HEAD at capture: `4c5fe11` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `26bb22e1482544f4`
- Captures that differ from the previous capture set: **12 of 14**

## Verification rows touched

- V05
- V01

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
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `b4f4b2df371e` | 2.12 % since `2026-11-27-ci-pilot-and-release-coverage` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `b4f4b2df371e` | 0.00 % since `2026-11-27-ci-pilot-and-release-coverage` | The real assembly picker highlights the light stud, the first playable target. |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | `45ecf93b1d7e` | 0.87 % since `2026-11-27-rehearsal-and-exit-evidence` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `review-route--phone-390x844.png` | phone-390x844 | `45ecf93b1d7e` | 1.61 % since `2026-11-27-rehearsal-and-exit-evidence` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `buried-pin-step--laptop-1280x800.png` | laptop-1280x800 | `608c937750c5` | 20.66 % since `2026-11-27-colored-pin-and-isolated-inset` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `buried-pin-step--phone-390x844.png` | phone-390x844 | `608c937750c5` | 9.32 % since `2026-11-27-colored-pin-and-isolated-inset` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `review-diff--laptop-1280x800.png` | laptop-1280x800 | `d1361c688a9c` | 2.49 % since `2026-11-27-rehearsal-and-exit-evidence` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `review-diff--phone-390x844.png` | phone-390x844 | `d1361c688a9c` | 0.00 % since `2026-11-27-rehearsal-and-exit-evidence` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 34.66 % since `2026-11-27-addressable-gallery-states` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 66.88 % since `2026-11-27-addressable-gallery-states` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-ready-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | 32.89 % since `2026-11-27-addressable-gallery-states` | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-ready-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | 63.41 % since `2026-11-27-addressable-gallery-states` | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-restore-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | 32.99 % since `2026-11-27-addressable-gallery-states` | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |
| `concept-restore-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | 63.54 % since `2026-11-27-addressable-gallery-states` | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |

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

- `manual-route--phone-390x844.png` unchanged since `2026-11-27-ci-pilot-and-release-coverage`
- `review-diff--phone-390x844.png` unchanged since `2026-11-27-rehearsal-and-exit-evidence`

## Working tree at capture

```
M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M src/scene/part-inset.ts
 M src/scene/stud-scene.tsx
?? assets/.DS_Store
?? docs/progress/2026-11-27-gallery-states-captured/
?? docs/progress/2026-11-27-orthographic-isometric-3d-view/
```

## Note

The picker's 3D scene sits below the 390x844 fold, so manual-route--phone is unchanged; the projection change is visible in the laptop picker and in both buried-pin-step captures, where the focused view and the isolated inset are drawn orthographically.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
