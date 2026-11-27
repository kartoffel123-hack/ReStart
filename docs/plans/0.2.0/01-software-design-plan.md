# Software Design Plan

**ReStart 0.2.0 · Replace the helicopter demo with the LEGO CT scanner (4000041)**

A mechanic opens the same hosted URL, picks one particular brick on the CT, and uses the existing **Mechanic Manual** to exchange it and put the model back into service. Deliver the whole assembly for inspection. Aim for five demonstrable single-piece repairs; the minimum for switching the demo is **one complete CT repair**, independently replayed, completed in the production browser, and demonstrated uncoached on the kit. Until there is a kit trial, report software readiness separately. No CT repair is verified at plan handoff.

[Engineering tickets](02-software-design-implementation-plan.md) · [Verification and cutover](03-software-verification-plan.md) · [Helicopter design](../0.1.0/01-software-design-plan.md)

## What is actually in the source

| Planning observation | Design consequence |
|---|---|
| [`4000041.io`](../../../assets/lego-ct/4000041.io), SHA-256 `b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2`, is a readable ZIP. `.info` reports Studio `2.24.1_1` and 566 parts. | Treat it as immutable. Parse `model.ldr` as the placement source; use `modelv2.ldr` as a second witness for individual placements. The archive members are different representations of the same assembly. |
| `model.ldr` has 566 type-1 placements in the root, 114 distinct root reference names and nine `0 FILE` sections including the root. Across sections there are 588 type-1 lines. `model.lxfml` contains 563 `Brick` and 599 `Part` elements. | Reconcile placed articles, posed composite parts and drawing primitives before fixing the physical-piece denominator. Do not equate lines, solids or triangles with replacement targets. Preserve the full reference name, including spaces in `…dat Copy 10`. |
| The archive includes `CustomParts/88738_raw.dat`, collider and connectivity files, and a flexible rope section. Studio's installed library is `/Applications/Studio 2.0/ldraw`, with `parts`, `p` and `UnOfficial`. | Resolve embedded geometry and its dependencies explicitly. Curved/flexible and decorated pieces belong in the assembly even if no manual is offered for them. A collider can help identify an interface; it is not the visible model or evidence that a hand can reach it. |
| The Fusion hub lists a `_Main Assembly - Lego Helicopter - 30465` document and a `CT` document under `Admin Project / Hackathon` in the helicopter search results. The projects list does not list a top-level `CT`. | Verify the destination by document and parent IDs before creating a CAD revision. Use the helicopter's [SolidWorks parts and stage assemblies](../../../assets/lego-helicopter-30465-1.snapshot.9/SOLIDWORKS%20files/) as the reference for reusable definitions, named groups and individually placed occurrences. |

## Five proposed demo pieces

These are **individual root placements**, not five part types to find later. Locators are 1-based lines in the pinned `model.ldr`; translations are rounded source origins in LDraw units (LDU), not mesh centres. Use the reviewed location name and inset in the UI. None of the access paths below has yet been established.

| Priority · placement | Part and source origin (X, Y, Z) | What to establish before offering the repair |
|---|---|---|
| 1 · line 250 | `50950.dat`, white curved 3 × 1 slope, `(870, −248, 210)` | First direct-release candidate: at the upper extent, with another similar slope nearby. Check finger purchase and support; seat a like spare with the curve facing the same way, level with its neighbour. |
| 2 · line 388 | `2431.dat`, white grooved 1 × 4 tile, `(800, −208, 310)` | Backup first repair. Confirm which end admits a separator; identify this tile among the adjacent white tiles, then check flush seating at both ends. |
| 3 · line 385 | `3068bp74.dat`, 2 × 2 printed suspension-bridge tile, `(840, −176, 328)` | Use the print to identify the piece and its orientation. Establish side access and verify the image is upright and the backing remains seated. |
| 4 · line 184 | `4274.dat`, Technic half pin, `(870, −192, 180)` | Repeated-instance/obstructed-repair candidate. Confirm the particular bore, extraction end, tool corridor, any necessary access step and final engagement. |
| 5 · line 483 | `60616a.dat`, 1 × 4 × 6 door, `(1184, −176, 292)` | Distinguish opening the door from individually releasing it. Establish hinge release, frame support and a return that restores the original swing without lifting the frame. |

Start with the slope and tile in the same bench session. If neither has a clear grip or a matching spare, inspect another exposed stock brick. Record the rejected ID, reason and replacement ID. Freeze the successful route first; expand coverage only as additional candidates pass the same model and browser checks. Report exact counts: *selectable / reconciled*, *released manuals / selectable*, and *successful physical trials / released manuals*.

## Product and data decisions

- **One product, two model packages.** `#/`, `#/review`, `#/graph` and `#/dof` follow one active dataset. Preserve the dev concept gallery and the helicopter package as a regression fixture and rollback destination. No parallel CT-only manual screen. Keep joint repair available where a verified joint route exists; an assembly with one single-target route does not need a fictitious joint route.
- **Identity survives conversion.** A revision-bound source placement maps to a Fusion occurrence, STEP placement, installed transform, graph occurrence, inventory row and pickable GLB node. Reuse geometry for repeated definitions; selections, colours and motions belong to occurrences. A multi-body piece still moves as one piece. Document any composite with independently serviceable children and count its physical pieces only once.
- **Mechanic Manual is the contract.** Search or raycast to the same instance, show an unambiguous overview and part inset, name the tool, approach side and stop landmark. Animate reviewed access, removal, exchange, insertion and restoration. Only confirmation advances physical state. Preserve inspection/history, replay, orbit/reset, checkpoints, reduced motion, fit-check failure/recheck, completion and export. Use scanner/door/table landmarks from the actual model in place of helicopter camera cues. An unsupported piece remains selectable with an explicit reason and no start button.
- **Minimum disassembly retains its meaning.** Count distinct healthy occurrences disturbed over the complete job, including module members and return-only moves. Keep containment, connection and directional requirements separate. Display the actual planner status and coverage. Kit fit/swing checks concern the LEGO assembly only. Use measured timing or reviewed, clearly labelled fictitious timing proxies; unknowns stay unknown. Helicopter workbook material, timing, contacts and bench records do not become CT facts.
- **Publication boundary.** Fusion and Studio are authoring tools. Ship only a checked static package; the mechanic needs neither installation nor sign-in. Load validated assets of one revision or offer retry. A failed CT fetch must never silently open a helicopter procedure. The [acceptance plan](03-software-verification-plan.md) distinguishes CT demo readiness from the existing 70-target helicopter release policy.
