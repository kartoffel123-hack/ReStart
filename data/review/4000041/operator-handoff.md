# CT scanner · operator and release handoff

The staged CT picker at `/?dataset=4000041#/` contains **270 MRI pieces and 14 Mid section pieces**. The string and the five surrounding scene groups are excluded. The back-room tile belongs to the historical full-kit build and is no longer offered.

| Demo | Spare and headline result |
|---|---|
| Buried: `4000041/L201` | White **plain 1 × 4 brick** (3010), inside the gantry crown, beside the brick with side studs. The plate in one crown section obstructs its upward exit. A slope in the other obstructs the handle of the dark-turquoise separator. Eight pages, ten healthy pieces moved as two intact five-piece sections. |

For the gantry demo open `/?dataset=4000041#/?piece=4000041%2FL201`. Select **Reveal buried piece**, confirm the highlighted ID, then start the repair. Keep room on the bench for the two roof sections and the spare. The manual parks the sections, identifies the middle two studs for the separator, exchanges the brick, and restores the sections in reverse order. The separator is a bench tool rather than another piece in the scene.

The [source-backed hard-route recipe](gantry-brick.json) is separate from the [original candidate list](demo-targets.json). The compiler and verifier check the vertical lift, horizontal transfer, bench positions and reverse path against the serialized GLB. The piece-blocker witness is `L208` (12.8 mm projected column overlap); the tool-blocker witness is `L254` (8.98 mm). Those numbers describe a collision, not a prescribed stroke. Check the actual grip at both low lips and confirm that all four slopes stay on their plate. If a section comes apart or the separator brings a different brick with it, record a failed trial at that step.

## Open the software candidate

After scoped compile and verification, stage and serve the candidate on the pinned Node 24 toolchain:

```sh
npm run model:ct-stage
npm run build
npm run preview
```

Open either demo link on the preview origin. The specific piece should already be selected. The ordinary `/?dataset=4000041#/` also supports a real 3D pick, keyboard inventory selection, and a button for each modeled repair. Opening `/?dataset=30465#/` returns to the helicopter without erasing a scanner checkpoint. `npm run test:e2e` exercises the pinned helicopter; the CT browser lane explicitly requires a staged CT package. `model:compile`, `model:verify` and `test:ct-data` use the Python environment in the CAD handoff (override with `CT_CAD_PYTHON`); neither the browser nor the static host needs it.

`model:ct-stage` installs only an opt-in candidate. The verified static site works without Fusion at runtime. The compiled CT geometry is kept in local staging. The model uses the LDraw Parts Library; `credits.json` in the candidate lists the resolved files, digests, authors and licence headers. Check the redistribution basis for Studio unofficial and embedded custom geometry with no licence header before deploying to an external host. The generated planar prints are mapped onto STEP faces; Studio minifigure texture artwork and transparent material finishes are not certified by the solid or placement checks.

**Bench candidate at handoff:** generation `c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45`, GLB SHA-256 `704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619` (3,089,952 bytes). The `L201` procedure fingerprint is `5c500211464f9a7e9a80c5ec485a24f9081180d71b0bda7bebfe1cfddeadc46f`. Check the actual report before registering a trial. Modeled coverage: 1/284. Independent trials: 0. Public cutover: pending.

## Record an actual replacement

**Frozen L201 attempt:** Use the [observer sheet](l201-trial-sheet.md) and [exact build and procedure pins](l201-trial-freeze.json). The private frozen archive on the CAD workstation is `.staging/4000041/frozen/b1db600444284e3ac44b3aa2001e390a2abc1df43bb4852c9ccabe2a0f2b3070/site.zip`. Serve the adjacent `site/` folder on loopback port 4218 for the sheet's manual link. The operator reads only the manual; the observer records actual events separately. No physical outcome has been submitted.

