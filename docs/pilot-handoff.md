# From the pilot to the release candidate

The static pilot is generated from the pinned STEP and supplied workbooks. It contains
candidate instructions, not a reviewed service manual. Use the release batch rather than
the progress screenshots to decide what is verified.

| Current evidence | Result |
| --- | --- |
| Geometry and inventory | 70 selectable usage IDs, 31 inventory types, 84 inferred connections |
| Directional survey | 166 straight-stroke options (diagnostic, not 166 repairs) |
| Single-target jobs | 12 modeled, geometrically checked against the serialized meshes; 58 lack a complete motion model |
| Disturbance | Six jobs disturb no healthy piece; five park a gear or beam; one parks the red stud to exchange the blue pin |
| Shared job | Blue pin plus red stud use one access path, two exchanges, and one restoration; not counted in single-target coverage |
| Physical evidence | No reviewed procedures or uncoached bench trials in `data/review/procedures.json` |
| Development-time classification | 63 development and 21 held-out interfaces split by family; no measured accuracy without independent labels and recorded predictions |

## Reproduce the measurements

Use the pinned Node version, then `npm ci`. `npm run dev` opens the mechanic at `#/`, the
reviewer at `#/review`, and the development gallery at `#/concept`. `npm run build` checks
the TypeScript contracts, verifies static asset hashes and replays the displayed operations.
Run `npm run test:e2e` against that build for raycast picking, single/joint repair, failed fit
check, refresh reconciliation, and draft round-trip in Chromium.

```
npm run model:import
npm run model:compile
npm run model:verify
npm run model:worklist
```

The verifier returning **1** on the current data is expected. Read
`.staging/30465/verification.json` for all target IDs and `.staging/30465/mechanical-review.md`
for the per-piece work queue. Neither command updates the public channel. `model:compile --
path/to/draft.json` stages a different generation for an exported reviewer draft.

## Next session at the kit

1. **Check a partial stroke.** For the six-long axle `30465/NAUO2/NAUO77`, the survey finds
   an 8.20 mm withdrawal toward either end to clear `30465/NAUO30` or `30465/NAUO31`.
   Inspect which side accepts the actual hand/tool, which pieces remain supported, what
   visible stop corresponds to that displacement, and whether the return seats. The five
   partial-stroke proposals are absent from the mechanic picker until modeled as valid jobs.
2. **Check an intact group.** The worksheet names the members and internal/external fits of
   13 source subassemblies. A CAD subassembly is not evidence it can be carried intact.
   Record the bench frame, access and return, including any member that must be freed
   separately on the bench. Compound/rotating strokes require additional verifier and scene
   support; the generic verifier currently refuses them.
3. **Record a reviewed operation.** `data/review/motions.json` adds versioned poses, motions,
   operations, function checks and target-to-check mappings. Bind entries to the exact source
   SHA. The compiler rejects dangling IDs and inconsistent physical actions. The verifier
   checks individual separation, tool support, outward/return waypoints and terminal state.
4. **Record trials only after running them.** Follow plan 03 §7, using non-personal role IDs.
   Record observed displaced pieces, tool list, substitute-spare choice, disassembly/swap/
   restoration times and the actual function check. The contracts in `src/domain/evidence.ts`
   bind approval and trial records to the exact procedure; a local draft cannot grant them.

## Optional integrations and promotion

- `npm run model:classify -- prepare` creates the held-out inputs. `score <truth.json>
  <responses.json>` validates complete exercise coverage. `run` explicitly invokes the
  configured model (`MODEL_ENDPOINT`, `MODEL_NAME`, `MODEL_VERSION`); normal builds and tests
  make no inference calls. Treat workbook times and color-to-material mappings as fictitious
  challenge assumptions. Leave individual operation times unknown until their proxy is reviewed.
- `npm run model:propose -- <target-id> <proposal.json>` critiques an axial proposal against
  the staged survey. `local-model` in place of the filename uses a loopback endpoint and
  checkpoints at most three attempts. A correction returns to the review queue.
- The optional description picker uses `api/describe.mjs` on a serverless host. Configure a
  chat-completions endpoint and model name on that host; keep any API key in server environment
  variables. A denied request or missing service leaves the ordinary picker usable.
- The XR twin uses feature detection and a user gesture on HTTPS. Trigger confirms, grip
  replays. Desktop tests do not establish Quest comfort, registration or controller accuracy.
- `model:publish -- <generation-hash> <browser-acceptance.json>` is explicit. It requires
  complete reviewed replay, three distinct procedures with passing uncoached trials, and
  matching Windows Edge/macOS Safari records for one HTTPS URL and build. Files go into
  an immutable release generation before the channel pointer changes. No deployment,
  real-browser matrix, classifier accuracy or headset run is claimed by the pilot.
