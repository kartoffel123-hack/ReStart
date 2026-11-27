# Software Design Implementation Plan

**ReStart 0.1.0 · Engineering handoff for Qwen3.8-Flash-Next and the five-person team**

First deliver a single working repair in which the mechanic selects an occurrence, follows its animated access steps, confirms the replacement, restores the assembly, and sees the evidence. Develop against a tiny fixture while the CAD owner prepares the real assembly. Then run exactly the same path for all 70 targets. Product decisions and red tests are in the companion documents. [Software Design Plan](01-software-design-plan.md) · [Software Verification Plan](03-software-verification-plan.md)

## 1. Start from the measured baseline

The repository at planning time contains source assets. The checks below ran in an isolated temporary project on macOS. These are observations about the toolchain and the input file. Implementation tickets below are still work to do.

| Probe | Result to reproduce |
|---|---|
| Frontend and test stack | Node 24.22.3, React/React DOM 19.2.6, Vite 8.0.14, React plugin 6.0.2, Three.js 0.184.0, Vitest 4.1.7, jsdom 29.1.1, React Testing Library 16.3.3, DOM Testing Library 10.4.2, MSW 2.15.0. The production build and three tests passed. A DOM confirmation changed a Three.js-derived pose readout, a static-manifest fetch succeeded, and a missing asset returned 404. |
| Actual STEP import | SHA-256 `e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588`. Node with `occt-import-js@0.0.23`, output in mm, absolute linear deflection 0.12, angular deflection 0.4. The import yielded 70 distinct meshes, 37 mesh-bearing nodes and 111,646 triangles in about 3.3 seconds in one local run. Triangle count is a diagnostic for these settings. |
| Identity cross-check | Independently expanding STEP usage paths and matching transformed B-rep vertices against tessellated positions matched **70/70 distinct meshes**. With coordinates rounded to 0.01 mm, the lowest winning vertex-match fraction was 0.9912. The smallest separation from a same-name runner-up was 0.50. This gives a practical geometry-based disambiguator. |
| Coordinate witness | Stage 1 `NAUO1/NAUO79` is a 3-long axle. Its assembled mesh bounds center is approximately `[0, 0, 32]` mm. Both large rotor blade centers are at Y ≈ 47.5 mm. Use these to catch doubled placements or an incorrect up axis. |

### Bootstrap and commands

Use Node 24 and npm. Create the small Vite React TypeScript entrypoint directly at the repository root, preserving `assets/` and `docs/`. Set `type: "module"`, pin Node and the package lock, enable strict TypeScript, and run the app and Node tools through separate TS configs. Start with the tested versions. Resolve and pin the auxiliary dependencies below when implementing their tickets.

```sh
npm init -y
npm install --save-exact react@19.2.6 react-dom@19.2.6 three@0.184.0
npm install -D --save-exact vite@8.0.14 @vitejs/plugin-react@6.0.2 vitest@4.1.7 jsdom@29.1.1 msw@2.15.0
npm install -D --save-exact @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event @testing-library/jest-dom
```

