# Repository Guidelines

## What this repository is

**ReStart** is a Healthcare Hackathon 2026 entry for the Siemens Healthineers challenge
*From CAD to Circular: AI-Based Disassembly Analysis for MedTech*. It turns the supplied
STEP assembly of the **LEGO Technic helicopter 30465** into a repair manual a mechanic can
follow in a browser: pick the one physical piece to replace, see what blocks it, follow an
animated removal → replacement → restoration → function-check procedure, and see what
evidence backs that exact manual. The product-loop pitch is *minimum disassembly*: keep
healthy pieces and functional units in place. See [README.md](README.md) for the overview and
[the challenge brief](assets/siemens-provided/OnePager.pdf).

Release bar for 0.1.0: **70/70 single-target repairs** load, replay through replacement and
restoration, and trace to the reviewed graph, plus **three repairs completed on the physical
kit** by an operator who did not author the procedure.

## Repository Structure & Module Organization

At planning time the repository contains only inputs and plans. The app is bootstrapped
**at the repository root**, preserving `assets/` and `docs/`.

- `assets/siemens-provided/` — challenge inputs: the brief, participation/IP terms, the
  bill of materials (70 rows), the parts list (31 inventory rows → 70 pieces), and the
  fictitious MTM timing lookup (EN + DE sheets).
- `assets/lego-helicopter-30465-1.snapshot.9/` — the reference assembly: STEP AP203
  (~6.9 MB), SolidWorks parts/assemblies, the 22-stage instruction sheet, and a thumbnail.
- `docs/plans/<version>/` — the plan set, currently `0.1.0/`: `01` design decisions,
  `02` engineering handoff and tickets, `03` verification and release acceptance.
- Planned once implementation starts: `tools/` (STEP + workbook import, constraint
  generation, batch verification), `data/review/` (versioned crosswalk decisions, motion
  evidence, approved patches, bench records), `public/models/30465/` (release manifest and
  content-addressed GLB/graph/manual data), `src/{domain,app,presentation,scene,graph-view,concept}/`,
  and `tests/{data,domain,ui,integration,release}/`.

**`docs/plans/0.1.0/` is the authoritative reference for product decisions, ticket
boundaries, and acceptance gates. Read the relevant plan section before implementing a
work package** — the plans carry the measured baselines (STEP fingerprint, mesh counts,
pose witnesses) that the tests assert. New planning goes in a new version directory; do not
rewrite history inside `0.1.0/`.

## Source assets are read-only inputs

Everything under `assets/` was supplied by the challenge. Treat it as immutable fixtures:

- Do not edit, re-export, re-colour, or "fix" provided files. Record observations about them
  in the plans or in `data/review/`; record defects as reconciliation issues.
- The STEP file is pinned by SHA-256
  `e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588`
  (`shasum -a 256 "assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP"`).
  A different hash means the dataset revision changed — everything downstream is stale.
- Keep the ~105 MB CAD tree, generated intermediates, caches, and raw workbooks **out of the
  web bundle**. Only the content-hashed compiled dataset under `public/models/30465/` ships.
- The `Components.xlsx` colour legend maps colours to *hypothetical* materials for the
  challenge, and the MTM times are *fictitious*. Label both as challenge assumptions in any
  output; never present them as measured material or time data.
- `Provisions on Participation_IP_final-Gro proposal.pdf` governs the provided inputs and
  outputs. Keep credentials, tokens, and personal data out of the repository entirely.
- `.gitignore` deliberately ends with `!assets/` / `!assets/**`, so nothing under `assets/`
  is ever ignored. Do not add broad patterns (`*.png`, `*.glb`, `*.pdf`, `*.xlsx`, `*.tmp`)
  that could hide a provided input; ignore generated output by its staging directory instead.

## Consult the advisor when blocked