1. Use the complete LEGO scanner, the matching spare in the table above, and the tools named by the page. A different teammate from the route author operates it without coaching. The observer notes the starting condition and whether the correct occurrence was identified.
2. Read the procedure and dataset fingerprints from the **exported repair report** for this build. A browser confirmation means the user reported finishing a step. It is not a bench verification.
3. Record the selected ID, any other pieces moved, grip/tool used, disassembly, exchange and restoration seconds separately, final seating and fit check, and any deviation or help. Keep role identifiers pseudonymous. If the tile cannot be gripped or needs a separator, stop and record the step; do not improvise and report a pass. A same-piece stand-in is a rehearsal.
4. An independent reviewer records the checked tool, stops, contacts, support, return and function check. Enter the approval and trial in [evidence.json](evidence.json) using the existing `approvalSchema` and `benchSchema` in `src/domain/evidence.ts`. Retain failed trials as evidence too. Do not copy records from the helicopter or a different CT procedure.
5. Recompile, independently verify, and run `npm run model:verify -- --dataset 4000041 --profile bench`. This fails until an approved matching job has an uncoached, successful trial using a real spare with the expected disturbed pieces. A changed procedure requires fresh evidence.

## Default and rollback

**CT-V09 local rehearsal (2026-11-28): passed in Chromium 159.0.8154.6.** `node --import tsx tools/ct/rehearse-rollback.ts <frozen-site.zip>` checked the pinned archive SHA-256, extracted a fresh copy, and checked both served index digests. On one origin, enabling a temporary CT landing redirect selected the scanner; withdrawing it exposed the frozen bundle's real helicopter default. A pinned CT tab reloaded at the exchange checkpoint. Reopening `/` in that tab displayed the helicopter without consuming the CT checkpoint. A clean browser context completed `30465/NAUO33/NAUO39`, exported the matching fingerprint and opened helicopter review. Restoring the redirect resumed L201 at exchange, completed restoration and check, and exported the pinned CT fingerprint. This exercises rollback of the landing URL on the same bytes. It does not record an actual production deployment reversal, a hosted Edge/Safari pass, or a kit trial.

The shared selector is `src/app/default-dataset.json`. Leave `30465` selected while a gate is open. Before selecting `4000041`, test the exact candidate over HTTPS on Windows Edge and macOS Safari; complete the repair and exercise the reviewer, exports, hard refresh and rollback on that build. Record the accepted generation, browser/OS versions and URL in `data/review/4000041/web-acceptance.json` as checked by `tools/verify/site-run.ts`. No such pass is assumed. The production prebuild refuses a CT default without matching review, physical and browser evidence. Reverting the selector/build retains both dataset-specific URLs and the previous generation.

## MRI + Mid section working candidate

For getting the **intact** turntable out and back, see the [measured access path and blocker IDs](turntable-access.md). The existing roof moves alone do not release it.

The scoped build lives in `.staging/4000041/demo/`. `model:ct-stage` installs it on the local candidate channel. The static build checks the selected GLB IDs against the exact two-group set, excluding `4000041/L111` (string).

The intended hard target is the **black toothed turntable top** (`L112`, `88738_raw.dat`), not the light-grey bottom (`L192`, `18939.dat`). With the mating bottom fixed, the scoped meshes reject a straight pull along either axial direction. At −2 mm X, a point on the top moves from a 0.475 mm gap to 0.247 mm inside the bottom. At +2 mm X a different point moves from a 0.283 mm gap to 0.718 mm inside. Reproduce both points with `.tmp/ct-cad-env/bin/python -B -m tools.ct.turntable_fit`. These are rigid-motion counterexamples, not a force measurement or proof that all physical releases are impossible.

**Mechanics review needed before authoring a gear manual:** establish on a spare turntable whether the toothed half is individually serviceable, what yields or disengages, and how the replacement is reseated and checked for normal rotation. Record the observed interface, tool, support and stop for review. Moving both halves together does not exchange the top. A complete replacement turntable is a different target; do not use it as evidence for `L112`.

**Bench check with diagonal access assumed:** treating the intact pair as already on the bench, the [coaxial twist-and-pull study](turntable-bench.md) finds no rigid release orientation in either axial direction. The assumed diagonal transport is not an evidence upgrade for the access path or the exchange.

To rebuild: run the scoped Fusion export and independent STEP check in [plan 02](../../../docs/plans/0.2.0/02-software-design-implementation-plan.md), then `npm run model:import -- --dataset 4000041`. Clearance also needs the pinned full-kit obstacle GLB; rebuild it from the historical full CAD export with `npm run model:import -- --dataset 4000041 --profile reference` if absent. Run `npm run model:compile -- --dataset 4000041` and `npm run model:verify -- --dataset 4000041 --profile demo` before staging.
