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
  exactly like the previous commit's capture is not highlighting anything.
- Captures run against the Vite dev server in a real Chromium with reduced motion, so
  `#/concept` states are reachable. Animation time and camera are pinned by the scenario.
- Nothing under `docs/progress/` is read by a test. These are a progress trail, not release
  evidence, and they satisfy no V-row in the verification plan. The frozen visual baselines
  for the design review stay with Playwright, not here.
- If your commit has no visible surface yet, pass `--note "..."` saying so and naming the
  ticket that will make it capturable.
