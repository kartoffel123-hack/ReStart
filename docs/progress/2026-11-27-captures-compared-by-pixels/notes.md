# Progress captures are now compared by pixels, not bytes

- Captured: 2026-11-27T00:39:46.187Z
- HEAD at capture: `ae42d02` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `ca9d325604217740`
- Captures that differ from the previous capture set: **0 of 2**

## Verification rows touched

- V08

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npx vitest run tests/tools`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Δ vs previous capture | Highlight |
| --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | 0.00 % since `2026-11-27-tessellation-and-identity-crosswalk` | The manual route renders its own screen, not a shared placeholder. |
| `manual-route--phone-390x844.png` | phone-390x844 | 0.00 % since `2026-11-27-tessellation-and-identity-crosswalk` | The manual route renders its own screen, not a shared placeholder. |

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-tessellation-and-identity-crosswalk`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-tessellation-and-identity-crosswalk`

## Working tree at capture

```
M AGENTS.md
 M README.md
 M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M docs/plans/0.1.0/03-software-verification-plan.md
 M docs/progress/README.md
 M tools/progress/capture.ts
?? docs/progress/2026-11-27-captures-compared-by-pixels/
?? tests/tools/
?? tools/progress/png-diff.ts
?? tools/progress/previous-capture.ts
```

## Note

Nothing visible changed, and that is the point: the 0.00 % delta below is this commit's deliverable. The capture tool used to compare PNG bytes, which called three renders of one placeholder screen a distinct capture set and would have called the same pixels re-encoded a change. It now decodes its own PNGs (tools/progress/png-diff.ts) and reports how far each capture is from the same scenario in the previous capture folder (tools/progress/previous-capture.ts), refusing a set that repeats the previous one in full unless --note explains the missing surface. Implementation plan 02 S8.1, AGENTS.md and docs/progress/README.md carry the rule. Evidence is tests/tools: PNGs encoded by hand across all five scanline filters, pinning that identical pixels with different bytes score 0, and a chronological lookup test for same-day folders whose names sort the wrong way. The placeholder itself is replaced by Tickets 4 and 8.

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
