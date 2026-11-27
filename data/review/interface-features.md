# RV-003 · Candidate interface features read from the STEP snapshot

| | |
| --- | --- |
| Record | RV-003, opened 2026-11-27 during Ticket 3C step 1 |
| Source | `assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP` |
| Source SHA-256 | `e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588` (matches the pin in AGENTS.md) |
| Code | [`tools/lib/features.ts`](../../tools/lib/features.ts), produced by `npm run model:import` |
| Tests | [`tests/data/features.test.ts`](../../tests/data/features.test.ts), [`tests/integration/import-package.test.ts`](../../tests/integration/import-package.test.ts) |
| Status | Feature table accepted as the input to move generation; feature **classification** still needs review (see below) |

## Why this record exists

[Plan 02 §3C step 1](../../docs/plans/0.1.0/02-software-design-implementation-plan.md) asks for
"candidate interface frames from transformed STEP cylinder axes and matching pin, axle,
beam-hole and hub features", with "feature measurements and source entity IDs" stored. Before a
move can be generated, the faces a move is allowed to cite have to be enumerated from the
supplied CAD and pinned to a revision, or the generator proposes motions nothing in the model
supports.

## How the file actually joins a definition to its faces

The join is not direct, and the obvious guesses resolve to nothing. Measured on this snapshot:

| Step | Entities | What it gives |
| --- | --- | --- |
| `PRODUCT_DEFINITION` → definition identity | 31 leaf definitions | The assembly tree's `pd:<id>` is this entity's label; `Occurrence.source.productDefinition` names it. |
| `SHAPE_DEFINITION_REPRESENTATION` → `PRODUCT_DEFINITION_SHAPE` → its third argument | 44 links (13 assembly + 31 leaf) | The definition side of the link is the **shape**, and the shape's third argument is the `PRODUCT_DEFINITION`. Keying on the shape entity itself matches nothing; keying on that third argument matches all 31. |
| The definition's `SHAPE_REPRESENTATION` | 31 | Holds only an `AXIS2_PLACEMENT_3D`. It carries **no topology**, so walking it finds zero faces. |
| `SHAPE_REPRESENTATION_RELATIONSHIP`, third argument = that shape representation, fourth = an `ADVANCED_BREP_SHAPE_REPRESENTATION` | 31 of 112 | The B-rep that owns the definition's faces. The other 81 relationships join usage transforms and are excluded by the fourth-argument test, not by a count. |
| `MANIFOLD_SOLID_BREP` → `CLOSED_SHELL` → `ADVANCED_FACE` → surface | 2,451 faces | The faces, each named by its STEP entity label. |

Two traps worth remembering: `Occurrence.source.representation` is a
`PRODUCT_DEFINITION_SHAPE` for the **usage** (its third argument is a
`NEXT_ASSEMBLY_USAGE_OCCURRENCE`), not for the definition; and a `CYLINDRICAL_SURFACE` is an
infinite surface whose faces are trimmed elsewhere, so its axis point may lie outside the
material. "Is the axis point inside the bounds" is therefore not a property a correct transform
has to satisfy, and the witness test uses the rigid distance from the axis line to the part
centre instead.

## What was measured

| | |
| --- | --- |
| Definitions with a feature table | **31 / 31** leaf definitions; none without at least one cylinder |
| Faces accounted for | **2,451**: 1,295 cylinders, 1,034 planes, 69 toroids, 13 cones, 10 bounded, 30 B-spline |
| Cylinder coverage | **1,295 of 1,295** `CYLINDRICAL_SURFACE` entities in the file, each owned by exactly one definition |
| Candidate travel axes | **64** across the 31 definitions, each offered as a ± pair |
| Cylinder radius range | 0.500 mm … 50.000 mm |
| Most frequent radii | 0.5 mm ×436, 2.4 mm ×193, 3.1 mm ×150, 3.65 mm ×135, 3.7 mm ×129, 2.35 mm ×57 |
| Most feature-rich definitions | Corner Beam 7×4×3 = 215 cylinders, Beam 7 Long = 153, Right Angle Beam 5×3 = 108, Beam 5 Long = 105 (beam bores) |

### Witness: the Stage 1 axle

`30465/NAUO1/NAUO79`, definition `pd:4817`, B-rep `#4276`, name `Axle - 30465_3 - Long`:

- 25 faces: **5 cylinders, 10 planes, 10 toroids**.
- All 5 cylinders share **one** travel axis, local `±[0, 0, 1]`, and all have radius exactly
  **2.35 mm** — the axle's own cross-section, which is what an axle extraction must follow.
- First cylinder `#8316`: local origin `[0, 0, 11.72]`, local axis `[0, 0, −1]`; transformed to
  assembly coordinates the axis is `[−1, 0, 0]` and the origin `[11.72, 0, 32]`, against the
  occurrence bounds centre `[0, 0, 32]` — the same centre the plan quotes as a geometry witness.
- The part frame is **not** aligned with the assembly frame here: local +Z maps to world −X. A
  generator that assumed "parts extract along +Z of the assembly" would be wrong on the first
  piece, which is why features are stored per definition and transformed per occurrence.

## Still needing review before this drives a manual

1. **Classification.** The table gives axes and radii, not the plan's classes. Assigning
   *pin / axle / beam-hole / hub* is a review decision: the 2.35 mm and 2.4 mm populations are
   close enough that geometry alone cannot be trusted, and the plan asks for a per-definition
   feature table for ambiguous Technic shapes.
