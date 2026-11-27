# feat(manual): play modeled repairs on the real helicopter

- Captured: 2026-11-27T08:09:14.191Z
- HEAD at capture: `bf39ea2` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `2b19da493985383c`
- Captures that differ from the previous capture set: **3 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Static pilot package intact: 12 single-target manuals.
  3 passed (4.4s)
The picker loads 70 occurrences; 12 have candidate manuals. Browser checks exercise real raycast selection, a buried pin and the shared pin/cap exchange.
~~~

## Verification rows touched

- V05

## Commands actually run

- `npm run build && npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `d39129a076e0` | 27.41 % since `2026-11-27-placeholder-copy-names-the-real-ticket` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `d39129a076e0` | 47.59 % since `2026-11-27-placeholder-copy-names-the-real-ticket` | The real assembly picker highlights the light stud, the first playable target. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 7.65 % since `2026-11-27-hashed-browser-loader` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
A  api/describe.mjs
A  playwright.config.ts
M  src/app/App.tsx
A  src/app/checkpoint.ts
A  src/app/description-picker.tsx
A  src/app/stud-pilot.tsx
A  src/presentation/stud-pilot.css
A  src/scene/stud-scene.tsx
A  src/scene/xr-manual.ts
A  tests/e2e/buried-pin.spec.ts
A  tests/e2e/joint-repair.spec.ts
A  tests/e2e/light-stud.spec.ts
M  tests/integration/bootstrap.test.tsx
M  tools/progress/scenarios.ts
?? docs/progress/2026-11-27-live-mechanic-target-picker/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
