# Inventory, bill of materials and timing lookup join the assembly

- Captured: 2026-11-27T01:09:08.088Z
- HEAD at capture: `104a32d` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`
- Captures that differ from the previous capture set: **0 of 2**

## Verification rows touched

- V01
- V07

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run model:import`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Δ vs previous capture | Highlight |
| --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | 0.00 % since `2026-11-27-import-entry-point` | The manual route renders its own screen, not a shared placeholder. |
| `manual-route--phone-390x844.png` | phone-390x844 | 0.00 % since `2026-11-27-import-entry-point` | The manual route renders its own screen, not a shared placeholder. |

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-import-entry-point`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-import-entry-point`

## Working tree at capture

```
M tools/import/build-package.ts
 M tools/import/run.ts
?? data/review/source-joins.md
?? docs/progress/2026-11-27-workbook-joins/
?? tests/data/workbooks.test.ts
?? tools/lib/workbooks.ts
```

## Note

Build-side commit, no new rendered surface, so the delta below is 0.00 % by design. npm run model:import now also reads the three supplied workbooks: 31 part types whose quantities sum to the declared 70 and reconcile to occurrence multiplicity one-for-one, 70 bill-of-materials rows, and 62 MTM connection rows whose English and German seconds agree for every Row_ID. Two findings are recorded in data/review/source-joins.md: the bill of materials matches the assembly as a multiset but only 7 of 70 positions agree, so 54 rows are joined at type level and marked ambiguous rather than to a piece; and the Functional Unit column holds 70 distinct labels for 70 rows, so it is exported as candidates with review still required. Materials and times leave the importer carrying their challenge-assumption provenance. The mechanic screen becomes capturable with Ticket 4.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
