# captures report layout identity and placeholders

- Captured: 2026-11-27T01:45:49.074Z
- HEAD at capture: `a996150` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `645014c43d6aa817`
- Captures that differ from the previous capture set: **0 of 6**

## Verification rows touched

- V05

## Commands actually run

- `npm run typecheck`
- `npx vitest run --exclude tests/domain/optimality.test.ts`
- `npm run build`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-workbook-joins` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-workbook-joins` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-26-distinct-route-captures` | #/review survives a hard refresh on a static host; its screen is still the shared placeholder (Ticket 8). |
| `review-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-26-distinct-route-captures` | #/review survives a hard refresh on a static host; its screen is still the shared placeholder (Ticket 8). |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-26-distinct-route-captures` | #/concept is reachable in development; the gallery has no states until the screens exist (Ticket 4). |
| `concept-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-26-distinct-route-captures` | #/concept is reachable in development; the gallery has no states until the screens exist (Ticket 4). |

## Screens still rendered by a placeholder

These scenarios name a screen that is not built yet, so their PNGs show a labelled stub.
They confirm routing only: they cannot evidence behaviour introduced by this commit.

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`
- `review-route--laptop-1280x800.png`
- `review-route--phone-390x844.png`
- `concept-route--laptop-1280x800.png`
- `concept-route--phone-390x844.png`

**6 of 6** captures are placeholders.

## Captures that share one layout

These render the same structure with different wording, so they are one screen, not
several. A pixel comparison calls them distinct because the text differs; the layout
identity does not. Build the screens or capture a state that genuinely differs.

- one layout: `manual-route--laptop-1280x800.png`, `review-route--laptop-1280x800.png`, `concept-route--laptop-1280x800.png`
- one layout: `manual-route--phone-390x844.png`, `review-route--phone-390x844.png`, `concept-route--phone-390x844.png`

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-workbook-joins`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-workbook-joins`
- `review-route--laptop-1280x800.png` unchanged since `2026-11-26-distinct-route-captures`
- `review-route--phone-390x844.png` unchanged since `2026-11-26-distinct-route-captures`
- `concept-route--laptop-1280x800.png` unchanged since `2026-11-26-distinct-route-captures`
- `concept-route--phone-390x844.png` unchanged since `2026-11-26-distinct-route-captures`

## Working tree at capture

```
M AGENTS.md
 M README.md
 M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M docs/plans/0.1.0/03-software-verification-plan.md
 M docs/progress/README.md
 M src/presentation/placeholder-screen.tsx
 M tests/integration/bootstrap.test.tsx
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
 M tsconfig.tools.json
?? docs/progress/2026-11-27-layout-identity-captures/
?? tests/domain/optimality.test.ts
?? tests/helpers/
?? tests/tools/screen-signature.test.ts
?? tools/progress/screen-signature.ts
```

## Note

This commit changes the measurement, not a rendered surface: all three routes still render the shared placeholder stub, so the PNGs are pixel-identical to the previous capture by design, and the Layout column shows one layout (11d980a1d2e7) behind all six. The artefact introduced here is that reporting itself: notes.md now states that these screenshots are one screen, and the scenario captions no longer claim otherwise. The tool refuses an all-placeholder set without --note from now on; Ticket 4 and Ticket 8 replace the stub.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
