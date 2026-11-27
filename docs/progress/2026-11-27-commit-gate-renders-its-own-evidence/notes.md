# every commit leaves an image that shows the change

- Captured: 2026-11-27T02:53:33.181Z
- HEAD at capture: `ff84741` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `6e62669517d28114`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
capture gate: a commit with no rendered surface now photographs its own output

what the trail looked like under the old rule (--note could waive everything)
  2026-11-27-search-proof-bound             2 images   0 differ from previous   2 placeholders   0 built screens
  2026-11-27-interface-features-from-step   2 images   0 differ from previous   2 placeholders   0 built screens
what it looks like under §8.3 (this folder)
  3 images, 1 of them new: evidence--laptop-1280x800.png, rendered from this file

commands run for this commit
  npm run typecheck    tsc --noEmit -p tsconfig.app.json + tsconfig.tools.json    clean
  npm test             Test Files 14 passed (14)      Tests 140 passed (140)

changed
  tools/progress/evidence-panel.ts        129 lines, pure: no browser, no fs, no clock
  tests/tools/evidence-panel.test.ts        5 tests, incl. the counterexample that markup
                                            inside measured output cannot escape the panel
  tools/progress/capture.ts               --evidence-file renders the panel; --note no longer
                                          waives a set that shows nothing new
  docs/plans/0.1.0/02-...-plan.md         §8.3, fourth addendum to §8
  AGENTS.md, README.md, docs/progress/    the rule where an agent will actually read it

invariants this rests on, unchanged by this commit
  STEP SHA-256 e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588
  70/70 occurrences matched to their own mesh, lowest winning fraction 0.9912
  GLB 1,730,348 B, sha 3cc9b8263cbdb347
  1,295 cylindrical faces over 31 definitions, 64 candidate travel axes (RV-003)

still open
  - the panel is a stopgap: Ticket 4 (mechanic screen) and Ticket 8 (reviewer screen) replace
    the shared placeholder, after which most commits capture a real screen again
  - RV-003's pin/axle/beam-hole classification needs team review before move generation
~~~

## Verification rows touched

- V09
- V10

## Commands actually run

- `npm run typecheck`
- `npm test`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-interface-features-from-step` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 0.00 % since `2026-11-27-interface-features-from-step` | #/ resolves to the mechanic route; its screen is still the shared placeholder (Ticket 4). |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | first capture | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

These scenarios name a screen that is not built yet, so their PNGs show a labelled stub.
They confirm routing only: they cannot evidence behaviour introduced by this commit.

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

**2 of 3** captures are placeholders.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-interface-features-from-step` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-interface-features-from-step` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M AGENTS.md
 M README.md
 M docs/plans/0.1.0/02-software-design-implementation-plan.md
 M docs/progress/README.md
 M tools/progress/capture.ts
?? docs/progress/2026-11-27-commit-gate-renders-its-own-evidence/
?? tests/tools/evidence-panel.test.ts
?? tools/progress/evidence-panel.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
