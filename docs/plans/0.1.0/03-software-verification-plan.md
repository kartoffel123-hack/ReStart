# Software Verification Plan

**ReStart 0.1.0 · Test-driven development and release acceptance**

Release the web manual when **70/70 single-target repairs** can be loaded, replayed through replacement and restoration, and traced to the reviewed graph. Perform **three representative repairs on the physical helicopter**. A teammate who did not author each procedure must complete it from the webpage, without coaching, using the listed tools. Record the outcome against the exact procedure tested.

The [Software Design Plan](01-software-design-plan.md) defines the claims the app makes. The [Implementation Plan](02-software-design-implementation-plan.md) defines the data, work packages and commands. The tests below turn those claims into observable outcomes. The proposed release tests belong to the implementation work. The toolchain and CAD probes already executed are identified at the end.

## 1. Practice TDD on every work package

1. Pick one behavior from the matrix below. Give the test a name a mechanic could understand, such as “the axle remains in the beam while the gear is exchanged.” Write down the expected moved IDs, direction and resulting state before invoking the planner.
2. Run the narrow test. Confirm that it fails for the intended missing behavior. Correct a broken fixture or test harness before proceeding. Work from the smallest synthetic assembly that exhibits the problem.
3. Implement enough production behavior to pass it through the public entry point. Add a counterexample that could fool that first implementation. Examples include a second identical pin, a blocked pusher approach, or a restoration path that hits a neighboring beam.
4. Refactor while both tests are green. Run the neighboring integration tests. After source conversion, run the same implementation against the actual helicopter. Save the narrowest reproduction for every bug the coverage sweep or physical operator discovers.
5. A Qwen handoff includes the failing test and reason, the passing result, the file/contract changed, and the next unresolved case. Review deliberate fixture changes in the same diff as the evidence justifying them.

| Test layer | Exercise real code here | Appropriate doubles |
|---|---|---|
| Vitest in Node | STEP metadata, transforms, workbook mappings, graph rules, legal transitions, search, hash, serialization, metrics, batch replay | Tiny source fixtures and hand-worked operations. Use an independent enumerator as the small-graph oracle. |
| Vitest in jsdom with Testing Library | React views and app controller, keyboard selection, confirmation, reviewer forms, imports, persistence and rendered evidence | Deterministic scene/worker/clock adapters. Keep the real controller and view models for integration cases. |
| MSW in the Node test process | Fetching the manifest, graph, manuals, missing/stale assets and optional external model adapter | Return controlled responses through the normal fetch interface. Pure planner tests do not need a server. |
| Production browser and real GPU path | Vite build, GLB decoding, raycasting, actual camera/animation poses, layout, graph and WebGL lifecycle | Fixed viewport, data fixture, lighting, camera and elapsed animation time for repeatable observations. |
| Real devices and physical kit | Windows Edge without installation, macOS Safari, uncoached repair and restoration, optional Quest Browser with controllers | A human records observations, actual tools, kit state, timing, and function check. |

