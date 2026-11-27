# face contact turns 8102 candidates into 83 piece pairs

- Captured: 2026-11-27T04:23:17.942Z
- HEAD at capture: `7237ed5` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `016c40700da6ede2`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
joints, not candidates: what the two faces' material says about each other

candidates       8102 coaxial radius-matched face pairs            (unchanged, still distrusted)
confirmed        1539 face-pair joints  ->  83 pairs of pieces that grip
grip             3.00 .. 7.50 mm      contact never above 0.0534 mm
npm run model:import
  mating interfaces        8102 candidates from 2312 placed faces ... candidates only
  confirmed joints         1539 face-pair joints over 83 piece pairs, grip 3.00-7.50 mm,
                           contact <= 0.0534 mm; rejected same-side 6335, apart 167,
                           side-unknown 53, below-resolution 8; 1 occurrence without a joint
  glb                      1730348 bytes, 70 pickable instances, sha256 3cc9b8263cbdb347  (unchanged)
npm test                   Test Files 17 passed (17)   Tests 186 passed (186)
npm run typecheck          clean

what collapsed the list, in the order it mattered
  same-side         6335   3402 candidates are two BORES on one line, 2933 are two SHAFTS end to
                           end. Their surfaces meet at the same radius and there is nothing to
                           take apart. 78 % of the candidate list was geometric coincidence.
  apart              167   a shaft and a bore that share an axis but never run together grip nothing
  side-unknown        53   13 faces have a radial normal mean near zero: reported, not guessed
  below-resolution     8   overlap finer than the 0.12 mm the mesh was built at is not evidence

which side the material is on is read from the winding of the face's own triangles -- their
geometry normals point out of the material, so averaged they point away from the axis for a
shaft (688 faces) and towards it for a bore (1,034). No input beyond the tessellation.

the defect this found, and why the first version of it was wrong
  three-mesh-bvh@0.10.0 closestPointToGeometry returns the GLOBAL closest approach no matter
  which triangle you hand it. Measured here: a triangle whose centroid sits 7.7418 mm from the
  mating bore returned 0.0303 mm; closestPointToPoint on the same triangle returned 7.7418 mm.
  Every engagement therefore came back as the whole length of the shaft, and the first run of
  this kernel reported a maximum grip of 70.50 mm -- a joint this helicopter does not have.
  The kernel now measures vertex-to-surface with closestPointToPoint, which is the conservative
  direction: it can overstate a gap, never hide one.

witness that the surviving number is on the kit's scale, not on the surface's
  grip 3.00 mm is a bush and 7.50 mm is one beam wall (7.9 mm); a 22.45 mm axle through a
  7.85 mm hole engages 7.85 mm, not 22.45 mm. contact <= 0.0534 mm is LEGO's 0.05 mm
  line-to-line fit. pinned in tests/data/contacts.test.ts (17 tests) and re-asserted through
  the pipeline in tests/integration/import-package.test.ts; disabling the overlap rule fails
  exactly 6 of them, including "measures the engagement where the material runs together".

needs review, with the ticket that will act on it
  RV-003a  30465/NAUO33/NAUO39 (Light Stud) is the only piece with no confirmed joint -- its
           only candidates grip by less than the deflection, so the mesh cannot evidence a real
           friction fit. Review on the kit, ticket 5.
  RV-003b  1539 face-pair joints describe 83 piece pairs, because a long bore is split into
           several cylindrical faces. Aggregate before the graph is generated, ticket 5.
  RV-003c  the 0.5 mm radius population (436 cylinders) is still unclassified and contributes
           no candidate. Classify or exclude before it can become a move.
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
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-candidate-mating-interfaces` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-candidate-mating-interfaces` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-candidate-mating-interfaces` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-candidate-mating-interfaces` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-candidate-mating-interfaces` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M README.md
 M data/review/interface-features.md
 M tests/integration/import-package.test.ts
 M tools/import/build-package.ts
 M tools/import/run.ts
?? docs/progress/2026-11-27-confirmed-joints-by-face-contact/
?? tests/data/contacts.test.ts
?? tools/lib/contacts.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
