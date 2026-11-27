# 84 connections: face pairs folded onto the axis line

- Captured: 2026-11-27T05:56:06.741Z
- HEAD at capture: `94f4e0b` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `a991cdf33599f621`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
one joint per piece pair per axis line: 1632 face pairs fold into 84 connections (RV-003b)

why the face-pair count was not the graph's number
  a face is a tessellator's convenience, not a fact about the kit. a long bore is modelled as
  several cylindrical faces and a stepped pin has one per step, so 1632 face-pair joints describe
  far fewer real connections. a graph built from the face count would tell a mechanic to free the
  same fit several times, and a stroke taken from one face would stop inside the wall.

npm run model:import   new row
  connections   84 joints, one per piece pair per axis line, from 1632 face pairs (RV-003b);
                grip 1.80-8.00 mm, 0 split grips, 5 stepped fits, 0 piece pairs on more than one line
  everything else unchanged: 8102 candidates, 1632 face pairs, glb sha256 3cc9b8263cbdb347

what the fold measured
  face pairs folded                1632 -> 84      biggest single fold: 76 face pairs -> 1 line
  piece pairs on >1 line                    0      a lego connection is one pin or one axle, so no
                                                   pair needs a release direction chosen between
                                                   two lines
  connections with a grip split by air      0      every release stroke is ONE contiguous region,
                                                   so the manual never says "it binds here and
                                                   also here"
  stepped fits (2 diameters, 1 line)       5      kept as one connection; filed as RV-003d

two numbers kept apart on purpose
  bands        disjoint grip intervals, so a grip two faces describe twice is counted ONCE.
               summing face pairs would report a 9 mm grip for a 3 mm one and ask the mechanic
               for a 9 mm stroke. the aggregate never exceeds the face pairs it merged -- pinned.
  spanMm       the bounding region. where the pieces interfere, but NOT a grip: nothing binds in
               the air between two bands.

witnesses
  the aggregate frame comes from geometry, not from whichever face arrived first: axis folded to
  a canonical sense, origin taken as the point of the line closest to the assembly origin. a
  fixed-PRNG shuffle of the 1632 face pairs reproduces the same 84 connections, so the graph
  cannot depend on the order the tessellator emitted faces in.
  15 tests in tests/data/joints.test.ts, incl. the counterexamples: two parallel lines 8 mm apart
  stay two joints; the same 3 mm reported by three faces stays 3 mm; a grip recorded from the far
  end with the axis reversed reads the same bands and the same id; a genuine air gap stays two
  bands. 233 tests green, typecheck clean.

three fixture bugs the tests caught before the code was trusted
  a reversed axis with its origin at z=0 describes world -3..0, not 0..3 -- the code was right
  and the fixture was wrong twice. a canonical axis of [0,0,-1] produced [-0, -0, 1], numerically
  equal but distinct under a deep comparison, so one axis read as two.

still open: RV-003c (0.5 mm radius population, 436 cylinders, unclassified) and the new RV-003d
(5 stepped fits to check on the kit, ticket 5).
~~~

## Verification rows touched

- V02

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run model:import`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-joints-measured-in-one-frame` | #/concept is the development gallery: three named states of the real ManualScreen, so a change captured here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-joints-measured-in-one-frame` | #/concept is the development gallery: three named states of the real ManualScreen, so a change captured here is a change the mechanic would see. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-joints-measured-in-one-frame` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

These routes are still rendered by a placeholder and their capture was identical
to the previous commit’s, so committing them would add pictures that highlight
nothing while the evidence panel above carries the change (plan §8.3). The
routes and the tickets that will replace them stay recorded here:

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `concept-route--laptop-1280x800.png` unchanged since `2026-11-27-joints-measured-in-one-frame` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--phone-390x844.png` unchanged since `2026-11-27-joints-measured-in-one-frame` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M README.md
 M data/review/interface-features.md
 M tests/integration/import-package.test.ts
 M tools/import/build-package.ts
 M tools/import/run.ts
?? docs/progress/2026-11-27-joints-folded-onto-the-axis-line/
?? tests/data/joints.test.ts
?? tools/lib/joints.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
