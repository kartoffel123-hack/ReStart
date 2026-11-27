# STEP importer resolves 70 occurrences with installed poses

- Captured: 2026-11-26T23:49:50.197Z
- HEAD at capture: `54c49a4` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`

## Verification rows touched

- V01

## Commands actually run

- `npm run typecheck`
- `npx vitest run`

## What each capture highlights

| File | Viewport | Highlight |
| --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | The manual route renders its own screen, not a shared placeholder. |
| `manual-route--phone-390x844.png` | phone-390x844 | The manual route renders its own screen, not a shared placeholder. |

## Identical captures

Every capture is visually distinct.

## Working tree at capture

```
?? docs/progress/2026-11-27-step-occurrence-identity/
?? tests/data/assembly-fixture.test.ts
?? tests/data/identity.test.ts
?? tools/lib/step-file.ts
?? tools/lib/step-tree.ts
```

## Note

Ticket 1 is build-side importer code (tools/lib/step-file.ts, tools/lib/step-tree.ts). It has no rendered surface yet: the app still shows the route placeholders, so this capture is the closest rendered state and proves nothing about the change by itself. The evidence for this commit is 21 tests in tests/data/identity.test.ts and tests/data/assembly-fixture.test.ts, which reproduce the plan 02 section 1 witnesses (axle [0,0,32] mm, both rotor blades Y=47.5 mm, 81 usages, 13 assembly definitions, 31 leaf definitions, 70 occurrences). Ticket 4 (tests/ui/manual-screen.test.tsx) makes occurrence identity visible in the browser.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
