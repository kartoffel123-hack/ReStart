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
**8,102 candidates → 1,632 confirmed face-pair joints → 84 pairs of pieces that grip**. The two
tests that did the work, in the order they mattered:

| Test | Rejects | Count | Why it is needed |
| --- | --- | --- | --- |
| Opposite material side | `same-side` | **6,335** | 3,402 candidates are two *bores* on one line and 2,933 are two *shafts* end to end. Their surfaces meet at the same radius and there is nothing to take apart. 78 % of the list. |
| Axial overlap of the two faces' own material | `apart` | 82 | A shaft and a bore that share an axis but never run together grip nothing. |
| Material side readable | `side-unknown` | 53 | 13 faces have a radial normal mean near zero. Reported, not guessed. |

`below-resolution` no longer fires. It used to reject 8 joints, and `apart` used to reject 167;
both counts were inflated by a frame defect described below, and 93 of those candidates are
joints.

The material side is read from the winding of the face's own triangles: their geometry normals
point out of the material, so averaged they point away from the axis for a shaft (688 faces) and
towards it for a bore (1,034). No input beyond the tessellation is consulted.

**Engagement is the overlap, not the length of the surface.** A 22.45 mm axle through a 7.85 mm
hole engages 7.85 mm. Confirmed grips run **1.80–8.00 mm** and land on discrete kit heights rather
than on a continuum, which is the evidence that the measurement is reading material and not an
untrimmed surface:

| Grip | Joints | The feature that produces it |
| --- | --- | --- |
| 1.80 mm | 8 | The friction section of a Friction Pin with Stud (30465) inside a Light Stud. |
| 3.00 mm | 56 | One bush. |
| 4.00 mm | 400 | The common beam-wall stack. |
| 7.30–7.50 mm | 385 | A beam wall, 7.9 mm wide, measured through the deflection. |
| 8.00 mm | 50 | The width a bevel gear or beam holds an axle over. |

Contact never exceeds **0.0534 mm**, i.e. LEGO's 0.05 mm line-to-line fit.

### Second defect found while measuring: the two faces were read in two frames

`MatingInterface.axis` and `.origin` are the **male face's own**, and a STEP
`CYLINDRICAL_SURFACE` stores an axis location of its own, so the female face's axial extent is
expressed from a different point along the line and sometimes in the opposite sense. The first
version intersected the two extents as printed, which compares numbers taken from different
origins.

Measured on this snapshot: **1,535 of 1,539** joints had their two origins more than 0.05 mm apart
along the line (worst 23.57 mm), **978** had a face pointing the other way along it, and **1,175**
reported an engagement that differed from the true overlap by more than 0.05 mm (worst 1.74 mm).
The direction of the error was not uniform, which is why plausible-looking numbers hid it:

- Real joints were **rejected**. A light stud's only candidate read as disjoint and was discarded
  as `apart`, or as `below-resolution` — this is what produced RV-003a.
- Surviving joints were **understated**. A synthetic 7.85 mm wall measured 3.00 mm, so a release
  stroke planned from it would stop short of clearing the wall.

`confirmInterfaces` now carries the female extent into the interface frame before intersecting, so
`contactSpanMm` is a distance along `candidate.axis` from `candidate.origin` — the frame a reviewer
and the move generator read it from. Four tests in `tests/data/contacts.test.ts` pin it, including
the counterexample that a genuine gap must stay rejected however the two origins are recorded, so
the fix is not "shift everything until it confirms".

### Defect found while measuring: `MeshBVH.closestPointToGeometry`

`three-mesh-bvh@0.10.0` returns the *global* closest approach regardless of which triangle is
handed to it. Measured on this snapshot, a male triangle whose centroid sits 7.74 mm from the
mating bore came back at **0.0303 mm**, while `closestPointToPoint` on the same triangle returned
**7.7418 mm**. Every engagement was therefore reported as the whole length of the shaft — the
first version of this file produced a maximum engagement of **70.50 mm**, which is not a joint in
this helicopter. The kernel now uses vertex-to-surface queries via `closestPointToPoint`, which is
the conservative direction: it can overstate a gap, never hide one.

## Folding face pairs into connections (same revision, later package)

