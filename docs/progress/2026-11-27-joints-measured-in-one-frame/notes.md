# one joint, one frame: 76 percent of engagements were mis-measured

- Captured: 2026-11-27T05:36:12.759Z
- HEAD at capture: `0d7899e` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `85827c87ea0a0b02`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
the two faces of a joint were measured in two different frames -- 76% of engagements were wrong

what the bug was
  MatingInterface.axis and .origin are the male face's own, and a STEP CYLINDRICAL_SURFACE stores
  an axis location of its own. confirmInterfaces intersected the male and female axial extents as
  printed, so it compared numbers taken from different origins along the same line, and sometimes
  in opposite senses.

measured on the pinned snapshot (sha e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588)
  origins of the two faces more than 0.05 mm apart along the line   1535 of 1539   worst 23.57 mm
  joints with a face pointing the other way along the line           978
  engagements differing from the true overlap by > 0.05 mm           1175 (76%)      worst 1.74 mm
  the error was not one-directional, which is what hid it:
    real joints rejected      a light stud's only candidate read disjoint -> apart / below-resolution
    joints understated        a synthetic 7.85 mm wall measured 3.00 mm -> a stroke planned from it
                              stops short of clearing the wall

npm run model:import   before -> after
  confirmed joints           1539            ->  1632 face-pair joints
  piece pairs                   83           ->    84
  grip                    3.00-7.50 mm       ->  1.80-8.00 mm
  contact max              0.0534 mm         ->  0.0534 mm   (unchanged, LEGO's 0.05 fit)
  rejected apart              167            ->    82
  rejected below-resolution     8            ->     0
  occurrences without a joint   1            ->     0
  candidates                 8102            ->  8102   (unchanged: the fix is downstream)
  glb sha256           3cc9b8263cbdb347      ->  3cc9b8263cbdb347  (unchanged: geometry untouched)

witness that the surviving number is on the kit's scale
  grips land on discrete heights, not a continuum:
    1.80 mm  x  8   friction section of a Friction Pin with Stud (30465) inside a Light Stud
    3.00 mm  x 56   one bush
    4.00 mm  x400   the common beam-wall stack
    7.30-7.50 x385  a beam wall (7.9 mm) through the deflection
    8.00 mm  x 50   the width a bevel gear or beam holds an axle over
  pinned in tests/data/contacts.test.ts: 4 new tests (two frames disagreeing by origin, by sense,
  and the counterexample that a genuine gap stays rejected however the origins are recorded, so
  this is not "shift everything until it confirms"), plus the snapshot rows. 217 tests green.

RV-003a closed: 30465/NAUO33/NAUO39 (Light Stud) grips its own friction pin over 1.80 mm at a
0.0216 mm gap. No occurrence is left without a joint. Downgraded to a kit check in ticket 5.

advisor asked, no answer: advisor-ask was called with contacts.ts, the review record and the test
file and could not reach the network (workspace routing discovery failed). The reasoning for
accepting rather than escalating is recorded in data/review/interface-features.md, with the one
kit result that would overturn it.

still open: RV-003b (1632 face pairs describe 84 piece pairs -- aggregate per axis line, ticket 5)
and RV-003c (the 0.5 mm radius population, 436 cylinders, unclassified).
~~~

## Verification rows touched

- V02

## Commands actually run

- `npm run typecheck`
- `npm test`
- `npm run model:import`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-placeholder-copy-names-the-real-ticket` | #/concept is the development gallery: three named states of the real ManualScreen, so a change captured here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-placeholder-copy-names-the-real-ticket` | #/concept is the development gallery: three named states of the real ManualScreen, so a change captured here is a change the mechanic would see. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-placeholder-copy-names-the-real-ticket` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

Every capture renders a screen that exists.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

These routes are still rendered by a placeholder and their capture was identical
to the previous commit’s, so committing them would add pictures that highlight
nothing while the evidence panel above carries the change (plan §8.3). The
routes and the tickets that will replace them stay recorded here:

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `concept-route--laptop-1280x800.png` unchanged since `2026-11-27-placeholder-copy-names-the-real-ticket` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--phone-390x844.png` unchanged since `2026-11-27-placeholder-copy-names-the-real-ticket` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M README.md
 M data/review/interface-features.md
 M tests/data/contacts.test.ts
 M tests/integration/import-package.test.ts
 M tools/lib/contacts.ts
?? docs/progress/2026-11-27-joints-measured-in-one-frame/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