Configure Vitest with Node as the default. Mark DOM test files with `// @vitest-environment jsdom`. Import `@testing-library/jest-dom/vitest` in DOM setup, call cleanup after each render, and reset handlers and storage between cases. Use `userEvent.setup()` for keyboard and button sequences. In time-sensitive tests inject a controllable playback clock. Prefer semantic roles and accessible names. [Vitest environments](https://vitest.dev/guide/environment.html) · [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 2. Trace requirements to release evidence

| ID | Testable claim | Evidence for sign-off |
|---|---|---|
| V01 | Every physical occurrence has its own identity, selection and correctly placed geometry. | Source reconciliation, shuffled mesh match, 70 GLB lookups, close-up of a repeated part. |
| V02 | The hierarchy, connection and removal dependencies can be explained for every target. | Edge semantics, conditional alternatives, evidence references, generated and edited graph export. |
| V03 | The planner minimizes distinct healthy pieces disturbed within its reviewed model and qualifies its proof. | Hand-worked repairs, independent exhaustive comparisons, budget exhaustion and tie tests. |
| V04 | Every offered complete route clears the target, fits the replacement and restores the assembly. | Independent replay of serialized 70/70, continuous/path checks for limiting cases, final pose and connection diff. |
| V05 | The manual guides exactly one physical step at a time. The initial visual design is legible and replaceable. | DOM flow, interchangeable-shell test, real browser picking, gallery screenshots and novice identification check. |
| V06 | A reviewer can add/reject a blocker, preview changes and safely round-trip local edits. | Old/new route comparison, stale worker race test, JSON import/export, storage failure, selective evidence invalidation. |
| V07 | Time, intact units and the product-loop recommendation have auditable meanings. | Workbook row IDs, coverage/unknown tests, internal-interface history, observed versus estimated timing. |
| V08 | The same HTTPS build works for the demo on Windows and Mac. | Browser matrix on the release URL, deployment revision and a loaded production repair. |
| V09 | Three released routes work for a human at the kit. | Three uncoached records with matching fingerprints, timing split, final fit and function check. |
| V10 | Development-time AI suggestions have measurable accuracy and a review trail. | Held-out labeled interfaces, confusion counts, abstentions, accepted/rejected suggestions and model version. |

## 3. Establish independent fixture truth

Use short IDs in these **synthetic** fixtures. The given numbers are controlled test values. Store the expected steps and counts as human-authored test data. Keep fixture builders small enough that a reviewer can reconstruct the whole arrangement on paper. Each fixture starts installed with an original target and an equivalent spare available.

| Fixture | Setup | Expected observable result |
|---|---|---|
| Exposed target | T can be pulled directly. | Disturbed healthy set is empty. The procedure still releases T, exchanges the item, reinstalls it and checks the result. |
| Chain | A must leave before B, and B before T. | Access order A, B, T. Install new T, then B, then A. Count 2. The original T never re-enters its slot. |
| Alternative ends | Left exit needs A **and** B clear. Right exit needs only C clear and room for the supplied pusher. | With tool access choose right and disturb {C}. Block the tool approach and choose left with {A,B}. The left prerequisites do not leak onto the right option. |
| Partial withdrawal | A can retract 4 mm to clear gear T while supported. Fully extracting A requires moving B. | Choose the partial stroke, count {A}, leave A physically present at +4 mm during the exchange, then reseat A. A separate fixture puts a neighbor inside the partial axle's remaining volume and expects a collision. |
| Rigid module | One feasible option parks a three-piece intact module. Another removes two independent pins. The operator can also turn the entire model to see the joint. | Choose two disturbed pins even if the single module motion is faster. With the pin route disabled, count all three moved members and report the module preserved intact. Turning the complete assembly for access adds zero to the count. |
| Target in a module | A module containing T can be parked, but a retainer still traps T on the bench. | Parking alone leaves exchange unavailable. Release the retainer, remove T individually, fit the spare, reconnect the module and return it. |
| Identical pins | ID P1 blocks the left exit, same-definition P2 blocks a different interface. | Removing P2 leaves P1's requirement unsatisfied. Picker, graph, 3D callout, export, and restored pose all identify P1 consistently. |
| Shared and repeated movement | Two prerequisites require the same A to clear. A later moves through a second named pose. | Count A once across the job. Preserve its last physical pose for restoration. Reconnecting a previously split unit cannot turn its history into “preserved intact.” |
| Equal disturbance | Fully timed routes disturb one piece each, with synthetic disassembly costs 7 s and 11 s. | Choose 7 s. In a second fixture one route has an unknown duration. Expose incomplete coverage and use the documented stable fallback without assigning zero seconds. |
| Cycle with an exit | A's first exit needs B, B's first exit needs A, and A also has a clear second exit. | Find the second exit. Remove it and exhaust the tiny search to obtain a diagnostic. A deliberately tiny budget instead yields an incomplete-search status or a replayable incumbent. |
| Failed return | A removal has a clear outward stroke. Its proposed return needs a tool that the final support would obstruct. | Reject that complete repair. A separately authored valid insertion or alternative access sequence can pass. |
| More than 64 instances | IDs at indices 0, 32, 64 and 69 have different blockers or poses. | Sets, keys, JSON round-trip and disturbance counts distinguish every instance. |

Example of the level of assertion to write against the project public API. The fixture and helper names below are proposed test helpers.

```ts
it('leaves the axle supported until the replacement gear is seated', () => {
  const fixture = partialAxleFixture()
  const repair = requireFeasible(planRepair(fixture.model, 'gear', fixture.budget))
  const trace = independentlyReplay(fixture, repair)

  expect(repair.disturbedIds).toEqual(['axle'])
  expect(trace.atExchange.poseOf('axle')).toBe('retracted-4mm')
  expect(trace.afterInsertion.itemAt('gear')).toBe('replacement')
  expect(trace.final.poseOf('axle')).toBe('installed')
  expect(trace.final.connectionIds).toEqual(fixture.installedConnectionIds)
})
```

## 4. Verify import, graph and geometry

### V01 · Source and instance integrity

- Construct a two-level fixture in which one subassembly definition occurs twice. Expect different full paths and correct composed transforms for every leaf. A cyclic definition reference yields a path diagnostic. Reusing a definition on a different branch is valid.
- Check the fixed input SHA, 81 usage records, 13 assembly definitions including the root, 31 leaf definitions and 70 expanded leaf occurrences. Add a source-revision mismatch test. Reimport twice and compare canonical IDs, graph JSON and geometry metadata.
- Parse the original source independently for counts and coordinates. On the current tessellation confirm 70 meshes and 37 mesh-bearing nodes. Shuffle the mesh ordering and remap all indices in the test input. Expect the same physical ID → world position mapping. Feed a tied score and require a diagnosable ambiguity.
- Reload the shipped GLB with its real loader. Require 70 distinct occurrence extras, one resolved pickable node per ID, finite normalized transforms and positive extents. Check `30465/NAUO1/NAUO79` at about `[0,0,0.032]` m and the paired blade heights near 0.0475 m. Use 0.1 mm as the initial numerical landmark tolerance for this tessellation. A double-applied parent placement or metre/mm error must fail.
- Check the real BoM row count and inventory quantities excluding the total row. Preserve distinct CAD names and source spellings. Test a duplicate hierarchy path, missing color, unrecognized type and unmapped functional unit. Unavailable material or contact data must not generate a blocker. Reconciliation issues include the workbook, sheet, row and occurrence candidates.

### V02 and V04 · Connections, moves and independent replay

- Use analytic box, cylinder, pin-through-bore, gear-axle and tool-corridor fixtures with known dimensions. Translate/rotate the whole fixture and verify identical enabled relationships in its own frame. Handedness and unit changes have explicit expected vectors.
- Build separate tests for an obstructed extraction tip and an obstructed pusher handle. Include an obstruction strictly **between** the start and end poses, a thin obstacle between coarse samples, a safe adjacent clearance and a tool approaching from the wrong side. Verify a swept test or refinement catches the thin obstacle. An unresolved clearance stays explicitly uncertain until reviewed.
- Allow reviewed mating contact where the pin engages its bore while checking all other surfaces of that pair. Include a second flange on the same neighbor that collides later in the stroke. Test a supported partial pose, insufficient residual support, and a partial axle that still blocks a different target.
- For a module move, check every member against the remaining assembly and the tool envelope. Preserve member-relative frames and internal engagement. In a fixture where the household tool is a spare axle, distinguish it from an installed model occurrence. It should affect access checks and have zero effect on the count of healthy helicopter pieces.
- Export the complete graph and read it back. Check expected hierarchy, endpoints, operation directions, required poses, all-of conditions, alternatives, evidence revisions and reviewer reasons. Selecting a route reveals the ordered dependency explanation. An unknown endpoint, invalid pose or dangling inverse yields a typed error.
- Replay from the exported motion path and independently reconstructed geometry. Re-evaluate contacts at intermediate poses. Treat cached planner clearance flags as subjects of the test. For simple fixtures use analytic intersections or contrasting sample intervals as an independent oracle. For real geometry use the exported meshes, a second replay driver and finer/conservative checks at limiting interfaces. Record unresolved contacts so a false “clear” cannot pass.

### V03 · Search and minimality

Write a small brute-force **test oracle** for hand-worked 3–7-part fixtures. Enumerate reachable legal transitions directly from their fixture truth table, allow branches and partial moves, check the return and compute the disturbed set from the resulting pose trace. Deduplicate only equivalent states with equivalent future possibilities. The oracle must not call the production rule expander, cost function or candidate pruner. Keep the seeds and small graph descriptions in source.

Compare the production solver with this oracle on every synthetic case that claims a minimum. Add seeded generated cases with shared prerequisites, opposite extraction directions, equal costs and blocked alternatives. Compare minimum count first, then time where comparable, then stable tie order. Deliberately alter the order of input nodes and candidates. The resulting choice and proof should be reproducible.

Exercise the following failure paths as separate tests.

- Reach the same visible poses via paths that disturbed different healthy pieces. A future move can reuse a disturbed piece. Discarding one state only by current poses can lose the optimum.
- Add a healthy piece touched only during restoration. The final disturbance count must include it. Give two access histories the same outward end pose but different return obligations. Compare the chosen complete job with the oracle and verify the lower-bound proof still holds.
- Include equal-cost routes with different timing coverage. A shortened search can prove the minimum **count** while leaving the equal-count tie frontier open. The result must carry both facts accurately.
- Run once with a replayable incumbent and a small expansion cap, and once without an incumbent. Verify the first reports its actual feasible count and the second reports search incomplete. Exhaust an impossible fixture to exercise genuine no-route reporting.
- Inspect the certified result against the oracle. Run a deliberately broken test implementation that treats OR alternatives as mandatory, counts moves rather than unique pieces, or uses only the terminal poses. Confirm that at least one named fixture fails each fault.

### V04 · The 70-target batch

Run the batch against the **serialized release dataset**. Load it as a fresh consumer. For every target require an individual release, replacement event, legal insertion, restored final assembly and check instruction. Replay the exact nominal poses in order. Compare installed connection sets and instance identities exactly, with numerical tolerance only for floating transforms. Start with 0.1 mm and 0.5° for final geometry checks, tighten when the fixture supports it, and keep physical clearance thresholds separate. Verify each healthy piece's measured history against the published disturbed set.

Write one result per occurrence with target ID, route hash, disturbed IDs/count, attainable objective/proof status, operation count, clearances, time coverage, terminal pose and engagement checks, and any unresolved move. On failure print target, step, blocker/tool, relevant pose and evidence reference. The fast suite uses fixtures. Run the full dataset check on a changed dataset or solver and on every release. A successful batch is evidence for all 70 modeled repairs. Physical verification is reported per witnessed procedure.

## 5. Verify the mechanic UI and design handoff

### V05 · jsdom behavior

| Scenario | Drive through the real UI | Pass condition |
|---|---|---|
| Select a repeated or buried piece | Search by name/element ID, choose a specific list row, return a pick event from the scene port, and switch between siblings. | Selected ID, callout, active graph node, target label and issued repair request agree. A hidden gear is selectable from the keyboard. |
| Complete a repair | Click replay twice, fire animation completion, orbit, then press the confirmation button. Rapidly confirm again with the same step ID. | Replay, time and navigation preserve the physical state. One accepted confirmation commits one operation. A stale confirmation cannot skip a step. |
| Restore and resume | Confirm through exchange, inspect a previous page, leave and return to the current view, reload with a matching checkpoint, then reload after a changed route. | Returning from page inspection preserves progress. Resumption asks the mechanic to reconcile the kit. A stale route cannot apply a saved index to a different procedure. |
| Reduced motion and missing graphics | Supply reduced-motion preference, missing WebGL, a failed GLB response and a subsequent successful retry. | The static cue gives direction and stop pose. Text remains usable. A failing asset has an explanatory state, and retry restores the correct target. |
| View completion | Finish the function check, also exercise a failed check and subsequent inspection. | Success is recorded only upon confirmed pass. A failed check leaves a visible unresolved outcome. Results show replaced ID, disturbed count, preserved units and time coverage. |

Test the controller against the real `ManualScreen` **and a minimal replacement shell** that exposes only the same action callbacks and view-model fields. Run the same confirmations through both. Expect identical ordered operation IDs, procedure hash, final domain state and evidence. Change the CSS or swap scene slots and rerun. This is the acceptance test for Astra's ability to redesign the UI.

Add a boundary test or lint check resolving imports. `domain` may depend on its schema and pure utilities. A presentation screen may import its view contracts, CSS and UI dependencies. Calls to the planner, graph mutation, storage, fetch, CAD import, and renderer setup belong in their designated adapters. Verify gallery and production instantiate the same exported screen component through their respective hosts.

### V05 · First-pass visual quality

Review the actual concept gallery in a real browser at **1280 × 800** and **390 × 844**. Capture target selection, a buried-part step and the reviewer diff. Inspect insertion, completion, partial withdrawal and reduced motion as further gallery states. Freeze animation time and camera during screenshot comparison. Render the real 30465 model in at least one production screenshot. Use a human-reviewed baseline after the first pass.

| Look at | Acceptance observation |
|---|---|
| Manual hierarchy | A viewer can point to the step number, active part and next action immediately. The viewport is the largest element. The pale inset identifies the same part and location as the active outline. |
| Mechanical cue | Arrow starts at the correct side of the active piece. Nose/tail landmark, tool and visible stop reference are legible. Adjacent same-color pieces can be distinguished with color removed. |
| Framing | Whole-assembly view includes both blade tips. The detail view has enough room for the actual stroke and arrowhead. Labels and primary control remain readable at both widths and under text zoom. |
| Interaction | Keyboard focus reaches search, list, replay, graph and confirmation. The page reflows without horizontal scroll. Reduced motion preserves direction and endpoint. Repeated replay or a camera reset leaves the drawing aligned. |
| Concept reuse | A designer can open a named fixture, change a token and move the parts inset using presentation files, then rerun the domain suite without editing domain, import or planner code. |

Choose one teammate who hasn't built the UI. Show the real step at laptop size and ask them to identify the piece, approach side and next action. Record any wrong pin, reversed direction or hidden control and fix the underlying cue. Keep both the screenshot and the teammate's answer for the next design review.

### Browser graphics and packaging

Use Playwright against `vite preview` on the built site. Read public debug diagnostics via a test adapter where coordinates are needed, drive picks and confirmations through user controls, and keep the real renderer running. Test free orbit/reset, a geometry pick, ghost occluders, exploded slider at both endpoints, exit restoring the exact pre-explosion poses, mid-stroke pause/replay and old-scene disposal after a selection change. Collect page errors, missing assets and a screenshot for failed scenarios.

Test the release URL in **Windows Edge** on a machine without the development toolchain and in **macOS Safari**. CI Chromium/WebKit supply earlier feedback. Confirm HTTPS, first load, hard refresh on the reviewer route, part selection, a full repair, graph preview and JSON export. Record OS, browser version, build and dataset hash. Measure cold model load and time to first usable step on the demo network. Record worst representative preview latency and whether the page remained interactive during search. [Playwright browser guidance](https://playwright.dev/docs/browsers) · [Vercel Vite hosting](https://vercel.com/docs/frameworks/frontend/vite)

## 6. Verify review, data boundaries and evidence

### V06 · Local reviewer

1. Load a baseline where T can leave to the right. Add C as a blocker specifically to that move with clear state “parked” and a reason. Preview. Assert the new route changes or becomes infeasible as dictated by the fixture, and the left alternative retains its own prerequisites. Read the graph diff, disturbed IDs and timing delta. Inspect the old route again.
2. Accept a generated relation, reject a mistaken candidate, and import the same patch twice. The edit log and effective graph must be deterministic. Rejecting a candidate that masks a genuine geometric collision must still fail clearance replay. A supported contact exception needs its own evidence.
3. Issue preview A, then preview B. Resolve B before A. The displayed graph, steps and revision must all belong to B. Test an in-flight edit during a mechanic session. Keep the confirmed route bound to its revision.
4. Save the draft, reload in the same origin, export JSON, clear the draft, and import. Compare canonical graph, evidence references, affected target IDs and routes. A checksum/schema mismatch, dangling ID, invalid stroke, conflicting edit or malformed JSON yields a diagnostic and preserves the previous valid draft. Simulate quota denial and a second tab saving a newer revision.
5. Mutate a shared blocker used by multiple targets and recompute all 70 results. For each physical record compare the actual resulting procedure fingerprint. A changed order, tool, stroke, selected instance, physical support instruction, return motion or check makes the old physical record historical. Include a new dependency that the recorded route already satisfied. After successful fresh replay, the identical procedure must retain its physical record. Also test an unrelated edit and a timing-text fix. Importing a JSON draft cannot grant bench evidence.
6. Export graph and report and consume them in a fresh Node process. Check schema version, model/graph revision, stable IDs, units, prerequisites/alternatives, evidence status, timing provenance and explainable repair recommendation. Re-importable reviewer patches and resolved public graph exports have explicitly identified formats.

### MSW fetch harness

Use MSW when a real fetch boundary exists. In Node tests initialize in `beforeAll`, reset handlers after each test and close after the suite. Use an absolute test origin for Node fetch and inject the asset base where needed. The code below is a proposed setup for loader tests. [MSW Node integration](https://mswjs.io/docs/integrations/node/)

```ts
const assetUrl = 'https://manual.test/models/30465/manifest.json'
const server = setupServer(http.get(assetUrl, () => HttpResponse.json(validManifest)))
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

Exercise success, 404, malformed JSON, incompatible schema, stale mixed-revision bundles, delayed out-of-order loads and user retry. Use the real runtime schemas to parse replies. A valid manifest with a missing graph should produce a recoverable error and no mixed-version manual. Add offline model-service failure, invalid candidate ID and ambiguous natural-language matches if the stretch feature ships.

### V07 and V10 · Product-loop and model evidence

- Independently sum disturbed IDs from motion traces. Track internal interfaces throughout the repair so rigidly moved units can be reported “preserved intact.” Test a split-and-rebuilt unit and an untouched unit. Compare report export with the UI.
- For each timed action, require a source row or observation, basis, quality and units. Numeric fixtures verify totals and partial coverage. Compare English column L, `Time_per_Connection`, with German column R, `Zeiten je Verbindung`, keyed by row ID. Column O contains the raw seconds value before the workbook's worst-case adjustment and rounding. English row `ST-mittel` has a time per connection of 3. Its use for a particular Technic operation still requires a reviewed mapping. [Timing source](../../../assets/siemens-provided/MTM_Mapping_Connection_V3.xlsx)
- For the AI classification trial, have a teammate label a held-out set, include an “unknown” class, freeze inputs, and run the model. Count correct, wrong and abstained results per class, record the denominator, capture disagreements and compare against a simple geometry/type baseline. Test that accepted or corrected suggestions have attributable evidence. Keep live inference outside CI and use recorded provider responses for regression.
- Review the export for one selected target. A teammate should be able to recover the timing source, understand why a step was necessary and identify the units preserved. Review the hypothetical equipment-enclosure example as a transfer of the data model. Its statements should match the demonstrated inputs and level of verification.

## 7. Physical acceptance

**Candidate targets for the first bench session** are the light stud (`30465/NAUO33/NAUO39`), the 12-tooth bevel gear (`30465/NAUO11/NAUO71`), and one of the neighboring same-definition friction pins (`30465/NAUO28/NAUO45` or `…/NAUO46`). These are real source occurrences. Confirm which give an exposed repair, a genuinely obstructed repair, and a repeated-instance identification challenge on the physical kit. Freeze the chosen IDs and expected checks before the acceptance runs. Include a partial or intact-module maneuver if the kit supports it for the chosen repair.

1. **Prepare.** Restore the known assembled state and check the mechanism. Identify the target unambiguously on the physical model. Supply an equivalent spare when available. If the team uses the same undamaged piece as a stand-in for a replacement, remove it fully, mark the exchange event and disclose the substitution in the evidence. Lay out only the listed tools and time each phase separately.
2. **Assign roles.** A teammate who did not author this route operates the webpage and kit. An observer records events and timing. Give the operator the target and starting state. Let the page supply the identification, direction, tool, stop, orientations and order.
3. **Time consistently.** Start disassembly at the first physical manipulation after the operator identifies the target. Stop when the damaged piece is individually free. Record swap and restoration time separately through final seating, then perform the function check. Record pauses for reading, assistance or equipment issues as observations. Compare the estimate only with the matching phase and record which operations had estimates.
4. **Observe.** Log every healthy piece moved, partial withdrawal, intact unit parked, tool substitution, unprompted module rotation/support and any departure from the guide. Record attempted but impossible motions and whether the operator selected the correct repeated instance. Capture stage/step IDs and pose or photographic evidence where helpful.
5. **Restore and check.** Verify the replacement is seated and oriented correctly, all healthy pieces are back, the axle has its original engagement and the appropriate function check passes. For a drivetrain repair establish the expected rotor/gearing behavior on the intact kit before the run and repeat the same check afterward.
6. **Decide.** An unlisted displaced piece, inaccessible tool approach, wrong instance, required coaching, ambiguous stopping point, missing restoration step, or failed function check makes the run fail. Record the first failing step. Update motion data, graph, UI cue or test as appropriate. Recompile, replay and repeat the changed procedure with an uncoached operator. Keep the previous record attached to its old hash.

Minimum record fields are release/model and procedure hashes, target ID, author/operator/observer, tool set, substitute-spare flag, intended/observed disturbed IDs, retained units, estimated/observed disassembly seconds, restoration seconds, check performed, outcome and deviations.

**Optional demo evaluation note.** For one verified repair, count the healthy pieces moved by undoing the supplied build steps until the same target is free. Use the same starting state, target and distinct-piece counting rules. Record a concrete avoided move if there is one. The result belongs in the judging evidence and is independent of software release acceptance.

## 8. Stretch acceptance

| Feature | Specific test and acceptance evidence |
|---|---|
| Quest digital twin | Open the hosted URL in the actual Quest 3 and record browser version, session mode and headset refresh setting. Place the enlarged helicopter beside the kit. Identify two adjacent identical parts by the active outline, confirm once to advance, replay without advancing, and exit/re-enter with the same step intact. Check text/arrow readability and comfortable frame pacing during movement. Feature denial or absent WebXR must leave the desktop flow usable. A stationary-kit overlay gets a separate alignment/drift check if attempted. |
| Multiple targets | Use a shared beam trapping T1 and T2. Both original items are individually exchanged, the shared beam is displaced once and reinstalled once, and both targets are excluded from the disturbance count. Compare with a small exhaustive joint-state oracle. Include duplicates in the requested target set and independent target branches. |
| Natural-language selection | Test a unique description, ambiguous “the blue pin,” absent part, unrelated response and unavailable provider. Only an existing confirmed occurrence enters the ordinary repair flow. Record ranking quality and ambiguity handling on held-out spoken/written descriptions. |
| Automated graph generation | Seed an impossible sweep, missing support and blocked pusher approach. The independent simulator must return reproducible counterexamples and reject each proposal. Test bounded retry, invalid schema, duplicate proposal and cost stop. Measure false approvals and 70-target coverage on the resulting graph. Replay and physical evidence remain separate. |

## 9. Run order and release record

```sh
npm ci
npm run typecheck
npm test
npm run model:import
npm run model:compile
npm run model:verify
npm run build
npm run test:e2e
```

> **Addendum, added 2026-11-26 during implementation.** Per
> [implementation plan §8](02-software-design-implementation-plan.md), every commit is
> preceded by `npm run progress:screenshot`, which writes the screenshots and `notes.md` for
> the change into `docs/progress/<yyyy-mm-dd>-<slug>/`. Those captures are a commit-time
> progress trail, not release evidence: they do not satisfy any V-row below, and no test
> reads them. A missing capture for a commit that had a visible surface is treated the same
> as a missing test run — fix it before committing.
>
> Per [§8.1](02-software-design-implementation-plan.md) the capture also has to *differ*:
> `notes.md` reports the fraction of pixels that changed against each other capture and
> against the same scenario in the previous capture folder, so a commit that re-shoots an
> unchanged screen is visible in the trail instead of looking like progress.

During development run one named Vitest file or case before the full suite. A routine code change runs typecheck, fixtures and relevant UI tests. Changes to the importer, graph, review data, solver or geometry run the 70-target batch. Release CI also verifies reproducibility from source, checks the exact shipped bundle, and exercises the real browser. Configure the browser test runner to start the preview server and wait for readiness.

Record build/lockfile revision, source fingerprints, model settings, generated route report, test results, screenshots, device/browser results, physical records and stretch status. Treat any unselectable target, incomplete restoration, stale physical evidence, missing critical asset, or failed hands-on route as a release failure. Record and label searches that found a feasible route without proving the minimum. Use the last passing build while fixing a failing release candidate.

**At plan handoff,** the isolated Vite production build passed, Vitest passed three smoke tests across jsdom and MSW, and the actual STEP file produced 70 meshes matched one-to-one to all 70 occurrence paths. The full application, 70 repair simulations, browser/device acceptance and physical trials are deliverables for the implementation team.