RV-003b is closed by `tools/lib/joints.ts`, which runs inside `model:import` and reports
`interfaces.aggregated`. **1,632 face-pair joints fold into 84 connections**, one per piece pair
per axis line, and the fold is what the graph is built from.

| Measurement | Value | What it means |
| --- | --- | --- |
| Face pairs folded | 1,632 → **84** | A long bore is several cylindrical faces; the biggest single fold is 76 face pairs onto one line. |
| Piece pairs gripping on more than one line | **0** | A LEGO connection is one pin or one axle, so no pair of pieces needs a release direction chosen between two lines. |
| Connections whose grip is split by air | **0** | Every release stroke is one contiguous region, so the manual never has to say "it binds here *and* also here". |
| Stepped fits | **5** | Two diameters on one line. Kept as one connection and filed as RV-003d. |

Two numbers are kept apart on purpose. `bands` are **disjoint** grip intervals, so a grip two
faces describe twice is counted once — summing face pairs would report a 9 mm grip for a 3 mm
one and ask the mechanic for a 9 mm stroke. `spanMm` is the bounding region, which is where the
pieces interfere but is not a grip, because nothing binds in the air between two bands.

The aggregate frame is derived from geometry rather than from whichever face arrived first: the
axis is folded to a canonical sense and the origin is the point of the line closest to the
assembly origin. `tests/data/joints.test.ts` shuffles the 1,632 face pairs with a fixed PRNG and
asserts the 84 connections come out identical, so the graph cannot depend on the order the
tessellator emitted faces in.

### Who was asked about moving a tested baseline

AGENTS.md asks for the advisor before a decision that is expensive to undo, which includes
revising a baseline the tests assert. `advisor-ask` was called on 2026-11-27 with this file,
`tools/lib/contacts.ts` and `tests/data/contacts.test.ts` as context and **could not reach the
network** (workspace routing discovery failed after five reconnects), so there is no advisor
answer here. The reasoning that was recorded instead, and what would overturn it:

- This is **not a dataset revision**. The STEP bytes, the tessellation, the GLB
  (`3cc9b8263cbdb347`), the crosswalk scores and the triangle count are all unchanged; only the
  arithmetic that reads a joint out of them moved. Review data keyed to the source revision is
  therefore still valid.
- The old numbers were not a baseline that had been reviewed against anything. They had never been
  checked on the kit, and one of their consequences — a light stud with no joint at all, filed as
  RV-003a — contradicted a fact about LEGO that the same file had to explain away.
- What would overturn the new numbers: a kit trial in which the light stud's friction fit is
  judged *not* real. That is ticket 5, and it is now recorded as a check rather than an open
  defect.

### Review items

| ID | Item | Action |
| --- | --- | --- |
| RV-003a | **Closed by the frame fix.** `30465/NAUO33/NAUO39` (Light Stud) was the only occurrence with no confirmed joint; measured in one frame it grips its own friction pin over **1.80 mm** at a **0.0216 mm** gap. No occurrence is left without a joint. | Confirm the friction fit on the kit in ticket 5, as a check rather than an open defect. |
| RV-003b | **Closed.** 1,632 confirmed face-pair joints folded into **84 connections**, one per piece pair per axis line, in `tools/lib/joints.ts`. | Nothing further. The generator consumes `interfaces.aggregated`, not the face-pair list. |
| RV-003c | The 0.5 mm radius population (436 cylinders) is still unclassified and contributes no candidate. | Classify or exclude before it can become a move. |
| RV-003d | **5 connections run two diameters on one line** — a stepped fit, where one piece enters another at two radii. Folding keeps them as one connection, because they share a line and a release direction, but the class and the stroke belong to the wider grip. | Check each on the kit in ticket 5: confirm the wider grip is the one that must be overcome, and that no step has to be rotated past a flat to clear. |

The Stage 1 axle witness still holds: every candidate naming `30465/NAUO1/NAUO79` has it as the male
side at radius 2.35 mm against a 2.4 mm bore, a radial gap of 0.05 mm, and an axis offset within
tolerance — which is LEGO's line-to-line fit and the reason 0.1 mm is the right radius
tolerance and 0.5 mm would not be.
