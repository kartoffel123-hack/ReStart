# fix(manual): reject instructions and animations that diverge from replay

- Captured: 2026-11-27T08:19:46.523Z
- HEAD at capture: `93ad9fc` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `d029116511ee9803`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Pilot: 84 generated connections; 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
Static pilot package intact: 12 single-target manuals.
 Test Files  6 passed (6)
      Tests  48 passed (48)
Staged 12/70 modeled candidates at .staging/30465/72b693f261fbf1ca77abc14fc0fe93ca1c5b9a0bc03db5639e673eefcbdd522e; 58 missing routes. Nothing promoted.
A changed displayed stop fails even when replay reaches the installed state. The static checker compares all displayed paths and 70 mesh IDs against their source generation.
~~~

## Verification rows touched

- V04

## Commands actually run

- `npm run build && npx vitest run tests/domain && npm run model:compile && { npm run model:verify && exit 2; test $? -eq 1; }`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `b4f4b2df371e` | 0.00 % since `2026-11-27-local-proposal-counterexamples` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `b4f4b2df371e` | 0.00 % since `2026-11-27-local-proposal-counterexamples` | The real assembly picker highlights the light stud, the first playable target. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 20.05 % since `2026-11-27-local-proposal-counterexamples` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-27-local-proposal-counterexamples` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-27-local-proposal-counterexamples` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M  src/domain/replay.ts
A  tests/domain/manual-integrity.test.ts
M  tools/verify/site.ts
?? docs/progress/2026-11-27-check-displayed-repair/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