2. **The 0.5 mm population** (436 cylinders) is the largest single radius and is not a mating
   interface; it is presumably fillet or construction geometry. It must be classified or
   excluded before it becomes a candidate move.
3. **Rigid groups and functional units** remain unreviewed, as RV-002 records for the bill of
   materials' 70 distinct functional-unit labels.
4. Nothing here has been checked against the physical kit. A generated move becomes *reviewed*
   only with a bench record, and *physically verified* only with a linked one.

## RV-003 · step 4 measurement: coaxial pairing yields candidates, not joints

Added 2026-11-27 during implementation, with `tools/lib/interfaces.ts`.

Placing every cylindrical face of every occurrence gives **2,312 placed faces** across the 70
pieces (the 1,295 cylinders belong to 31 definitions, and a definition is used more than once).
Pairing faces from different occurrences that are coaxial within 0.1 mm and matched in radius
within 0.1 mm yields **8,102 candidates**.

That is more joints than a 70-piece helicopter has, and the reason is visible in the fixtures:

- two empty bores bored along one line satisfy the rule exactly;
- a beam resting face-to-face against another beam whose holes happen to line up satisfies it
  too;
- a face's *trim* is not in the feature table — `CYLINDRICAL_SURFACE` is an infinite surface —
  so nothing here knows that a 7 mm hole stops 7 mm along the axis.

So this list is an input to review, not the graph. Reading it as one would put a requirement on
a move that no geometry supports, and the planner would then tell a mechanic to remove a healthy
part for nothing — the failure mode the whole objective is built to avoid.

## Confirmation by face contact (same revision, later package)

Confirmation landed in `tools/lib/contacts.ts` and runs inside `model:import`. It collapsed
**8,102 candidates → 1,539 confirmed face-pair joints → 83 pairs of pieces that grip**. The two
tests that did the work, in the order they mattered:

| Test | Rejects | Count | Why it is needed |
| --- | --- | --- | --- |
| Opposite material side | `same-side` | **6,335** | 3,402 candidates are two *bores* on one line and 2,933 are two *shafts* end to end. Their surfaces meet at the same radius and there is nothing to take apart. 78 % of the list. |
| Axial overlap of the two faces' own material | `apart` | 167 | A shaft and a bore that share an axis but never run together grip nothing. |
| Material side readable | `side-unknown` | 53 | 13 faces have a radial normal mean near zero. Reported, not guessed. |
| Overlap finer than the mesh | `below-resolution` | 8 | Below the 0.12 mm linear deflection the dataset cannot evidence contact. |

The material side is read from the winding of the face's own triangles: their geometry normals
point out of the material, so averaged they point away from the axis for a shaft (688 faces) and
towards it for a bore (1,034). No input beyond the tessellation is consulted.

**Engagement is the overlap, not the length of the surface.** A 22.45 mm axle through a 7.85 mm
hole engages 7.85 mm. Confirmed grips run **3.00–7.50 mm**, which is the kit's own scale: a bush
is 3 mm and a beam wall is 7.9 mm. Contact never exceeds **0.0534 mm**, i.e. LEGO's 0.05 mm
line-to-line fit.

### Defect found while measuring: `MeshBVH.closestPointToGeometry`

`three-mesh-bvh@0.10.0` returns the *global* closest approach regardless of which triangle is
handed to it. Measured on this snapshot, a male triangle whose centroid sits 7.74 mm from the
mating bore came back at **0.0303 mm**, while `closestPointToPoint` on the same triangle returned
**7.7418 mm**. Every engagement was therefore reported as the whole length of the shaft — the
first version of this file produced a maximum engagement of **70.50 mm**, which is not a joint in
this helicopter. The kernel now uses vertex-to-surface queries via `closestPointToPoint`, which is
the conservative direction: it can overstate a gap, never hide one.

### Review items

| ID | Item | Action |
| --- | --- | --- |
| RV-003a | `30465/NAUO33/NAUO39` (Light Stud) is the only occurrence with no confirmed joint. Its sole candidates grip by less than the deflection, so the mesh cannot evidence a real LEGO friction fit. | Review on the kit in ticket 5. If the fit is real, the stud needs a rule that does not depend on tessellation resolution. |
| RV-003b | 1,539 confirmed face-pair joints describe **83** piece pairs, because a long bore is split into several cylindrical faces. | Aggregate to one joint per piece pair per axis line before the graph is generated (ticket 5). |
| RV-003c | The 0.5 mm radius population (436 cylinders) is still unclassified and contributes no candidate. | Classify or exclude before it can become a move. |

The Stage 1 axle witness still holds: every candidate naming `30465/NAUO1/NAUO79` has it as the
male side at radius 2.35 mm against a 2.4 mm bore, a radial gap of 0.05 mm, and an axis offset
within tolerance — which is LEGO's line-to-line fit and the reason 0.1 mm is the right radius
tolerance and 0.5 mm would not be.

The Stage 1 axle witness holds: every candidate naming `30465/NAUO1/NAUO79` has it as the male
side at radius 2.35 mm against a 2.4 mm bore, a radial gap of 0.05 mm, and an axis offset within
tolerance — which is LEGO's line-to-line fit and the reason 0.1 mm is the right radius
tolerance and 0.5 mm would not be.
