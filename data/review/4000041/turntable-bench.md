# L112 bench exchange: does turning the top unlock it?

**No rigid coaxial twist-and-pull passes the model.** For this study only, assume the complete turntable can be moved diagonally to the bench and returned. Hold the light-grey bottom `4000041/L192` fixed, keep the black top `4000041/L112` concentric and untilted, and allow arbitrary rotation about the bearing axis as the top translates along it. A common change of pose for both pieces on the bench does not change this test.

| Top offset along assembly X | Rotation tested | Minimum penetration certified between angle samples | Weakest sample |
|---|---|---:|---:|
| −2 mm | full 360° | 0.138746 mm | 167° |
| +2 mm | full 360° | 0.511568 mm | 352° |

To separate axially in either direction the top must cross the corresponding offset. At every angle at that offset, at least one measured point on the top lies inside the closed bottom. A dimensionally identical spare coming back along a rigid coaxial path must cross the same barrier. The result does not test tilting, off-axis release, a retaining feature flexing, or a differently shaped spare.

**Method.** The axis is X through `(Y,Z) = (56.79992, −72.00084)` mm. Use top surface points that are outside the bottom by more than 0.12 mm at home. At each integer degree find their signed distances to the bottom. For a point at radius `r`, rotating to any angle within half a sample step can move it at most `2 r sin(0.25°)`. Subtract this allowance from each penetration before choosing the strongest witness for that angle. The minimum over all 360 angles remains positive in both directions. The output includes the actual home coordinates and the weakest sample for each barrier. This is a geometric test on the serialized meshes, not a force estimate.

**Independent STEP and seated check.** Reopening `fusion-demo.step` and classifying the weakest-sample witnesses against its native shapes confirms top surface / outside bottom at home / inside bottom when moved. A separate top surface point at `[342.96990,44.26495,−49.10048]` mm is already **0.65956 mm inside** the bottom mesh in the assembled pose. The native bottom also classifies it as inside at home and after one 60-tooth pitch (6°). Consequently the published rigid solids cannot certify normal rotation of a reseated spare. This does not establish that the real kit is jammed.

**Status:** no verified individual exchange, spare insertion, or post-exchange rotation. To establish physical serviceability requires a spare turntable, a distinct matching toothed top, observed release and reseating of that top on the same bottom, and a before/after rotation check. A rehearsal with the original top cannot establish spare replacement. The frozen L201 trial covers a different target.

Reproduce: `.tmp/ct-cad-env/bin/python -B -m tools.ct.turntable_bench`. Scoped GLB SHA-256 `704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619`; scoped STEP SHA-256 `33be022914d8b8d0aeed30eb2810f4c429eb19c8d517933449f653fb14056f39`.
