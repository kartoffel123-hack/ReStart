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
- **A screen with several states is captured in each of them**
  ([plan §8.6](../plans/0.1.0/02-software-design-implementation-plan.md)). The gallery's state is
  named in the address (`#/concept?state=restore`) and each scenario waits for the state it asked
  for, so a capture that silently fell back to the default card fails instead of filing the same
  picture as three captures. Before that, every folder in this trail held one photograph of the
  gallery's first card and the other two states had never been reviewed as an image.
## Which captures show a real screen

The early `#/` and `#/review` captures shared a placeholder layout. The current captures
show the real mechanic and reviewer. The three concept scenarios intentionally share a
layout: they are one production component in three fixture states.

| Route | What its PNG really shows | Why |
| --- | --- | --- |
| `#/` `manual-route` | Real inventory and helicopter | Raycast or select a specific occurrence; only modeled targets offer a manual. |
| `#/` `buried-pin-step` | Live pin withdrawal | Confirms parking the cap, then captures the blue pin, its start ghost, arrow and part inset. |
| `#/review` `review-route` | Local reviewer | Loaded occurrence relationships and move-specific editor. |
| `#/review` `review-diff` | Changed route | An added blocker forces a six-step detour; the capture waits for the new worker result. |
| `#/concept?state=buried-blocked` `concept-route` | **a real screen** | Gallery state 1 of 3: the piece is hidden and its blocker is still fitted, so confirm is disabled and the screen says why. |
| `#/concept?state=buried-ready` `concept-ready-route` | **a real screen** | Gallery state 2 of 3: the same piece once its blocker is off — the step the mechanic actually acts on, with the one move and its stop condition. |
| `#/concept?state=restore` `concept-restore-route` | **a real screen** | Gallery state 3 of 3: a step that puts a piece back. Reads differently from removal, so restoration is not assumed from it. |

The concept rows use `ManualScreen` with fixture props; the buried-pin row drives the real session.

Two consequences for anyone reading the trail:

- A `manual-route` or `review-route` PNG that looks identical to the previous commit's is
  telling the truth, not hiding work. Read the **Evidence panel** section of `notes.md` for
  what the commit actually did; since §8.4 those repeated stub captures are deleted from the
  folder rather than re-committed when a fresh panel carries the change.
- Older folders still contain repeated stub PNGs committed before §8.4 landed. They are left
  in place because each folder's `notes.md` names them as placeholders and references them;
  deleting them would break the trail they belong to.

- Nothing under `docs/progress/` is read by a test. These are a progress trail, not release
  evidence, and they satisfy no V-row in the verification plan. The frozen visual baselines
  for the design review stay with Playwright, not here.
- Keep the panel's source file out of the repository: `.tmp/` is ignored and `notes.md` already
  reproduces the text.
