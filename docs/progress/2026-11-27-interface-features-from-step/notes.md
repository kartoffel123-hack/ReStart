# importer reads candidate interface features from the STEP

- Captured: 2026-11-27T02:42:14.776Z
- HEAD at capture: `abb192f` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`
- Captures that differ from the previous capture set: **0 of 2**

## Verification rows touched

- V02
- V05

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run model:import`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-search-proof-bound` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-search-proof-bound` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |

## Screens still rendered by a placeholder

These scenarios name a screen that is not built yet, so their PNGs show a labelled stub.
They confirm routing only: they cannot evidence behaviour introduced by this commit.

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

**2 of 2** captures are placeholders.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-search-proof-bound`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-search-proof-bound`

## Working tree at capture

```
M README.md
 M tests/integration/import-package.test.ts
 M tools/import/build-package.ts
 M tools/import/run.ts
?? data/review/interface-features.md
?? docs/progress/2026-11-27-interface-features-from-step/
?? tests/data/features.test.ts
?? tools/lib/features.ts
```

## Note

Build-side commit: the importer now reads the cylindrical interface faces of every leaf definition, so the change is measurable in the import report and tests, not in any rendered surface (Ticket 4 builds the first real screen). What this commit introduces: tools/lib/features.ts resolves each leaf PRODUCT_DEFINITION through its SHAPE_DEFINITION_REPRESENTATION and the SHAPE_REPRESENTATION_RELATIONSHIP to the ADVANCED_BREP_SHAPE_REPRESENTATION, then reports every cylindrical face by its STEP entity id with radius, axis and location in definition-local coordinates. Measured on the pinned snapshot: 2451 faces over the 31 leaf definitions, of which 1295 are cylinders, all owned by exactly one definition, radii from 0.5 to 50 mm; 64 of those cylinders are collinear within a definition and become candidate travel axes. The witness holds: the Stage 1 axle NAUO1/NAUO79 (pd:4817, B-rep #4276) has five cylindrical faces, all radius exactly 2.35 mm on one local axis, and its part frame is NOT assembly-aligned - local +Z maps to world -X, so features must be carried in local coordinates and transformed, never assumed axis-aligned. tests/data/features.test.ts is green at 10 tests and includes the counterexample that a mm-to-metre placement error is caught by the rigid-distance witness. RV-003 in data/review/interface-features.md records the classification that still needs team review before move generation.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
