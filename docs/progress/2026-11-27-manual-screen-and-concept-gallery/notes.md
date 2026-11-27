# the mechanic screen lands on the concept route

- Captured: 2026-11-27T04:48:37.707Z
- HEAD at capture: `9a0a8a3` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `3719ec01a7aec0ea`
- Captures that differ from the previous capture set: **3 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
the mechanic screen exists: #/concept now renders the production ManualScreen, not a stub

what changed on screen
  #/concept   was the third copy of one shared placeholder -> now the concept gallery, mounting the
              production ManualScreen with its production props against three named fixture states
  #/          still the placeholder (ticket 7 wires the real loader; there is no published dataset
              yet -- public/models/30465/ is empty, so a production build has nothing to load)
  #/review    still the placeholder (ticket 8)

the three states a design review needs, from plan 02 sec 5.4
  buried piece, blocker still in place   confirm disabled + the reason in the mechanic's words
  same piece, ready to come out          one piece, one direction, one stop condition
  putting it back                        restoration reads differently from removal, and says so

what the screen puts in front of a mechanic, from plan 02 sec 5.1-3
  wide grey drawing field | one large step numeral | pale inset naming the piece 1x | one dark
  confirmation control. The strip carries heading, instruction, piece + location, and three facts:
  which way / tool / stop when. At <=60rem the field stacks above the strip; 8/16/24 spacing,
  44px minimum hit targets, 16px body, visible focus, all from tokens.css.

layer discipline, because the boundary is the point of ticket 4
  src/presentation/manual-screen.tsx   renders StepViewModel + ManualActions + scene/partInset
                                       slots. No planner, no graph, no renderer, no fetch.
  src/presentation/manual-contract.ts  the readonly contract from plan 02 sec 5.
  src/app/manual-session.ts            who owns "which step am I on" and who may commit it.
  src/concept/*                        dev-only; App.tsx gates it on import.meta.env.DEV, so a
                                       production build never ships the gallery.

the counterexample that shapes the session
  confirmStep(session, stepId) returns the SAME session when stepId is not the current step. A
  double click or a stale response must not skip a step -- that would tell a mechanic to fit a
  part whose blocker is still in the helicopter. Pinned, with "refuses to confirm the same step
  twice", in tests/ui/manual-screen.test.tsx.

witnesses
  npm test            Test Files 19 passed (19)   Tests 211 passed (211)
  npm run typecheck   clean, strict + exactOptionalPropertyTypes
  15 screen cases + 5 gallery cases; bootstrap.test.tsx now says 2 of 3 routes are placeholders
  and asserts the concept route mounts [data-screen="manual"] with no [data-placeholder].

not done, and honestly so
  the drawing field is a labelled SCHEMATIC (src/concept/schematic-scene.tsx) so arrow direction,
  crop and label legibility can be settled before Three.js. The live view, click-to-pick and the
  inventory are ticket 7; the reviewer is ticket 8.
~~~

## Verification rows touched

- V05

## Commands actually run

- `npm run typecheck`
- `npm test`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 45.01 % since `2026-11-27-layout-identity-captures` | #/concept is reachable in development; the gallery has no states until the screens exist (Ticket 4). |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 50.76 % since `2026-11-27-layout-identity-captures` | #/concept is reachable in development; the gallery has no states until the screens exist (Ticket 4). |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-trail-stops-photographing-stubs` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

Nothing was dropped: every capture in this folder is either a built screen, a
capture that differs from the previous commit, or the only image this commit has.

## Unchanged since the previous capture

Nothing here repeats the previous commit’s capture.

## Working tree at capture

```
M src/app/App.tsx
 M tests/integration/bootstrap.test.tsx
?? docs/progress/2026-11-27-manual-screen-and-concept-gallery/
?? src/app/manual-session.ts
?? src/concept/README.md
?? src/concept/gallery.css
?? src/concept/gallery.tsx
?? src/concept/part-inset.tsx
?? src/concept/scenarios.ts
?? src/concept/schematic-scene.css
?? src/concept/schematic-scene.tsx
?? src/presentation/manual-contract.ts
?? src/presentation/manual-screen.css
?? src/presentation/manual-screen.tsx
?? tests/ui/concept-gallery.test.tsx
?? tests/ui/manual-screen.test.tsx
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
