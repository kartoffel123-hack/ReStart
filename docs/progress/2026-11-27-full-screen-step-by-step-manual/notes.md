# full-screen step-by-step manual

- Captured: 2026-11-27T21:38:05.524Z
- HEAD at capture: `5e413d4` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `c3c16d19bc4446c6`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- none recorded

## Commands actually run

- `npm test`
- `npm run build`
- `npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-replacement-preview--laptop-1280x800.png` | laptop-1280x800 | `58eaa7c38574` | first capture | During the replace step, the selected replacement part fills the main view, spins with a black outline, and the helicopter overview inset is hidden. |
| `manual-replacement-preview--phone-390x844.png` | phone-390x844 | `58eaa7c38574` | first capture | During the replace step, the selected replacement part fills the main view, spins with a black outline, and the helicopter overview inset is hidden. |

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
 M src/app/manual-session.ts
 M src/app/reviewer.tsx
 M src/app/stud-pilot.tsx
 M src/concept/gallery.tsx
 M src/presentation/manual-contract.ts
 M src/presentation/manual-screen.css
 M src/presentation/manual-screen.tsx
 D src/scene/part-inset.ts
 M src/scene/stud-scene.tsx
 M tests/e2e/light-stud.spec.ts
 M tests/e2e/review-session.spec.ts
 M tests/ui/manual-screen.test.tsx
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-full-screen-step-by-step-manual/
?? src/scene/viewport-inset.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
