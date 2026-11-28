# CT scanner · operator and release handoff

The table below describes the **previous, still-staged 566-piece build**. For the new 284-piece compiler and gear fit result, see [MRI + Mid section working candidate](#mri--mid-section-working-candidate).

| Demo | Spare and headline result |
|---|---|
| Direct: `4000041/L388` | White 1 × 4 **grooved tile** where the long back-room wall meets the perpendicular end tile. The model predicts a 12 mm lift, wall `L423` in place, zero healthy pieces disturbed. `L389` is the neighbouring tile. |
| Buried: `4000041/L201` | White **plain 1 × 4 brick** (3010), inside the gantry crown, beside the brick with side studs. The plate in one crown section obstructs its upward exit. A slope in the other obstructs the handle of the dark-turquoise separator. Eight pages, ten healthy pieces moved as two intact five-piece sections. |

For the hard demo open `/?dataset=4000041#/?piece=4000041%2FL201`. Select **Reveal buried piece** to see it through the two roof sections, confirm the highlighted ID, then start the repair. Keep room on the bench for the two roof sections and the spare. The manual lifts and parks each section as a unit, shows the separator seated on the middle two studs, exchanges the individual brick, puts the units back in reverse order and asks the operator to check the crown and opening. **Show starting pose** exposes the seated tool and the grasp location without advancing. The count is for this tool and motion catalog; it is not proof that no other physical approach exists.

The [source-backed hard-route recipe](gantry-brick.json) is separate from the [original candidate list](demo-targets.json). The compiler and verifier check the vertical lift, horizontal transfer, bench positions and reverse path against the serialized GLB. The piece-blocker witness is `L208` (12.8 mm projected column overlap); the tool-blocker witness is `L254` (8.98 mm). Those numbers describe a collision, not a prescribed stroke. Check the actual grip at both low lips and confirm that all four slopes stay on their plate. If a section comes apart or the separator brings a different brick with it, record a failed trial at that step.

## Open the software candidate

To serve the still-staged CT candidate on the pinned Node 24 toolchain:

```sh
npm run build
npm run preview
```

Open either demo link on the preview origin. The specific piece should already be selected. The ordinary `/?dataset=4000041#/` also supports a real 3D pick, keyboard inventory selection, and a button for each modeled repair. Opening `/?dataset=30465#/` returns to the helicopter without erasing a scanner checkpoint. `npm run test:e2e` exercises the pinned helicopter; the CT browser lane explicitly requires a staged CT package. `model:compile`, `model:verify` and `test:ct-data` use the Python environment in the CAD handoff (override with `CT_CAD_PYTHON`); neither the browser nor the static host needs it.

`model:ct-stage` installs only an opt-in candidate. The verified static site works without Fusion at runtime. The compiled CT geometry is kept in local staging. The model uses the LDraw Parts Library; `credits.json` in the candidate lists the resolved files, digests, authors and licence headers. Check the redistribution basis for Studio unofficial and embedded custom geometry with no licence header before deploying to an external host. The generated planar prints are mapped onto STEP faces; Studio minifigure texture artwork and transparent material finishes are not certified by the solid or placement checks.

**Bench candidate at handoff:** generation `197341fd60036d4eb759f4cbee890df846532d6cd523834d3b3a0aa40d64c427`, GLB SHA-256 `6b29220b3f79c718ce1e096fa9aa5d089d24f75217fecc9784f115a470124b75` (8,928,408 bytes). Procedure fingerprints: `L201` = `424f61ba6f715d4c60996413819bc73a84937f99c38fb85539a1bd31069eb6b9`; `L388` = `cae66b0b49bd380db9d65b76b54f5d6dbc22a0f94b8bfb05637be1e5e216d2e9`. The private bench ZIP contains the selected CT candidate, the helicopter pilot and the static application. Check the actual report before registering a trial. Modeled coverage: 2/566. Independent operator trials: 0. Public cutover: pending.

## Record an actual replacement

1. Use the complete LEGO scanner, the matching spare in the table above, and the tools named by the page. A different teammate from the route author operates it without coaching. The observer notes the starting condition and whether the correct occurrence was identified.
2. Read the procedure and dataset fingerprints from the **exported repair report** for this build. A browser confirmation means the user reported finishing a step. It is not a bench verification.
3. Record the selected ID, any other pieces moved, grip/tool used, disassembly, exchange and restoration seconds separately, final seating and fit check, and any deviation or help. Keep role identifiers pseudonymous. If the tile cannot be gripped or needs a separator, stop and record the step; do not improvise and report a pass. A same-piece stand-in is a rehearsal.
4. An independent reviewer records the checked tool, stops, contacts, support, return and function check. Enter the approval and trial in [evidence.json](evidence.json) using the existing `approvalSchema` and `benchSchema` in `src/domain/evidence.ts`. Retain failed trials as evidence too. Do not copy records from the helicopter or a different CT procedure.
5. Recompile, independently verify, and run `npm run model:verify -- --dataset 4000041 --profile bench`. This fails until an approved matching job has an uncoached, successful trial using a real spare with the expected disturbed pieces. A changed procedure requires fresh evidence.

## Default and rollback

The shared selector is `src/app/default-dataset.json`. Leave `30465` selected while a gate is open. Before selecting `4000041`, test the exact candidate over HTTPS on Windows Edge and macOS Safari; complete the repair and exercise the reviewer, exports, hard refresh and rollback on that build. Record the accepted generation, browser/OS versions and URL in `data/review/4000041/web-acceptance.json` as checked by `tools/verify/site-run.ts`. No such pass is assumed. The production prebuild refuses a CT default without matching review, physical and browser evidence. Reverting the selector/build retains both dataset-specific URLs and the previous generation.

## MRI + Mid section working candidate

The scoped build lives in `.staging/4000041/demo/`, separate from the previous public candidate channel. Its 284 placements are the two requested groups without `4000041/L111` (string). The fallback manual exchanges `4000041/L201`; the separator is a bench tool, not a selectable Decoration piece. The scoped candidate has no back-room tile manual.

The intended hard target is the **black toothed turntable top** (`L112`, `88738_raw.dat`), not the light-grey bottom (`L192`, `18939.dat`). With the mating bottom fixed, the scoped meshes reject a straight pull along either axial direction. At −2 mm X, a point on the top moves from a 0.475 mm gap to 0.247 mm inside the bottom. At +2 mm X a different point moves from a 0.283 mm gap to 0.718 mm inside. Reproduce both points with `.tmp/ct-cad-env/bin/python -B -m tools.ct.turntable_fit`. These are rigid-motion counterexamples, not a force measurement or proof that all physical releases are impossible.

**Mechanics review needed before authoring a gear manual:** establish on a spare turntable whether the toothed half is individually serviceable, what yields or disengages, and how the replacement is reseated and checked for normal rotation. Record the observed interface, tool, support and stop for review. Moving both halves together does not exchange the top. A complete replacement turntable is a different target; do not use it as evidence for `L112`.

To rebuild: run the scoped Fusion export and independent STEP check in [plan 02](../../../docs/plans/0.2.0/02-software-design-implementation-plan.md), then `npm run model:import -- --dataset 4000041`. Clearance also needs the pinned full-kit obstacle GLB; rebuild it from the historical full CAD export with `npm run model:import -- --dataset 4000041 --profile reference` if absent. Run `npm run model:compile -- --dataset 4000041` and `npm run model:verify -- --dataset 4000041 --profile demo`. These commands write private build outputs only. The older two-manual package remains the staged demo.
