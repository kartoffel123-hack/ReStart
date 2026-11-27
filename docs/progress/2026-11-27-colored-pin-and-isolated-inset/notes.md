# fix(scene): show the active piece in its actual kit color

- Captured: 2026-11-27T08:12:02.016Z
- HEAD at capture: `431fd3f` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `be3a3371e2805fe0`
- Captures that differ from the previous capture set: **3 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Pilot: 84 generated connections; 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
Static pilot package intact: 12 single-target manuals.
  5 passed (6.8s)
 Test Files  5 passed (5)
      Tests  47 passed (47)
The blue friction pin keeps its blue material in the withdrawal view. The inset isolates the same mesh; the wireframe marks its start.
~~~

## Verification rows touched

- V05

## Commands actually run

- `npm run build && npm run test:e2e && npx vitest run tests/domain`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `buried-pin-step--laptop-1280x800.png` | laptop-1280x800 | `608c937750c5` | 36.16 % since `2026-11-27-reviewer-detour-and-buried-step` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `buried-pin-step--phone-390x844.png` | phone-390x844 | `608c937750c5` | 17.56 % since `2026-11-27-reviewer-detour-and-buried-step` | After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 2.90 % since `2026-11-27-reviewer-detour-and-buried-step` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
M  src/domain/planner.ts
A  src/scene/part-inset.ts
M  src/scene/stud-scene.tsx
?? docs/progress/2026-11-27-colored-pin-and-isolated-inset/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
