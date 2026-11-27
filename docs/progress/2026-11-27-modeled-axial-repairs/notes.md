# feat(manual): generate direct and single-blocker repair candidates

- Captured: 2026-11-27T08:07:15.371Z
- HEAD at capture: `c029112` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `b8885c4d2a74ecb5`
- Captures that differ from the previous capture set: **1 of 1**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Pilot: 84 generated connections; 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
 Test Files  5 passed (5)
      Tests  47 passed (47)
12 single-target candidates include 30465/NAUO21: park the bevel gear, exchange the large bush, restore the gear. These are generated routes, not team approvals.
~~~

## Verification rows touched

- V04

## Commands actually run

- `npm run typecheck && npx tsx tools/pilot/run.ts && npx vitest run tests/domain`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 28.15 % since `2026-11-27-assembly-motion-surveys` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

These routes are still rendered by a placeholder and their capture was identical
to the previous commit’s, so committing them would add pictures that highlight
nothing while the evidence panel above carries the change (plan §8.3). The
routes and the tickets that will replace them stay recorded here:

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

## Unchanged since the previous capture

Nothing here repeats the previous commit’s capture.

## Working tree at capture

```
M  .gitignore
A  tools/compile/installed-exits.ts
A  tools/compile/motion-catalog.ts
A  tools/pilot/pin-model.ts
A  tools/pilot/run.ts
A  tools/pilot/stud-candidate.ts
?? docs/progress/2026-11-27-modeled-axial-repairs/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
