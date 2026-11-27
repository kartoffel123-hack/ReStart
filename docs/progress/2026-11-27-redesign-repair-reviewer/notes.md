# redesign repair reviewer

- Captured: 2026-11-27T11:57:19.262Z
- HEAD at capture: `6a815ea` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `dd15799ec0346210`
- Captures that differ from the previous capture set: **6 of 14**

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
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `9ddf109c9456` | 4.04 % since `2026-11-27-redesign-mechanic-manual-landing-page` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `9ddf109c9456` | 4.76 % since `2026-11-27-redesign-mechanic-manual-landing-page` | The real assembly picker highlights the light stud, the first playable target. |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | `e2b2bfa8ea5e` | 36.72 % since `2026-11-27-redesign-mechanic-manual-landing-page` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `review-route--phone-390x844.png` | phone-390x844 | `e2b2bfa8ea5e` | 64.13 % since `2026-11-27-redesign-mechanic-manual-landing-page` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `buried-pin-step--laptop-1280x800.png` | laptop-1280x800 | `608c937750c5` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `buried-pin-step--phone-390x844.png` | phone-390x844 | `608c937750c5` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `review-diff--laptop-1280x800.png` | laptop-1280x800 | `dd117b6115a7` | 43.02 % since `2026-11-27-redesign-mechanic-manual-landing-page` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `review-diff--phone-390x844.png` | phone-390x844 | `dd117b6115a7` | 82.35 % since `2026-11-27-redesign-mechanic-manual-landing-page` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-ready-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-ready-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-restore-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |
| `concept-restore-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | 0.00 % since `2026-11-27-redesign-mechanic-manual-landing-page` | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |

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

- `buried-pin-step--laptop-1280x800.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `buried-pin-step--phone-390x844.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--laptop-1280x800.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--phone-390x844.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-ready-route--laptop-1280x800.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-ready-route--phone-390x844.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-restore-route--laptop-1280x800.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-restore-route--phone-390x844.png` unchanged since `2026-11-27-redesign-mechanic-manual-landing-page` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M src/app/reviewer.tsx
 M src/app/stud-pilot.tsx
 M src/presentation/reviewer.css
 M src/scene/stud-scene.tsx
?? assets/.DS_Store
?? docs/progress/2026-11-27-redesign-repair-reviewer/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