**When you are blocked, or about to declare a goal blocked, or about to commit to an
architecture or approach that is expensive to undo, you MUST consult the advisor before
acting - do not rely on your own analysis alone and do not mark a goal blocked without
it.** Run `advisor-ask "<self-contained question>" --context "..." --files <paths>` (it
needs network, so request escalation; see the `advisor` skill). Ask a concrete,
self-contained question and pass file paths rather than pasting contents. This applies to
hard, ambiguous, or irreversible decisions (the repair-graph and state-model design, the
planner objective and search/proof semantics, dataset-revision and evidence-hash schemes,
promoting a published dataset, regenerating a hand-worked fixture, anything that could
destabilize a verified artifact). It does not replace reading the code first: gather the
key facts, then escalate the genuine decision. Carry the advisor's answer into the work and
record it in the relevant plan status.

```
advisor-ask "Should restoration obligations be part of the search state key?" \
  --context "two access histories reach the same poses with different return obligations; \
             plan 02 section 4.4 says include them when they can change cost" \
  --files docs/plans/0.1.0/02-software-design-implementation-plan.md,src/domain/planner.ts
```

## Toolchain and environment availability

**A tool missing from the local shell `PATH` is not a blocker - the whole stack is
installable from npm on this workstation.** Do not conclude a check is unrunnable because
`command -v vite` or `vitest` returns nothing: they are local `node_modules/.bin` binaries,
not global ones.

- **Node 24 and npm** are the pinned baseline (the plans measured Node 24.22.3). This
  workstation's default `node` is newer (v26.x) — use the pinned version via `.nvmrc` /
  `engines` so all five developers and CI resolve identically, and always install with
  `npm ci` against the committed lockfile.
- STEP tessellation runs **build-side** through `occt-import-js@0.0.23` in Node, never in a
  test or the browser. Workbook parsing (`exceljs`) is build-side too.
- Tests needing a DOM are marked `// @vitest-environment jsdom`; network is stubbed with
  MSW inside the Node test process; the real GPU path only runs under Playwright against
  the production build. No test may require a live service, a headset, or the physical kit.
- The Quest 3 WebXR and physical-kit checks need real hardware. Those are manual acceptance
  steps recorded in `data/review/`, not CI gates — say so explicitly instead of reporting
  them as passing or as blockers.

## Build, Test, and Development Commands

Bootstrap once per the [implementation plan](docs/plans/0.1.0/02-software-design-implementation-plan.md) §1, then:

- `npm run dev` — Vite dev server (the concept gallery lives at `#/concept` in development).
- `npm run typecheck` — strict TypeScript checking.
- `npm test` / `npm run test:watch` — Vitest; default environment is Node.
- `npx vitest run tests/domain/transitions.test.ts` — run one named file while iterating;
  this is the expected inner loop, and the plan's tickets name the red command.
- `npm run model:import` — read the STEP snapshot and workbooks, validate joins, emit
  geometry, the identity crosswalk, and numerical witnesses.
- `npm run model:compile` — generate candidate moves/constraints, apply reviewed rules,
  precompute all 70 routes, serialize the static package; report coverage and unresolved targets.
- `npm run model:verify` — reopen the serialized package, validate integrity and references,
  independently replay all 70 repairs, emit a per-target report, and **exit nonzero** on a
  missing or invalid repair.
- `npm run build` / `npm run preview` / `npm run test:e2e` — build, serve `dist/`, and run
  Playwright against the production build.

Release run order: `npm ci && npm run typecheck && npm test && npm run model:import &&
npm run model:compile && npm run model:verify && npm run build && npm run test:e2e`.
A routine code change runs typecheck, the fixtures, and the relevant UI tests. Changes to
the importer, graph, review data, solver, or geometry **must** rerun the 70-target batch.

## Coding Style & Naming Conventions

TypeScript with `strict` enabled, `type: "module"`, four-space indentation, and no `any` in
exported contracts. `camelCase` functions and variables, `PascalCase` for React components
and types, `kebab-case` filenames for components, `snake_case` not used. Pure logic lives in
`src/domain/` with **serializable inputs and results** — no DOM, no fetch, no renderer, no
clock, no storage there.

