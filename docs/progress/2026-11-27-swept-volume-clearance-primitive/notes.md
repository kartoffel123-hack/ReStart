# strokes are checked between frames, not only at them

- Captured: 2026-11-27T03:20:23.588Z
- HEAD at capture: `c4412db` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `fd58c575abcf18eb`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
swept-volume clearance: every interval is tested, not only the sampled frames

tests/geometry/sweep.test.ts        14 tests green (ticket 5's red command)
npm test                            Test Files 15 passed (15)   Tests 154 passed (154)
npm run typecheck                   tsc --noEmit app + tools    clean

what the primitive decides, on hand-worked boxes a reviewer can redo by arithmetic
  10 mm cube, wall face 9.75 mm ahead, stroke 20 mm   -> collision at 9.75 mm, basis sampled
  same wall, stroke 5 mm                              -> clear, minGapMm 4.75
  0.5 mm plate stepped 1 mm past a 0.4 mm sliver      -> collision between the samples
                                                       (samples alone: -0.25..0.25 then 0.75..1.25, both clear)
  2 mm cube swung 90 deg into a plate on its arc      -> collision; the same stroke driven
                                                       straight out is clear
  stroke through the empty corner of an L bracket     -> clear; the same stroke along the
                                                       bottom leg is a collision
  seated against its neighbour at travel 0            -> collision at 0.00 mm
  20 mm interval, refinement budget 5 placements      -> ambiguous, basis interval

mutation check, because a passing suite proves nothing about which branch it exercises
  with the interval refinement disabled, exactly two tests fail: the thin obstruction and the
  rotation arc. Restoring it returns all 14 to green. The counterexample is load-bearing.

invariants this rests on, unchanged by this commit
  STEP SHA-256 e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588
  70/70 occurrences matched to their own mesh, lowest winning fraction 0.9912
  1,295 cylindrical faces over 31 definitions, 64 candidate travel axes (RV-003)

still open
  - the generator that consumes this: poses, motions, per-obstacle clearance requirements and
    alternative groups for all 70 targets. The advisor confirmed the shape: one requirement per
    colliding obstacle listing every pose that measurably clears, so a 4 mm supported
    withdrawal stays a cheaper legal option than taking the neighbour off.
  - pose tolerance (0.1 mm, 0.5 deg) is deliberately NOT applied here: minGapMm is reported and
    the generator applies the reviewed tolerance, so the tolerance stays a dataset parameter
    rather than a property of the geometry.
~~~

## Verification rows touched

- V02
- V10

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npx vitest run tests/geometry/sweep.test.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-commit-gate-renders-its-own-evidence` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-commit-gate-renders-its-own-evidence` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-commit-gate-renders-its-own-evidence` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

These scenarios name a screen that is not built yet, so their PNGs show a labelled stub.
They confirm routing only: they cannot evidence behaviour introduced by this commit.

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

**2 of 3** captures are placeholders.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-commit-gate-renders-its-own-evidence` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-commit-gate-renders-its-own-evidence` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M README.md
?? docs/progress/2026-11-27-swept-volume-clearance-primitive/
?? tests/geometry/sweep.test.ts
?? tests/helpers/frames.ts
?? tools/lib/sweep.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
