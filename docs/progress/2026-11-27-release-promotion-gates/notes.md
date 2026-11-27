# feat(data): gate static promotion on reviewed release evidence

- Captured: 2026-11-27T08:14:01.278Z
- HEAD at capture: `e1b34fb` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `5a3c6643745da430`
- Captures that differ from the previous capture set: **3 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Pilot: 84 generated connections; 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
Static pilot package intact: 12 single-target manuals.
 Test Files  1 passed (1)
      Tests  1 passed (1)
Staged 12/70 modeled candidates at .staging/30465/72b693f261fbf1ca77abc14fc0fe93ca1c5b9a0bc03db5639e673eefcbdd522e; 58 missing routes. Nothing promoted.
12 modeled candidates; zero physical records. Promotion refuses this generation and leaves the public pilot pointer unchanged.
~~~

## Verification rows touched

- V08

## Commands actually run

- `npm run build && npx vitest run tests/domain/evidence.test.ts && npm run model:compile && { npm run model:publish -- "$(cat .staging/30465/candidate)" unrecorded.json && exit 2; test $? -eq 1; } && git diff --exit-code -- public/models/30465/channel.json`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `d39129a076e0` | 2.26 % since `2026-11-27-live-mechanic-target-picker` | The real assembly picker highlights the light stud, the first playable target. |
| `manual-route--phone-390x844.png` | phone-390x844 | `d39129a076e0` | 0.35 % since `2026-11-27-live-mechanic-target-picker` | The real assembly picker highlights the light stud, the first playable target. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 17.65 % since `2026-11-27-colored-pin-and-isolated-inset` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
M  package.json
M  src/app/pilot-data.ts
M  src/app/stud-pilot.tsx
A  tools/verify/promote.ts
M  tools/verify/run.ts
?? docs/progress/2026-11-27-release-promotion-gates/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
