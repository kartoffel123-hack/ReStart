# Progress captures

One folder per commit, written **before** the commit, by:

```sh
npm run progress:screenshot -- --title "<what this commit changes>" \
  --rows "V03,V04" --commands "npm run typecheck, npm test"
```

Each folder holds one PNG per scenario per viewport plus `notes.md` with the date,
`HEAD`, the verification rows touched, the commands actually run, a one-line
highlight per capture, and the working tree at capture time.

- Folders are named `<yyyy-mm-dd>-<title-slug>`.
- Viewports default to the two gate widths from implementation plan §5:
  `laptop-1280x800` and `phone-390x844`.
- Scenarios live in [`tools/progress/scenarios.ts`](../../tools/progress/scenarios.ts).
  Add the scenario that shows the behaviour your commit introduces. A capture that looks
  exactly like the previous commit's capture is not highlighting anything, and the tool now
  measures that instead of asking you to trust it: `notes.md` reports Δ, the fraction of
  pixels differing from the same scenario's previous capture. At or below 0.2 % the renders
  count as the same screen; if every capture in the set repeats the previous set, the run
  exits nonzero unless the evidence panel below shows something new
  ([plan §8.1](../plans/0.1.0/02-software-design-implementation-plan.md)).
- Pixels alone cannot tell a new screen from a renamed old one, so each capture also records a
  **layout identity** — the tags, classes and nesting of the mounted screen, ignoring all text
  and attribute values. `notes.md` prints it per capture, groups captures that share one layout
  at the same viewport size, and lists every screen still rendered by a placeholder (marked
  `placeholder` in the table). A placeholder capture evidences routing only, and a set made
  entirely of placeholders exits nonzero unless `--note` names the ticket that builds the
  screen — and since §8.3 that ticket is better named by an evidence panel than by a note.
  ([plan §8.2](../plans/0.1.0/02-software-design-implementation-plan.md))
- **Commit with no rendered surface.** Most commits here change the importer, the graph, the
  planner or the plans, so no pixel moves. Then the screenshot is of the change itself: write
  its measured output to a file and pass `--evidence-file .tmp/evidence.txt`. The tool renders
  it into `evidence--laptop-1280x800.png` and reproduces it verbatim in `notes.md` under
  **Evidence panel**. Put in, in this order: the numbers as the tool printed them, the witness
  or hash showing they are the right numbers, and what still needs review plus the ticket that
  acts on it. A panel repeating the previous commit's panel evidences nothing.
  ([plan §8.3](../plans/0.1.0/02-software-design-implementation-plan.md))
- `--note "..."` explains a capture set and is recorded in `notes.md`. It no longer excuses a
  set that shows nothing new — that escape is what let two unchanged placeholder PNGs be
  committed as progress several times running.
- Captures run against the Vite dev server in a real Chromium with reduced motion, so
  `#/concept` states are reachable. Animation time and camera are pinned by the scenario.
- Nothing under `docs/progress/` is read by a test. These are a progress trail, not release
  evidence, and they satisfy no V-row in the verification plan. The frozen visual baselines
  for the design review stay with Playwright, not here.
- Keep the panel's source file out of the repository: `.tmp/` is ignored and `notes.md` already
  reproduces the text.
