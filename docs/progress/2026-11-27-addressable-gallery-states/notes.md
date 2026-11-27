# feat(concept): link and capture all three mechanic step states

- Captured: 2026-11-27T08:09:00.939Z
- HEAD at capture: `d0c8fe3` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `2c6e63a8b59e8f5d`
- Captures that differ from the previous capture set: **5 of 7**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
 Test Files  1 passed (1)
      Tests  9 passed (9)
Blocked, ready and restore each assert their own data-scenario before capture at both viewport sizes.
~~~

## Verification rows touched

- V05

## Commands actually run

- `npm run typecheck && npx vitest run tests/ui/concept-gallery.test.tsx`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-joints-folded-onto-the-axis-line` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-joints-folded-onto-the-axis-line` | Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, so the confirm control is disabled and the screen says why. The real ManualScreen, so a change here is a change the mechanic would see. |
| `concept-ready-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | first capture | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-ready-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | first capture | Gallery state "buried-ready": the same piece once its blocker is off, so the confirm control is live, the obstruction is gone from the drawing, and the warning band is replaced by the one move and its stop condition. |
| `concept-restore-route--laptop-1280x800.png` | laptop-1280x800 | `cc8a942d4492` | first capture | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |
| `concept-restore-route--phone-390x844.png` | phone-390x844 | `cc8a942d4492` | first capture | Gallery state "restore": a step that puts a piece back rather than taking one out. It reads differently -- different piece, direction and stop landmark -- which is why restoration is captured as its own state and not assumed from removal. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 8.11 % since `2026-11-27-static-pilot-integrity` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `concept-route--laptop-1280x800.png` unchanged since `2026-11-27-joints-folded-onto-the-axis-line` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--phone-390x844.png` unchanged since `2026-11-27-joints-folded-onto-the-axis-line` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
A  src/concept/gallery-state.ts
M  src/concept/gallery.tsx
M  tests/ui/concept-gallery.test.tsx
M  tools/progress/scenarios.ts
?? docs/progress/2026-11-27-addressable-gallery-states/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
