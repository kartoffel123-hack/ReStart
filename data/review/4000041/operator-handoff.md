# CT scanner · operator and release handoff

The demo job is **`4000041/L388`**, the white 1 × 4 grooved tile where the long back-room wall meets the perpendicular end tile. `4000041/L389` is another white tile beside it. The model predicts release by lifting L388 straight up 12 mm while the long wall (`4000041/L423`) stays in place. Measure what actually happens at the kit. The other four original candidates and outstanding observations are in [demo-targets.json](demo-targets.json).

## Open the software candidate

On the CAD workstation, after the [Fusion export and independent reimport](cad-round-trip.md), run on the pinned Node 24 toolchain:

```sh
npm run model:import -- --dataset 4000041
npm run model:compile -- --dataset 4000041
npm run model:verify -- --dataset 4000041 --profile demo
npm run test:ct-data
npm run model:ct-stage
npm run build
npm run test:e2e:ct
python3 -B -m tools.ct.pack_site
npm run preview
```

Open `/?dataset=4000041#/?piece=4000041%2FL388` on the preview origin. The piece should already be selected. The ordinary `/?dataset=4000041#/` also supports a real 3D pick, keyboard inventory selection, and **Show available repair**. Opening `/?dataset=30465#/` returns to the helicopter without erasing a scanner checkpoint. `npm run test:e2e` exercises the pinned helicopter; the CT browser lane explicitly requires a staged CT package. The inspected input CAD, Studio library, caches and intermediate solids do not belong on the web host.

`model:ct-stage` installs only an opt-in candidate. The verified static site works without Fusion at runtime. The compiled CT geometry is kept in local staging. The model uses the LDraw Parts Library; `credits.json` in the candidate lists the resolved files, digests, authors and licence headers. Check the redistribution basis for Studio unofficial and embedded custom geometry with no licence header before deploying to an external host. The generated planar prints are mapped onto STEP faces; Studio minifigure texture artwork and transparent material finishes are not certified by the solid or placement checks.

**Bench candidate at handoff:** generation `7a67598e8c1e1970f4bcedb2db766a8ce03057fe04180edbdf73b09624e6de12`, GLB SHA-256 `6b29220b3f79c718ce1e096fa9aa5d089d24f75217fecc9784f115a470124b75` (8,928,408 bytes), procedure `cae66b0b49bd380db9d65b76b54f5d6dbc22a0f94b8bfb05637be1e5e216d2e9`. The private bench ZIP contains the selected CT candidate, the helicopter pilot and the static application; it needs no CAD install. Check the actual report and package revision before registering a trial. Modeled/browser coverage: 1/566. Independent operator trials: 0. Public cutover: pending.

## Record an actual replacement

1. Use the complete LEGO scanner, a matching **white 1 × 4 grooved spare tile**, and the tools named by the page. A different teammate from the route author operates it without coaching. The observer notes the starting condition, including both neighbouring tiles and the supporting wall.
2. Read the procedure and dataset fingerprints from the **exported repair report** for this build. A browser confirmation means the user reported finishing a step. It is not a bench verification.
3. Record the selected ID, any other pieces moved, grip/tool used, disassembly, exchange and restoration seconds separately, final seating and fit check, and any deviation or help. Keep role identifiers pseudonymous. If the tile cannot be gripped or needs a separator, stop and record the step; do not improvise and report a pass. A same-piece stand-in is a rehearsal.
4. An independent reviewer records the checked tool, stops, contacts, support, return and function check. Enter the approval and trial in [evidence.json](evidence.json) using the existing `approvalSchema` and `benchSchema` in `src/domain/evidence.ts`. Retain failed trials as evidence too. Do not copy records from the helicopter or a different CT procedure.
5. Recompile, independently verify, and run `npm run model:verify -- --dataset 4000041 --profile bench`. This fails until an approved matching job has an uncoached, successful trial using a real spare with the expected disturbed pieces. A changed procedure requires fresh evidence.

## Default and rollback

The shared selector is `src/app/default-dataset.json`. Leave `30465` selected while a gate is open. Before selecting `4000041`, test the exact candidate over HTTPS on Windows Edge and macOS Safari; complete the repair and exercise the reviewer, exports, hard refresh and rollback on that build. Record the accepted generation, browser/OS versions and URL in `data/review/4000041/web-acceptance.json` as checked by `tools/verify/site-run.ts`. No such pass is assumed. The production prebuild refuses a CT default without matching review, physical and browser evidence. Reverting the selector/build retains both dataset-specific URLs and the previous generation.
