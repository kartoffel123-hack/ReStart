# Where the installed L129/L300 interference comes from

**The facing and slope already cross in the pinned Studio model.** The 82.898 mm³ value is reproducible on the independently reopened Fusion STEP. The export preserved both placements to much better than 0.001 mm. The exact numerical overlap should be attributed to the STEP solids: the original Studio drawing surfaces are not watertight and the facing was resampled during solid conversion.

## Independent geometry witnesses

| Input and measurement | Installed overlap |
|---|---:|
| Raw Studio faces, 0.100 / 0.050 / 0.025 mm cell pitch, majority of six axis-direction parity tests per piece | 80.440 / 79.894 / **79.962 mm³** |
| Same raw faces, oblique grid (XYZ Euler 17°, 31°, 53°), 0.100 mm pitch | **81.089 mm³** |
| Freshly reopened STEP, native OpenCascade Boolean common and volume properties | **82.898079 mm³** |
| Same STEP, separately tessellated definitions, installed mesh Boolean | **82.898079 mm³** |
| STEP meshes placed with the *Studio* transforms instead | **82.898127 mm³** |

The source calculation reads the pinned `.io` placements and recursively expands the two LDraw definitions, before any sewing, voxel reconstruction, Fusion import or STEP export. On a grid covering the intersecting bounds, a cell counts toward the estimate only if at least four of six tests from outside mark its midpoint inside **each** piece. Ties are reported separately. At 0.025 mm pitch the fully unanimous common volume is 15.379 mm³ and the tie volume is 3.670 mm³. Neither is an error bar. Discarding all odd-crossing rays on just one axis produces inconsistent partial totals (21.243, 73.937 and 62.211 mm³); it is not a closed-solid measurement. The closed STEP meshes give 82.844 mm³ using the same 0.050 mm grid, with zero tie volume.

Two local observations make the provenance conclusion independent of the exact source fill rule:

- An edge of raw slope triangle 55 passes through the **interior** of raw facing triangle 1543 at assembly `[315.334901, 74.000033, −44.001480]` mm. The minimum of the triangle-edge and segment-end plane margins is **0.604 mm**. This is a transverse crossing, not just touching bounds.
- At `[316.794376, 71.142170, −51.151480]` mm all six source tests classify the point inside each piece. Its nearest raw surfaces are 0.686 mm and 0.742 mm away. The same point is inside the two closed STEP solids (mesh distances 0.686 mm and 0.742 mm, respectively).

## Placement versus surface reconstruction

World axes are the assembly axes in mm (0.4 mm/LDU; reverse Studio Y and Z). The STEP reader follows the assembly hierarchy and composes native occurrence locations, without importing placements from the Studio manifest. The two origin translations agree to floating-point precision. For L129 the source local X,Y,Z axes map to +Y, −X, +Z with scales 1.000002, 0.999999, 1. For L300 they map to +Z, +Y, −X with scales 1, 1.000002, 1. STEP has the same directions with unit lengths.

| Occurrence · definition · STEP path | Installed origin (mm) | Largest source-vertex displacement due to frame change | Sampled surface distance, source→STEP / STEP→source (95th percentile; max) |
|---|---|---:|---|
| L129 · `24599.dat` · `MRI:1/24599.dat:8` | `[310.40620, 57.60000, −72.00124]` | 0.000081 mm | 0.0544 / 0.1455 mm; max 0.2945 / 0.4000 mm |
| L300 · `28192.dat` · `MRI:1/28192.dat:7` | `[324.00136, 79.99992, −48.00148]` | 0.000019 mm | below 0.000001 mm in both directions, including maxima |

The distances use every vertex and triangle centre in each **local** definition to the nearest opposite surface; they are samples, not Hausdorff bounds. L129 changed from 2,086 drawing triangles to 29,042 reopened STEP triangles (the reconstruction report records 0.12 mm voxels). L300 went from 64 to 68 via planar cells. Surface reconstruction and the definition of “inside” matter here; substituting the source frames alone changes the overlap by only **0.000048 mm³**. No adjustment of either occurrence, new contact allowance or claim about the physical kit follows from the comparison. The [facing access result](facing-access.md) still stands.

## Reproduce

Run `.tmp/ct-cad-env/bin/python -B -m tools.ct.facing_origin` from the repository root with the Studio library installed. The report includes both 4×4 matrices, source and STEP measurements, and witnesses. It does not read candidate GLB geometry. The audit pins:

- `assets/lego-ct/4000041.io`: `b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2`
- The 26 resolved part/primitive paths and content digests: `d2f17eefb49c98671c9f9ca869e876e18975a55c29a3a676b5425e5e1abd50ac`
- `.tmp/ct/fusion-demo.step`: `33be022914d8b8d0aeed30eb2810f4c429eb19c8d517933449f653fb14056f39`