Respect the layer boundaries; they are enforced by a boundary test or lint check, not
convention:

- `src/domain/` — assembly state, graph, search, replay, metrics, evidence rules. May
  depend only on its schema and pure utilities.
- `src/app/` — loaders, session controller, view-model selectors, worker and storage
  adapters. Owns intents such as `selectInstance`, `confirmStep`, `previewEdit`.
- `src/presentation/` — typed view models and action props, screens, `tokens.css` and screen
  styles. May import view contracts, CSS, and UI dependencies only.
- `src/scene/`, `src/graph-view/` — render and hit-test adapters that emit instance or
  operation IDs back to the app.
- `src/concept/` — development-only gallery over the *same* exported screens.

Calls to the planner, graph mutation, storage, fetch, CAD import, and renderer setup belong
in their designated adapters. Keep short-lived visual state (an open menu) in the view;
compute the next legal operation, disturbance count, evidence status, and confirmation
eligibility in app/domain. Production and concept hosts import the same screen components so
a designer can restyle presentation without touching domain behaviour.

Other invariants worth remembering while editing:

- Never key assembly state with a single JS 32-bit integer; intern pose states and instance
  IDs instead.
- Distinguish *contains*, *connected to*, and *requires* — three relationships, all
  inspectable. Do not collapse them into one edge type.
- Report search status honestly and separately: minimum proved, "Best route found" with its
  count, "Search incomplete", or "No feasible route" with the first unsatisfied alternatives.
- Determinism matters: node/candidate ordering must not change the chosen route or proof.

## Testing Guidelines

