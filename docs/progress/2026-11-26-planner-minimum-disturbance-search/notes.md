# Domain planner: minimum-disturbance search on hand-worked fixtures

- Captured: 2026-11-26T22:51:32.787Z
- HEAD at capture: `76136e5` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `023bf076a861a705`

## Verification rows touched

- V02
- V04 (domain layer only)

## Commands actually run

- `npm run typecheck`
- `npx vitest run`
- `npx vitest run tests/domain/transitions.test.ts`

## What each capture highlights

| File | Viewport | Highlight |
| --- | --- | --- |
| `boot--laptop-1280x800.png` | laptop-1280x800 | The production shell renders and owns the hash route. |
| `boot--phone-390x844.png` | phone-390x844 | The production shell renders and owns the hash route. |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | The static hash router resolves the reviewer route on a hard refresh. |
| `review-route--phone-390x844.png` | phone-390x844 | The static hash router resolves the reviewer route on a hard refresh. |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | The development-only gallery route is reachable at #/concept. |
| `concept-route--phone-390x844.png` | phone-390x844 | The development-only gallery route is reachable at #/concept. |

## Working tree at capture

```
M src/domain/state.ts
 M tests/fixtures/repairs.ts
?? docs/progress/2026-11-26-domain-planner-minimum-disturbance-search-on-hand-worked-fix/
?? src/domain/fingerprint.ts
?? src/domain/hash.ts
?? src/domain/metrics.ts
?? src/domain/planner.ts
?? src/domain/replay.ts
?? tests/domain/hash.test.ts
?? tests/domain/transitions.test.ts
```

## Note

Ticket 3 is pure domain work (src/domain), so it has no visible surface yet: the captures above are the unchanged boot shell at both gate widths, which records that this commit moved no presentation code. Ticket 4 (tests/ui/manual-screen.test.tsx) makes the first mechanic screen capturable. Evidence for this commit is the 13-test transition suite, not a screenshot.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
