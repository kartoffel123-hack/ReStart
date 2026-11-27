# Tessellate the 70 occurrences and match each to its own mesh

- Captured: 2026-11-27T00:36:43.642Z
- HEAD at capture: `eccbb6a` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`
- Captures that differ from the previous capture set: **0 of 2**

## Verification rows touched

- V01

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npx vitest run tests/data/geometry.test.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Δ vs previous capture | Highlight |
| --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | 0.00 % since `2026-11-27-step-occurrence-identity` | The manual route renders its own screen, not a shared placeholder. |
| `manual-route--phone-390x844.png` | phone-390x844 | 0.00 % since `2026-11-27-step-occurrence-identity` | The manual route renders its own screen, not a shared placeholder. |

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-step-occurrence-identity`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-step-occurrence-identity`

## Working tree at capture

```
M AGENTS.md
 M README.md
 M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M docs/plans/0.1.0/03-software-verification-plan.md
 M docs/progress/README.md
 M tools/lib/step-tree.ts
 M tools/progress/capture.ts
?? data/review/tessellation-baseline.md
?? docs/progress/2026-11-27-tessellation-and-identity-crosswalk/
?? tests/data/geometry.test.ts
?? tests/tools/
?? tools/lib/crosswalk.ts
?? tools/lib/glb.ts
?? tools/lib/step-meshes.ts
?? tools/progress/png-diff.ts
```

## Note

No new rendered surface: this commit is build-side only. It tessellates the 70 occurrences with occt-import-js, matches every occurrence to its own mesh (70/70, lowest winning score 0.9912) and writes a GLB with one pickable node per occurrence ID. The closest rendered state is captured so the absence of visual change is on record. The evidence for this commit is tests/data/geometry.test.ts (pickable nodes, the stage 1 axle landmark at [0, 0, 32] mm, both rotor blades at Y 47.5 mm, a metre/millimetre and doubled-placement counterexample) plus data/review/tessellation-baseline.md. Ticket 4 makes the mechanic screen capturable.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
