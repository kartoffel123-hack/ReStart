# model:import compiles the 70 pieces into a content-hashed geometry package

- Captured: 2026-11-27T00:44:41.890Z
- HEAD at capture: `9e6f273` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`
- Captures that differ from the previous capture set: **0 of 2**

## Verification rows touched

- V01

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run model:import`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Δ vs previous capture | Highlight |
| --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | 0.00 % since `2026-11-27-captures-compared-by-pixels` | The manual route renders its own screen, not a shared placeholder. |
| `manual-route--phone-390x844.png` | phone-390x844 | 0.00 % since `2026-11-27-captures-compared-by-pixels` | The manual route renders its own screen, not a shared placeholder. |

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-captures-compared-by-pixels`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-captures-compared-by-pixels`

## Working tree at capture

```
M README.md
?? docs/progress/2026-11-27-import-entry-point/
?? tests/integration/import-package.test.ts
?? tools/import/build-package.ts
?? tools/import/run.ts
```

## Note

Build-side commit, no new rendered surface, so the delta below is 0.00 % by design. npm run model:import now verifies the pinned SHA-256, expands 70 pieces from 81 usages, tessellates them, proves 70/70 identity (lowest score 0.9912, smallest margin 0.5000) and stages a 1,730,348-byte GLB with 70 pickable instances at .tmp/import/geometry-3cc9b8263cbdb347.glb plus import-report.json. It publishes nothing: public/models/30465/ waits for model:verify. Evidence is tests/integration/import-package.test.ts, which also pins that a source that does not match the pin is refused instead of partially imported. The scene becomes capturable with Ticket 7.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
