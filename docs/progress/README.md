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
## Which captures show a real screen

Three routes are captured, and for most of the build **they genuinely are the same page**.
That is not a bug in the capture tool and not a reason to trust a screenshot: `#/` and
`#/review` render one `PlaceholderScreen` with different words, so all three share the layout
identity `11d980a1d2e7` that `notes.md` prints. Plan §8.1 requires exactly this — a stub
relabelled with new copy must not pass a pixel comparison as a new screen.

| Route | What its PNG really shows | Why |
| --- | --- | --- |
| `#/` `manual-route` | the shared placeholder | The screen exists and is reviewed at `#/concept`, but the route has no live assembly view (ticket 7) and no compiled dataset to load (ticket 9). `public/models/30465/` is empty until ticket 9. |
| `#/review` `review-route` | the shared placeholder | The reviewer screen is ticket 8. |
| `#/concept` `concept-route` | **a real screen** | The development gallery mounts the production `ManualScreen` with real props in three named states, so a change here is a change the mechanic would see. |

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
