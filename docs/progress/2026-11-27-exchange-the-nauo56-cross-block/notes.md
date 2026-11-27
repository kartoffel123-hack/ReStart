# Exchange the NAUO56 cross block

- Captured: 2026-11-27T19:43:00.877Z
- HEAD at capture: `a1c2535` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `a4d1553053eb6bfd`
- Captures that differ from the previous capture set: **2 of 2**

## Verification rows touched

- V04
- V05

## Commands actually run

- `npm test`
- `npm run build`
- `npm run test:e2e -- --workers=2`
- `npm run model:compile`
- `npm run model:verify`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `cross-block-release--laptop-1280x800.png` | laptop-1280x800 | `8b5ca4c30cef` | first capture | The selected NAUO56 block slides sideways off the short axle after the rotor shaft is lowered. |
| `cross-block-release--phone-390x844.png` | phone-390x844 | `8b5ca4c30cef` | first capture | The selected NAUO56 block slides sideways off the short axle after the rotor shaft is lowered. |

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
M README.md
 M docs/pilot-handoff.md
 M docs/ui-ux-design.md
 M src/app/dependency-graph.tsx
 M src/domain/fingerprint.ts
 M src/domain/schema.ts
 M src/presentation/dependency-graph.css
 M tests/release/staged.test.ts
 M tools/compile/stage.ts
 M tools/pilot/stud-candidate.ts
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
 M tools/verify/route-geometry.ts
?? docs/progress/2026-11-27-exchange-the-nauo56-cross-block/
?? docs/progress/2026-11-27-keep-the-nauo9-graph-and-model-in-view/
?? tests/e2e/cross-block.spec.ts
?? tests/e2e/dependency-graph-layout.spec.ts
?? tools/compile/cross-block.ts
?? tools/verify/cross-block-fit.ts
```

## Note

NAUO56 replays and restores through 32 manual steps. The full release gate remains open: 13 pending review, 57 missing motions, 0 invalid paths.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