TDD per work package: write the failing, mechanic-readable test first ("the axle remains in
the beam while the gear is exchanged"), confirm it fails for the intended missing behaviour,
implement the minimum through the public entry point, then add a counterexample that would
fool that first implementation (a second identical pin, a blocked pusher approach, a
restoration path that hits a neighbouring beam).

- Add Vitest tests under `tests/` as `*.test.ts` with `describe`/`it` named for the
  observable mechanic-level behaviour. Browser acceptance goes in Playwright specs against
  the production build.
- **Do not regenerate golden or hand-worked fixtures automatically during tests.** The small
  brute-force oracle for 3–7-part fixtures must not call the production rule expander, cost
  function, or candidate pruner. Fixture changes are reviewed in the same diff as the
  evidence justifying them.
- Every reference fixture records generator version, options, source fingerprint, units, bit
  and axis orientation, and the dataset revision.
- Geometry witnesses catch unit and placement bugs: Stage 1 `NAUO1/NAUO79` (a 3-long axle)
  has a mesh-bounds centre near `[0, 0, 32]` mm, both large rotor blades centre near
  Y ≈ 47.5 mm, and 0.1 mm / 0.5° are the initial tolerances. A doubled parent placement or a
  mm/metre swap must fail.
- Evidence tiers are **not** interchangeable: generated, team-reviewed, replayed against
  model, minimum under the reviewed model, and physically verified. Only a linked bench
  record can set *physically verified*, and a change to a motion, selected ID, order, depth,
  tool, return instruction, clearance assumption, or function check invalidates that
  record's evidence for the route.
- For hands-on trials the operator must be someone other than the route's author, working
  uncoached from the web page with the listed tools.

## Commit & Pull Request Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) for **every** commit
subject: `<type>(<optional scope>): <imperative summary>` — 72 characters or fewer, no
trailing period — followed by a blank line and an explanatory body when the change needs
one. Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`,
`chore`, `revert`; mark breaking changes with a `!` before the colon or a `BREAKING CHANGE:`
footer. Scopes that match this repo: `import`, `graph`, `planner`, `manual`, `review`,
`scene`, `concept`, `data`, `docs`. Examples: `feat(planner): seed incumbent from reference route`,
`fix(import): reject doubled parent placement`, `docs: record advisor decision on state key`.

Never commit a dataset whose `model:verify` fails, and never commit generated CAD
intermediates. Pull requests should state which verification rows (V01–V10) the change
touches, list the commands actually run and any unrun prerequisite, and link the ticket.

## Before every commit: progress evidence

**Every** commit captures what it made visible *before* `git commit`, not only UI commits
([plan 02 §8](docs/plans/0.1.0/02-software-design-implementation-plan.md)):

```sh
npm run progress:screenshot -- --title "<what this commit changes>" --rows V04 \
  --commands "npm run typecheck, npm test"
```

The PNGs and `notes.md` land in `docs/progress/<yyyy-mm-dd>-<slug>/` and are committed with the
change they document. A capture has to *highlight the newly introduced change*, and five
addenda make that checkable rather than a matter of judgement:

- **§8.1** compares each capture's pixels against the same scenario in the previous commit; at
  or below 0.2 % it is the same screen and evidences nothing.
- **§8.2** compares screen *layout* ignoring text, so a stub with reworded copy cannot pass as
  a new screen. Placeholder captures evidence routing only.
- **§8.3** covers the majority of commits here, which change no rendered surface at all —
  importer, graph, planner, dataset and docs work. Write the commit's measured output to a file
  and pass `--evidence-file .tmp/evidence.txt`; the tool renders it into
  `evidence--laptop-1280x800.png` and reproduces it in `notes.md`. Numbers as printed, the
  witness or hash that shows they are right, then what still needs review and its ticket.
- **§8.4** drops a placeholder capture that repeats the previous commit's, once a fresh panel
  carries the change. The route stays recorded in `notes.md`; the identical PNG is not committed.
- **§8.5** tests a placeholder's own copy. Because routes that are stubs by design look alike,
  the sentence beside them is the only content the trail carries, so it must not promise a screen
  that already landed. `docs/progress/README.md` states which route shows a real screen and why.

`--note` explains a capture set in `notes.md`; it no longer excuses one that shows nothing new.
Nothing under `docs/progress/` is read by a test, and captures satisfy no V-row — the frozen
visual gate for the design review stays in Playwright, reviewed at 1280×800 and 390×844.

**Capture progress screenshots before every commit**, not only for UI changes
([implementation plan §8](docs/plans/0.1.0/02-software-design-implementation-plan.md)):

```sh
npm run progress:screenshot -- --title "<what this commit changes>"
```

That writes PNGs plus `notes.md` to `docs/progress/<yyyy-mm-dd>-<slug>/`; commit them with
the change they document so the trail is reviewable without running anything. Add the
scenario that shows the newly introduced behaviour to `tools/progress/scenarios.ts` — the
capture is meant to highlight the change, not to re-shoot the same screen. "Highlight" is
measured, not asserted (plan §8.1): the tool decodes the PNGs and reports the fraction of
pixels that differ from each other and from the same scenario in the previous capture
folder. A capture at or below 0.2 % is the same screen as before, and a set where every
capture repeats the previous one exits nonzero unless `--note` explains that the commit has
no visible surface yet. Byte-identical files are not the test — identical pixels are.

Pixels alone still cannot tell a new screen from a renamed old one, so each capture also records
the screen's **layout identity** (tags, classes and nesting, ignoring text) and whether it is
still a placeholder; a renamed stub is the same screen, and a set made entirely of placeholders
exits nonzero unless `--note` names the ticket that builds the screen (plan §8.2). Nothing
under `docs/progress/` is read by a test, and a capture is never release evidence for a
V-row. If a commit's surface does not exist yet, say so in `notes.md` and name the ticket
that makes it capturable.

## Hackathon constraints

Five people, ~48 elapsed hours (≈240 person-hours), a working prototype demonstrated on the
LEGO kit and served as a hosted URL that runs on Windows with no installation. Treat the
~$300 of Copilot credits as a ceiling: give the coding model one ticket, its fixture, its
permitted work area, and its red command at a time, and review the diff at each green test.
Reserve roughly a third for post-integration failures. Reuse the source manifest rather than
pasting STEP text or workbook dumps into prompts. Use the last passing build while a release
candidate is failing.
