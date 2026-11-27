# Bootstrap shell and progress capture pipeline

- Captured: 2026-11-26T22:35:57.014Z
- HEAD at capture: `9166a1e` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `023bf076a861a705`

## Verification rows touched

- V05 (route resolution only)

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run build`

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
M AGENTS.md
 M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M docs/plans/0.1.0/03-software-verification-plan.md
 M package.json
?? docs/progress/
?? src/domain/schema.ts
?? src/domain/state.ts
?? tests/domain/transitions.test.ts
?? tests/fixtures/
?? tools/progress/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
