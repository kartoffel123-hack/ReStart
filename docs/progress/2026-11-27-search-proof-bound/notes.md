# search proves a bound it can defend

- Captured: 2026-11-27T02:05:17.933Z
- HEAD at capture: `130c690` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`
- Captures that differ from the previous capture set: **0 of 2**

## Verification rows touched

- V03
- V04

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run build`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-layout-identity-captures` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-layout-identity-captures` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-layout-identity-captures`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-layout-identity-captures`

## Working tree at capture

```
M README.md
 M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M src/domain/planner.ts
 M tests/fixtures/repairs.ts
?? docs/progress/2026-11-27-search-proof-bound/
?? tests/domain/optimality.test.ts
?? tests/helpers/
```

## Note

Domain-only commit: the search report changed, not any rendered surface, so the capture repeats the previous one by design and still shows only the placeholder stub (Ticket 4 replaces it). What this commit changes is measurable in tests, not pixels. Two defects were found by checking the planner against the exhaustive oracle: lowerBound reported the cheapest pending state, which exceeded a job the search had just returned (2 against 1), and the expansion cap was read after popping a frontier node, so a one-expansion search with a replayed incumbent certified proved-minimum for a search that had never looked past the first blocker. lowerBound is now a bound on the optimum, primary proof and tie-frontier completion are reported separately per §4.7, and the cap is checked before the node is taken. tests/domain/optimality.test.ts is green at 29 tests and adds three hand-worked fixtures - sealed target, tied exits and divergent return obligations - because no plan 03 §3 fixture could evidence those three claims.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
