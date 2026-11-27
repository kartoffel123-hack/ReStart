# the assembly says which pieces are fitted together

- Captured: 2026-11-27T03:34:07.864Z
- HEAD at capture: `c14cd12` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `e55e09815e7e932c`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
mating interfaces: which pieces are fitted together, and the measurement that says "candidates"

placed faces   2312 cylindrical faces across 70 occurrences (1295 cylinders / 31 definitions)
candidates      8102 coaxial radius-matched pairs across pieces (coaxial <= 0.1 mm, radius <= 0.1 mm)
npm run model:import
  interface features       1295 cylinders over 31 definitions, 64 candidate travel axes
  mating interfaces        8102 candidates from 2312 placed faces ... candidates only
  glb                      1730348 bytes, 70 pickable instances, sha256 3cc9b8263cbdb347  (unchanged)
npm test                   Test Files 16 passed (16)   Tests 168 passed (168)
npm run typecheck          clean

why the candidate count is printed and asserted rather than celebrated
  a 70-piece helicopter does not have 8102 joints. two empty bores on one line satisfy the rule;
  so does a beam resting against a beam whose holes happen to line up. a STEP
  CYLINDRICAL_SURFACE is an infinite surface, so nothing in the feature table knows that a 7 mm
  hole stops after 7 mm. reading this list as the graph would attach a requirement no geometry
  supports and tell a mechanic to strip a healthy part for nothing.

witness that the rule itself is right, even though the count is too big
  every candidate naming 30465/NAUO1/NAUO79 has the axle as the male side at radius 2.35 mm
  against a 2.4 mm bore: radial gap 0.05 mm, axis offset within tolerance. that is LEGO's
  line-to-line fit, and it is why 0.1 mm is the radius tolerance and 0.5 mm would not be.

counterexamples pinned in tests/data/interfaces.test.ts (13 tests, kernel is pure geometry)
  two holes drilled in the same piece are not a joint
  parallel cylinders whose axes are 1 mm apart are not coaxial (at 0.04 mm they are)
  a 2.35 mm axle and a 2.85 mm bore are not a fit
  perpendicular cylinders are not a fit
  a bore traversed end-to-end is the same joint, not a second one
  an unrecognised part name classifies as `other`, which is a review item, not a guess

next package
  confirm a candidate by its two faces actually touching: take the triangles whose vertices lie
  on each cylinder, measure the distance between the two sets. under 0.1 mm is a joint. that
  also recovers engagement depth, which the surface geometry cannot give, and the release stroke
  follows from it. recorded in data/review/interface-features.md.
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
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-swept-volume-clearance-primitive` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-swept-volume-clearance-primitive` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-swept-volume-clearance-primitive` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-swept-volume-clearance-primitive` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-swept-volume-clearance-primitive` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M README.md
 M data/review/interface-features.md
 M src/domain/schema.ts
 M tests/integration/import-package.test.ts
 M tools/import/build-package.ts
 M tools/import/run.ts
?? docs/progress/2026-11-27-candidate-mating-interfaces/
?? tests/data/interfaces.test.ts
?? tools/lib/interfaces.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