Add TypeScript, `tsx`, matching `@types/react`, `@types/react-dom`, `@types/three`, and Node 24 types. Add Zod for runtime file contracts, `exceljs`, `occt-import-js@0.0.23`, `@gltf-transform/core`, and `three-mesh-bvh` for asset tooling. Add `@xyflow/react` and `@dagrejs/dagre` for the graph screen. Add `@playwright/test` for browser acceptance. Keep importers and workbook parsing on the build side. Check in the lockfile so the other four developers and CI can use `npm ci`. [Vite](https://vite.dev/guide/) · [Testing Library setup](https://testing-library.com/docs/react-testing-library/intro/) · [occt-import-js](https://github.com/kovacsv/occt-import-js)

| Future npm script | Implementation contract |
|---|---|
| `dev`, `typecheck`, `test`, `test:watch` | Vite, strict TS checking, `vitest run`, and interactive Vitest. Default tests must run without a live service or a headset. |
| `model:import` | Node/tsx tool reads the supplied snapshot and workbooks, validates joins, and emits geometry, identity crosswalk, and numerical witnesses. |
| `model:compile` | Generate candidate moves and constraints, apply reviewed rules, precompute routes and serialize the static package. Report coverage and unresolved targets. |
| `model:verify` | Reopen the serialized package, validate integrity and references, independently replay all 70 repairs, and emit a per-target report. Exit nonzero for missing or invalid repairs. |
| `build`, `preview`, `test:e2e` | Verify the committed static dataset, typecheck and run `vite build`. Preview `dist/` and run Playwright against the production build. The gallery also gets a development-server check. |

### Work areas and published artifacts

```text
tools/                  STEP and workbook import, constraint generation, batch verification
data/review/            versioned crosswalk decisions, motion evidence, approved patches, bench records
public/models/30465/    release manifest and content-addressed GLB, graph and manual data
src/domain/             data contracts, transitions, objective, planner, replay, report derivation
src/app/                loaders, session controller, view-model selectors, worker and storage adapters
src/presentation/       view contracts, screens, components, tokens.css and screen styles
src/scene/              Three.js scene adapter, camera, highlighting, explosion and XR input
src/graph-view/         controlled React Flow view and graph layout
src/concept/            development-only gallery, fixture view models and designer entry notes
tests/                  synthetic fixtures, source checks, integration, browser and release acceptance
```

Write intermediate model builds to a staging directory. Validate the entire package, content-hash the files, then publish a manifest referring to that single generation. Commit a known-good compiled dataset so a static host can build the app without retessellating CAD. Record source fingerprints, units, builder version, options and approved review revision. Keep generated intermediate files, caches and raw workbooks out of the web bundle.

## 2. Divide the 48 hours

The nominal budget is 240 person-hours. Assign A to CAD/identity, B to rules/planner, C to presentation/Three.js, D to reviewer/data integration, and E to verification/deployment. Pair up for mechanics decisions. Each hands-on operator must be someone other than that route's author. The five people can work concurrently against the same small fixture and view contracts.

| Elapsed hours | Integration milestone | Concurrent work |
|---|---|---|
| 0–4 | Typed fixture, first failing domain test, functioning Vite shell | A reproduces STEP import. B and E specify fixture truth. C lays out one polished step. D opens the physical kit, identifies tools, and starts a stage-to-instance worksheet. |
| 4–12 | Tiny repair runs end to end, first real occurrence is pickable | A validates the crosswalk. B pairs release/return moves. C builds the gallery and scene. D prepares reviewer edits and connection samples. E sets up CI and attempts an early Quest readability check if the scene is ready. |
| 12–24 | Real helicopter, one buried repair, editable blocker, before/after replay | A prepares CAD feature evidence. B compiles search inputs. C and D integrate real IDs and the full graph. E audits a candidate reference teardown and rehearses the first real repair. |
| 24–36 | A compiled repair and restoration for each of 70 instances | Use the coverage report as a queue. A/B/D resolve groups of missing motions by connection family. C polishes core states and accessibility. E runs independent replays, timing calibration and uncoached bench trials. |
| 36–44 | Rework failed bench routes, freeze a release candidate | Recompute all affected routes and evidence. Test Edge on Windows and Safari on Mac. Publish a team-approved static build through the chosen host. Spend remaining capacity on a stretch only when the core gates hold. |
| 44–48 | Verify the exact demo URL and capture evidence | Retain the last passing dataset and deploy. Verify its three bench records, export, local reviewer round-trip, screenshots and transfer example. Record stretch status separately. |

Treat the roughly **$300 of Copilot credits** as a development ceiling. Give Qwen one ticket, its fixture, permitted work area, and its red command at a time. Reuse the source manifest rather than pasting STEP text or workbook dumps into prompts. Review its diff at each green test. Reserve roughly one third of the credits for failures discovered after integration. External model inference has a separate budget. A locally served Qwen model can support the AI experiments.

### Ticket-sized handoffs for Qwen

After bootstrap, give Qwen the relevant implementation section and the named verification rows. For a Vitest entry below, the red command is `npx vitest run <test-file>`. The test paths are proposed files to create during implementation. A fixture-first ticket can start as soon as its types and expected observations are agreed.

| Ticket and owner | First test or check | Deliverable the next person can consume |
|---|---|---|
| 1 · A · Occurrence import | `tests/data/identity.test.ts`, V01 | Revisioned ID/mesh/pose crosswalk, GLB and locator report. |
| 2 · D · Inventory and timing | `tests/data/workbooks.test.ts`, V01/V07 | Type catalog, row references, candidate functional units, optional time mappings. |
| 3 · B + E · Mechanical transitions | `tests/domain/transitions.test.ts`, V02/V04 | Synthetic chain, alternative exit, partial axle and module with independent expected traces. |
| 4 · C · Initial page and concept host | `tests/ui/manual-screen.test.tsx`, V05 | Production screen and gallery share view props. Teammate can identify piece, direction and action on both screen widths. |
| 5 · A + D · Blocker inference | `tests/geometry/sweep.test.ts`, V02/V10 | Generated operation options with geometry/tool witnesses, correction data and classification trial. |
| 6 · B · Search, swap and restore | `tests/domain/optimality.test.ts`, V03/V04 | Full repair result exposing distinct count, restoration and proof status. |
| 7 · C + E · Real scene and controller | `tests/ui/repair-session.test.tsx` and production browser pick, V05 | One real buried target completes the same session through the actual screen and a replacement shell. |
| 8 · D · Local reviewer | `tests/review/preview.test.tsx`, V06 | Add blocker → recompute → inspect delta → export/reimport with the same result. |
| 9 · B + E · Whole-dataset release | `npm run model:verify`, V03/V04/V07 | Batch report naming each of 70 targets and any outstanding missing transition. |
| 10 · Team · Publication and physical proof | Real-browser matrix and bench protocol, V08/V09 | Tested URL and exact procedure fingerprints from three uncoached trials. |

## 3. Build the assembly package

### A. Import occurrences and geometry

Start with a failing test in which two placements of one definition must produce two IDs and two world poses. The source test must distinguish mesh-bearing nodes from physical pieces.

1. Read the original STEP bytes and hash them. Index the AP203 entities used by this snapshot, respecting quoted strings, multiline records, references, and complex relationship entities. Follow product definition → formation → product for names. Find the root from parent/child usage, expand reused definitions at every path, and detect cycles on the current recursion path. Produce IDs like `30465/NAUO1/NAUO79`. Keep the source revision in the dataset identity.
2. Resolve each usage's `PRODUCT_DEFINITION_SHAPE` and `CONTEXT_DEPENDENT_SHAPE_REPRESENTATION` to its representation relationship and `ITEM_DEFINED_TRANSFORMATION`. In this snapshot the parent-to-child representation relationship supplies two placement frames. Construct the child-to-parent pose as parent placement × inverse(child placement). Compose with the parent's world pose. Normalize axes, derive Y from Z cross X, and validate handedness against the coordinate witnesses.
3. Tessellate once with `ReadStepFile(bytes, options)` using the probe settings. Traverse all mesh indices attached to each hierarchy node. Stage 1 alone has four meshes on one node. The tessellated vertex coordinates already include the installed placement.
4. Build the crosswalk. For each definition, follow its shape representation relationship to the advanced B-rep and collect unique topological `VERTEX_POINT` Cartesian coordinates. Transform them by each occurrence's installed pose. Round each axis to 0.01 mm, hash tuples, and score against the unique vertex keys of every tessellated same-name mesh. Score = matched unique STEP keys / unique selected STEP keys. For this revision require a unique one-to-one match, winner ≥ 0.95 and winner minus runner-up ≥ 0.25. Report candidates and positions on failure. Test with the mesh array shuffled. A reviewed mapping can resolve an inspected ambiguity.
5. Export one GLB node per occurrence with `extras.instanceId`. Transform its assembled vertices back into the part frame once, rotate normals accordingly, convert local positions and installed translations from mm to m, and apply the installed node transform. Keep the model Y-up with the observed orientation. A scene can use a separate display root for the camera or an enlarged Quest model. Use glTF Transform's NodeIO and reload the binary to check identity and world-space landmarks. [glTF Transform NodeIO](https://gltf-transform.dev/modules/core/classes/NodeIO)
6. Join BoM rows by hierarchy, component type, and occurrence evidence. The current mesh and BoM sequences agree by type on all 70 rows, but repeated hierarchy names need an explicit revision-bound mapping if the row's individual identity matters. Resolve ambiguous labels at the kit or retain the shared type facts and mark the row link ambiguous. In `Teileliste` use data rows 4–34 and the color in column D. Row 35 is the total. Match on the supplied CAD name, including the source spelling `Small Bush - 30565`. Use the English MTM table keyed by `Row_ID`, cross-checking the German row and seconds columns by ID.

The import is ready when it yields 70 leaves, 31 distinct definitions, 70 labeled GLB nodes, a one-to-one mesh match, part-type quantities reconciled to 70, and traceable source rows. A source change produces a new revision and a diagnostic before old review data can be applied.

### B. Define the repair model once

Make these contracts the shared input to the CLI, browser worker, and test fixtures. Start with string IDs and plain arrays. The JSON wire format must represent all 70 pieces on every supported browser. If using BigInt masks internally, serialize sorted IDs or fixed-width words.

| Record | Required information |
|---|---|
| `Occurrence`, `Unit`, `Connection` | Stable ID, definition, parent, installed frame, mesh ID, descriptive labels and sources. A reviewed unit has explicit member IDs/internal interfaces. A connection identifies both endpoints, interface geometry/axis, kind, and classification evidence. |
| `Pose`, `Requirement` | Named installed, partially retracted, or parked configurations with rigid transforms. A requirement identifies an occurrence or interface and its acceptable states. All requirements on one operation must hold. Different admissible paths are distinct operations. |
| `Motion`, `MovePair` | Ordered path frames in mm and unit quaternions, moving member IDs, before/after pose and engagement maps, tool and approach volumes, support/contact allowances, stop landmark, and evidence. Pair an outward motion with an independently checked return. Specify a bench frame for moving intact modules and subsequent work on them. |
| `ReviewPatch` | Schema version, base model/graph revision, ordered edits with stable IDs, option and blocker references, required poses, accept/reject/add decision and reason. Keep raw candidates attributable. |
| `Repair` | Target IDs, ordered typed steps for release/swap/insertion/restoration/check, per-step camera/tool notes, unique disturbed IDs, preserved units, timing coverage, search/proof result, replay report and procedure fingerprint. |

The public domain entry points can be small. `applyReview(base, patch)` returns a graph or validation issues. `planRepair(model, target, budget)` returns a feasible repair plus search information, an exhausted no-route explanation, or a budget-limited unresolved result. `replay(model, repair)` emits per-step state and issues. `summarize(repair, evidence)` computes the mechanic-facing results. Keep each entry point usable in a Node test with plain inputs.

Use assembly coordinates for stored motion curves and state exactly which parent frame the curve uses. Store installed pose separately from displacement, and keep display-only explosion offsets in the scene. Use the target slot's occurrence ID for picking throughout a replacement. Track the fitted item as `original` or `replacement` so an implementation cannot pass restoration merely by returning the damaged item.

### C. Generate moves and blocker candidates

1. Extract candidate interface frames from transformed STEP cylinder axes and matching pin, axle, beam-hole and hub features. Use part type and geometry to propose both plausible travel directions. Begin with a per-definition feature table for ambiguous Technic shapes. Store feature measurements and source entity IDs. Rigid groups and functional-unit names need membership reviewed on the physical assembly.
2. Enumerate finite actions for full removal, partial withdrawal to a supported stop, and agreed intact-module movements. Give each a reachable exit or bench pose, tool approach, extraction stroke and return path. For a part inside a module, distinguish moving the module to the bench from freeing the individual target there. Reuse member poses relative to the module. Add intermediate frames for rotations or compound paths the kit actually needs.
3. For each motion and relevant obstacle pose, intersect the swept bounding box with candidate neighbor boxes. Use a triangle BVH or analytic primitive tests on remaining pairs. Test pusher entry, exit space, and supporting surfaces as well as the part sweep. Start with ≤ 0.5 mm translation or equivalent tip travel per sample and refine near small gaps. Use swept primitive or conservative interval tests for thin obstructions. Record ambiguous contact as requiring review. Store tolerances and tool dimensions with the evidence. [Three.js mesh BVH](https://github.com/gkjohnson/three-mesh-bvh)
4. Treat initial axle/bore, gear, and friction-fit contact as a classified mating interface. Permit only the contact region and release direction established for that interface. Other surfaces on the same two parts can still collide. For partial withdrawal, measure the smallest reviewed supported stroke that clears the target and identify a visible stopping reference. Check that the return pose and any keyed orientation are attainable.
5. Convert obstructions into operation-specific requirements and alternative directions. Store the limiting pair, pose/interval, obstacle ID and clear states. Record support or required engagement as a positive condition too. Compile the finite checks so a local reviewer can rerun the planner quickly. Produce the automatic graph before layering reviewed decisions on top.
6. Have the team assemble a known feasible reference sequence using the 22-stage sheet and kit as evidence. For each target derive a candidate prefix that releases that **individual** part, then swap, restore, and replay it. Where a construction-stage reversal is ambiguous, author or correct the missing motion and its return. Use feasible prefixes as search upper bounds. A label saying “stage 7” cannot satisfy a motion check.

Run a small **development-time AI classification exercise** alongside steps 1–5. Give the model instance descriptors, interface measurements, allowed classes from the workbook, and a structured response schema. Check labels against independently reviewed interfaces. Split by connection family or distinct examples, keeping the holdout out of the prompt. Record model/version, examples, abstentions, errors, and a before/after comparison if reviewed examples are added. Corrections form a reusable labeled set. Persist accepted evidence in the bundle. Full LLM-driven graph generation is a separate stretch ticket.

## 4. Implement the planner and restoration

**Start with the hand-worked fixtures in the verification plan.** Use the immutable reviewed graph as input. Keep playback and graph layout out of search.

1. Represent state with the current named poses, connection/engagement state, group/bench membership where needed, and the set of pieces disturbed so far. Track the target slot and whether it can be exchanged as an individual. Intern pose states and instance IDs for efficient comparisons. Never use a single JS 32-bit integer for this assembly.
2. A move is enabled when its starting states and all prerequisites hold, its tool is accessible, its swept motion is clear under the current configuration, and a valid paired return is available from the result. A group move updates every member atomically. Offer the partial and full strokes as distinct options. Reuse simulation results keyed by relevant poses, tools, motion revision and contact assumptions.
3. Expand the target's relevant operations, including alternate directions, moves acting on the target as a group member, obstacles, supports, tool access, and recursively the operations that can satisfy those conditions. Start with the entire catalog if dependency closure is uncertain. A proof requires complete expansion of the stated model.
4. Use branch-and-bound search with **distinct non-target members moved** as the primary cost. Order the frontier by disturbed count, then path length and stable operation ID. Moving a previously disturbed healthy piece adds zero. Include the disturbed set in the state key. Include outstanding return obligations whenever they can change feasibility, members moved, or cost. Merge two paths only when their future physical actions and return obligations are equivalent. Keep necessary time and step-count labels for those states. Discard dominated loops and cap search by expanded states. Seed the incumbent with the replayed reference route. Discard a branch when its disturbed count already exceeds the best complete repair.
5. When the target has been individually released, replace the damaged item with the like-for-like spare in the recorded orientation. Use the paired return operations in reverse access order, checking every insertion, support condition, tool approach and final engagement. A paired return can have different waypoints or a different tool. If a maneuver needs an extra member for restoration, model it explicitly and include that member in the cost. Accept only complete replayable jobs returning all installed poses and connections with the spare fitted. Retain feasible alternatives for the reviewer.
6. Among minimum-count candidates apply time **only when comparable**. Sum outward disassembly effort through target removal. Use the same time basis and complete mappings across the tie set. Otherwise rank by fewer operations and then stable operation-ID sequence. Make the timing policy deterministic for the set as a whole. Keep separate labels for fully timed and incomplete alternatives plus the shortest canonical prefix. This avoids accidentally dropping a valid untimed candidate or a faster equally disturbing route.
7. Prove the primary minimum when the remaining search frontier has no lower bound below the incumbent count. Finish the equal-count frontier to establish secondary ranking. Report primary proof and tie-search completion separately. Use a deterministic initial budget of 100,000 expansions per target for batch compilation, profile on the kit dataset, and increase per difficult target as needed. A capped search can return its replayed incumbent with “Best route found.” A capped search with no incumbent reports “Search incomplete.” An exhausted search without a goal reports “No feasible route” with the first unsatisfied alternatives. These statuses matter in the reviewer.
8. Build the 70 released manuals ahead of time. Produce a coverage table with target ID, reachable release, replacement, restored endpoints, distinct count, minimum/proof status, timing coverage and unresolved issues. The demo needs 70 valid jobs. Resolve missing moves or review mistakes when coverage falls short. A physical trial establishes the exact procedure it exercised.

For timing, join the chosen operation proxy to the workbook row and state the assumption about applicability. A LEGO friction fit might merit a clip or press-fit analogue after review. Treat unmapped operations as unknown. Count one modeled physical act once even when it clears two contacts. Use a separate measured timing source where the team has observations. Show a duration for the modeled operations and coverage such as “4 of 5 actions timed.” Measure disassembly and restoration separately during bench trials.

For preserved units, derive the result from internal-connection history across the whole job. A unit that was lifted rigidly, kept all internal interfaces, and was reinstalled is “preserved intact.” A module taken apart and later rebuilt has a different history even when its final pose is identical.

## 5. Deliver the mechanic UI and the editable design concept

### Contract first

Create a stable presentation contract with readonly data, event callbacks, and replaceable render slots. The app controller owns the selected instance, route, confirmed index, active phase, review revision and worker requests. View-model selectors derive all eligibility, counts and human-readable evidence from that state. The presenter may browse step history independently of the last confirmed physical state.

```ts
type StepViewModel = Readonly<{
  stepId: string
  ordinal: number
  total: number
  phase: 'remove' | 'replace' | 'restore' | 'check'
  heading: string
  instruction: string
  partLabel: string
  locationLabel: string
  toolLabel: string
  stopLandmark: string
  canConfirm: boolean
  confirmationLabel: string
}>

type ManualActions = {
  confirmStep(stepId: string): void
  replayMotion(): void
  resetCamera(): void
  returnToCurrentStep(): void
}
```

Pass these to a `ManualScreen` with separate `scene` and `partInset` React slots. The controller rejects a duplicate or obsolete `stepId`. Use the same pattern for the selector, graph, reviewer diff and completion screen. The scene takes a serializable scene description with IDs, installed/current poses, camera reference, active motion and highlight set, and emits picks or replay completion. React owns the outer layout. The domain has no React, browser, CAD or Three.js imports.

Qwen delivers a usable first design and a gallery where Astra can revise it quickly. Put visual tokens in `src/presentation/tokens.css`, page composition in screen styles, layout in presentational components, and fixture scenarios in `src/concept/`. Include a short developer map in that folder from screen → component → style → fixture. The business rules get their own tests. Make the gallery host consume real production components with the same props. Keep route planning, raw storage, API calls and mesh traversal in their respective adapters.

### Implement one good-looking page before multiplying screens

1. Build the design-plan wireframe at 1280 × 800. Use a wide grey drawing field, one large black step numeral, one pale yellow inset, and one prominent confirmation control. The helicopter should fill roughly two thirds of the usable drawing area without cutting off blades or arrows. Use consistent 8/16/24 px spacing, a 44 px minimum primary hit target, and a 16 px starting body size. Fit the scene and instructions together at laptop height.
2. Use the kit's real colors and a dark contour on the active piece. Draw a red arrow with contrasting edge and a ghost at the starting pose. Keep the arrow anchored when the model rotates. The thumbnail, action verb, and tool side must identify the same piece. Make the quantity “1×” and the actual stop condition legible. Render an inset cutaway or ghosted neighbors for a buried part.
3. At 390 px, stack the viewport above the instruction strip. Keep confirmation in reach and preserve the tool and stop landmark without horizontal scrolling. Keyboard users can select an item in the list, return to the current step, replay and confirm. Provide visible focus and a static paired-pose view under reduced motion.
4. Wire the development-only concept gallery to deterministic example states from the design plan. Capture a first-pass screenshot at both widths for target selection, a buried step and the reviewer diff. Ask a teammate to identify the highlighted piece, direction and next action without explanation. Fix ambiguous arrows, clipped geometry, awkward crops or unreadable labels before propagating the layout to the rest of the app.
5. Wire the real loader. Provide group search, occurrence-level selection, click-to-pick, camera framing, temporary isolation and a consistent nose/tail orientation. An internal piece is reachable through the inventory. Offer helpful loading/retry states and a textual route alongside the visualization.
6. Use one Three.js renderer per active scene, `GLTFLoader`, `OrbitControls`, raycasting from pointer to the nearest pickable occurrence, and a single animation loop. Record a neutral material state per mesh. Reset selection cleanly when it changes. Derive step poses from confirmed state plus the current preview interpolation. Show the verified path at bench speed. Render exploded overview offsets separately and reset on exit. Dispose renderer resources/listeners at unmount and ignore stale asset responses. [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
7. Deliver the entire remove → replace → restore → check session. Only an explicit confirmation commits a step. On refresh, use a tab-scoped checkpoint keyed to target, route fingerprint and confirmed index. Ask the mechanic to confirm that the physical kit matches before resuming. A changed procedure offers restart from the installed state once the mechanic confirms the assembly is ready.

## 6. Implement reviewer, evidence and publication

1. Display the full part hierarchy, all potential dependency options and a target-focused route. Distinguish containment, contacts and “must clear before” edges with labels and line styles. Connect operation alternatives using explicitly labeled choices. Keep the textual prerequisite list available alongside React Flow. Selecting a node highlights the occurrence on the helicopter.
2. Offer accept/reject for a generated relation and “Add blocker” for a selected *move option*. Pick the obstacle instance, the state that clears it, and a reason. Validate references and meaningful pose transitions. Apply drafts immutably to a baseline clone. Allow unsolved combinations as inspectable drafts, with clear status.
3. Run the same solver in a worker. Tag requests with revision and sequence number, cancel or ignore obsolete previews, and compare old/new steps, count, seconds/coverage, proof and replay. Show a specific dead end when a change blocks all alternatives. A saved preview can be exercised locally. Keep the baseline reachable and snapshot an active mechanic session so an edit cannot silently change its next step.
4. Store one validated draft envelope in localStorage per base revision. Parse into a temporary object on import, validate IDs, finite numbers, versions and edit conflicts, then replace the draft in one save. Failed imports preserve the existing draft. Duplicate imports of the same edit IDs are idempotent. Detect a changed draft in another tab before overwriting it. If storage is unavailable, keep the draft in memory and offer JSON export. A team member promotes it by committing the reviewed data and rebuilding.
5. Compute a canonical procedure hash from the model/geometry identity, target/member IDs, ordered physical actions, directions, stroke, tool, physical support requirements, return motion/instructions, stop landmark and function check. Keep the graph revision and this procedure hash as separate fields. Replan/replay all 70 on publication. A new graph edge that leaves the operator's procedure unchanged preserves its physical record if the fresh replay passes. Keep old records as history for changed procedures. Only linked bench records can set a physically verified status.
6. Export the resolved graph with units, stable endpoints, conditions, alternatives, revisions and evidence. Export a concise repair report with counts, actual preserved units, time basis/coverage, check results, route fingerprint and evidence status. Add the design plan's hypothetical medical-equipment enclosure example to the demo explanation.
7. Serve `dist/` over HTTPS, with Vercel's Vite preset as the reference host. Hash routes such as `#/review` work on a static host. Resolve resources against Vite's base URL, serve immutable hashed model files and revalidate the small manifest. Test on a clean Windows browser and on macOS. Keep the previous passing build available if a release fails. [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)

## 7. Stretch tickets

| Ticket | Implementation and demonstration |
|---|---|
| Quest 3 digital twin | Feature-detect WebXR and start from a user gesture on HTTPS. Use Three.js XR and the same scene description/session controller. Try immersive AR for a passthrough tabletop, with immersive VR available if supported. Position an enlarged helicopter beside the kit, set a comfortable reset/recenter position, and render a legible in-world prompt. Map one controller action to confirm and one to replay. Debounce selection, advance one piece at a time, and preserve the active step on session exit. Test on the available headset with two adjacent repeated pieces. Try a manually aligned stationary overlay only after the digital twin is reliable. [Meta mixed-reality sample](https://developers.meta.com/vr/documentation/web/web-sample-realmeasure/) |
| Joint repairs | Extend the planner to a set of target IDs, a replaced mask, and explicit opening/closing transitions. Keep shared access open while swapping each accessible target. Search the combined job and count healthy occurrence IDs once. Cover a target inside an already displaced module, adjacent targets with a shared blocker, and two independent repairs. |
| Part description | Send compact catalog entries and location descriptors to an external service through a server-side adapter, or use a team-hosted local Qwen endpoint during development. Return ranked IDs, disambiguate visually and require a confirmed selection. Validate against the active dataset. Handle service failure by opening the ordinary picker. Keep service credentials server-side. |
| LLM-generated graph with simulator feedback | Build an offline proposer → schema validation → deterministic simulation → counterexample → revision loop. Accept typed candidate moves and constraints only. Return colliding instance IDs, first failing interval, tool envelope, support or insertion failure. Replay forward and back. Limit retries and cost, checkpoint results, evaluate on held-out connections, and compare coverage and false approvals with the reviewed baseline. A validated trial enters the ordinary review/promotion path. |

## Handoff at each integration point

Give the next engineer the changed interface, the smallest failing/passing fixture, the commands run and the remaining unresolved target IDs. Ship the tested dataset and code as one release. For any selected piece the release report must show what moves, why it moves, how it goes back, and what evidence supports that exact manual.

## 8. Progress evidence: capture screenshots before every commit

> **Addendum, added 2026-11-26 during implementation.** This section was not part of the
> handoff at planning time. It adds a working agreement; it does not change any measured
> baseline, ticket boundary or acceptance gate above.

Every commit captures what the change made visible, under `docs/progress/`. The point is a
reviewable trail of the build: someone opening the repository the morning after should see
the newly introduced behaviour without running anything.

1. Run the capture **before** `git commit`, after the change's own tests are green:
   `npm run progress:screenshot -- --title "<what this commit changes>"`.
2. Output goes to `docs/progress/<yyyy-mm-dd>-<slug>/`: one PNG per scenario per viewport,
   plus `notes.md` recording the date, `HEAD`, the changed files, the commands actually run,
   the verification rows touched, and one line per screenshot saying what it highlights.
3. Scenarios come from `tools/progress/scenarios.ts`. Add the scenario that shows *this*
   commit's behaviour; a commit that changes no visible state still captures the affected
   screen so the absence of change is itself on record. Use the two gate widths from §5
   (1280 × 800 and 390 × 844) plus any extra state the change introduces.
4. Screenshots are committed with the change they document. They are evidence, not
   fixtures: nothing under `docs/progress/` is read by a test, and regenerating one never
   justifies a source edit.
5. A commit that cannot produce a screenshot because the surface does not exist yet says so
   in `notes.md` and names the ticket that will make it capturable. Pure domain, importer or
   planner commits capture the closest rendered state plus the command output that proves the
   change.

This is a commit gate, not a release gate: the V01–V10 rows in the verification plan still
decide release, and the §5 visual review still uses its own frozen baselines.

### 8.1 A capture has to differ to count as highlighting something

> **Second addendum to §8, added 2026-11-27 during implementation.** §8 asked for "the
> scenario that shows the newly introduced behaviour" and left that to judgement. Three
> captures of one shared placeholder screen satisfied it on paper, so the requirement now
> carries a measurement. Nothing above changes: same folder, same command, same gate role.

`npm run progress:screenshot` decodes every PNG it writes (`tools/progress/png-diff.ts`) and
records two pixel comparisons in `notes.md`:

| Comparison | Reported under | What it rules out |
| --- | --- | --- |
| Δ between captures in one set, per viewport | *Captures that look the same* | two scenarios that render the same screen while claiming to differ |
| Δ against the same scenario in the previous capture folder | *Unchanged since the previous capture* | a commit whose captures repeat the previous commit's |

Δ is the fraction of pixels whose samples differ by more than 8/255. At or below **0.2 %**
the two renders count as the same screen. Byte equality is deliberately not the test: the
same pixels encoded with a different scanline filter are the same screen, and different
bytes are not evidence of a change.

What this means at commit time:

1. Every commit still gets one folder under `docs/progress/<yyyy-mm-dd>-<slug>/`, written
   before `git commit`, with the change it documents.
2. A capture listed under *Unchanged since the previous capture* evidences nothing new.
   Either show the state the commit introduces — add a scenario or state in
   `tools/progress/scenarios.ts`, narrow the set with `--only` — or state why there is
   nothing to see.
3. If **every** capture repeats the previous set and no `--note` was passed, the tool exits
   nonzero. Commits with no visible surface are normal here (importer, graph and planner
   work precedes the screens), and that is exactly what
   `--note "no rendered surface yet — Ticket 4 makes it visible"` records. The refusal
   exists to stop a silent repeat, not to block build-side work.
4. The Δ column is read with the diff. A small Δ is not automatically wrong — a changed
   caption is a real change — but it has to be explainable from the commit subject.
5. Screenshots stay a trail, not a gate: no test reads them, they satisfy no V-row, and the
   frozen §5 design-review baselines stay in Playwright.

### 8.2 A placeholder is not a screen

> **Third addendum to §8, added 2026-11-27 during implementation.** §8.1 measures pixels and
> was still satisfiable by a stub: three routes rendering one shared placeholder with
> different copy produced three different pictures, so every capture "differed" while the
> application was one screen. This closes that gap. Same folder, same command, same gate role.

A renamed screen is not a new screen, and a pixel comparison cannot tell the two apart. The
capture tool therefore records a second, structural fact about every capture:

| Fact | Where | What it rules out |
| --- | --- | --- |
| **Layout identity** — tags, classes and nesting of the mounted screen, with all text and attribute values excluded (`tools/progress/screen-signature.ts`) | *Layout* column and *Captures that share one layout* in `notes.md` | scenarios that claim distinct screens while rendering one structure with different wording |
| **Placeholder marker** — the screen root carries `data-placeholder` while a stub stands in for a built screen | *Screens still rendered by a placeholder* in `notes.md` | a capture of a stub counting as evidence of new behaviour |

What this means at commit time:

1. A capture whose screen is a placeholder evidences **routing only**. It proves the hash
   route resolved to the right screen component; it says nothing about behaviour.
2. If **every** capture in the set renders a placeholder and no `--note` was passed, the tool
   exits nonzero, alongside the §8.1 rule for a set that repeats the previous commit.
3. Changing a stub's copy is not a change of screen. A commit that only rewords a placeholder
   must not present its captures as a new screen, and `notes.md` will show the layout unchanged.
4. Until Ticket 4 (mechanic screen) and Ticket 8 (reviewer screen) land, all three routes
   render the one shared stub, so the trail reads "0 built screens". That is the accurate
   state of the build and is preferred to three pictures that look like three screens.
5. Layout identity compares captures at the same viewport size only, and ignores class order,
   so a stylesheet edit is not reported as a new screen.

This stays a commit-time trail, not a release gate: no test reads `docs/progress/`, and the §5
design-review baselines stay in Playwright.
