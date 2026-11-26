# Routes render distinct placeholders; captures flag duplicates

- Captured: 2026-11-26T22:55:06.847Z
- HEAD at capture: `cab3fda` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `645014c43d6aa817`

## Verification rows touched

- V05 (route resolution only)

## Commands actually run

- `npm run typecheck`
- `npx vitest run`

## What each capture highlights

| File | Viewport | Highlight |
| --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | The manual route renders its own screen, not a shared placeholder. |
| `manual-route--phone-390x844.png` | phone-390x844 | The manual route renders its own screen, not a shared placeholder. |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | A hard refresh on #/review resolves the reviewer screen on a static host. |
| `review-route--phone-390x844.png` | phone-390x844 | A hard refresh on #/review resolves the reviewer screen on a static host. |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | The development-only gallery is reachable at #/concept. |
| `concept-route--phone-390x844.png` | phone-390x844 | The development-only gallery is reachable at #/concept. |

## Identical captures

Every capture is visually distinct.

## Working tree at capture

```
M src/app/App.tsx
 M tests/integration/bootstrap.test.tsx
 M tools/progress/capture.ts
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-26-distinct-route-captures/
?? src/presentation/placeholder-screen.css
?? src/presentation/placeholder-screen.tsx
```

## Note

Fixes a misleading progress trail: all three scenarios previously captured byte-identical pixels because every route rendered one shared placeholder.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
