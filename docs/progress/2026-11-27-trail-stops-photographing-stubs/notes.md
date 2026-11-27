# a repeated placeholder is dropped, not committed

- Captured: 2026-11-27T04:31:43.489Z
- HEAD at capture: `dd98bdf` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `4903a6a8d6fe85b6`
- Captures that differ from the previous capture set: **1 of 1**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
the trail stops photographing stubs: a repeated placeholder is dropped, not committed

capture set for the previous commit, before this change
  manual-route--laptop-1280x800.png  unchanged since 2026-11-27-candidate-mating-interfaces
  manual-route--phone-390x844.png    unchanged since 2026-11-27-candidate-mating-interfaces
  evidence--laptop-1280x800.png      100.00 % different -- this was the only image showing anything
  -> 2 of 3 PNGs were byte-identical re-shoots of a screen that does not exist yet

what this commit changes
  capture.ts now drops a stub capture that repeats the previous commit's capture, but only when a
  fresh evidence panel is present to carry the change. The route and its ticket stay recorded in
  notes.md under "Placeholder captures dropped from this folder", so the trail still reads
  honestly: it says which routes are stubs, it just no longer commits a picture of one.

  kept  a capture of a BUILT screen that repeats  -- it shows what the app looks like
  kept  a stub whose capture actually differs     -- it may be the screen landing
  kept  everything when there is no fresh panel   -- a stub is then the only image there is

  the rule is the one §8.3 already applied to the panel itself: an image that repeats the previous
  commit's image evidences nothing. It was applied to the panel and not to the stubs, which is how
  every build-side commit since the gate existed ended up committing two identical stub PNGs.

why the panel and not the screen
  all three routes still render one shared placeholder (src/app/App.tsx), because the mechanic
  screen is ticket 4 and the reviewer screen is ticket 8. Until a real screen exists there is
  nothing to photograph, and §8.2 already says a stub evidences routing only.

witness that the rule is load-bearing, not decorative
  tests/tools/screen-signature.test.ts (4 new cases on redundantStubs): drops a repeated stub
  with a fresh panel; keeps everything with no fresh panel; keeps a repeated BUILT screen; keeps a
  stub that differs. npm test 190 passed (17 files); npm run typecheck clean.

still open
  the placeholder captures are the honest state, not a bug to hide: ticket 4 (mechanic screen)
  and ticket 8 (reviewer screen) are what make a capture of #/ and #/review mean something.
~~~

## Verification rows touched

- V02

## Commands actually run

- `npm run typecheck`
- `npm test`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-confirmed-joints-by-face-contact` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

Nothing here repeats the previous commit’s capture.

## Working tree at capture

```
M tests/tools/screen-signature.test.ts
 M tools/progress/capture.ts
 M tools/progress/screen-signature.ts
?? docs/progress/2026-11-27-trail-stops-photographing-stubs/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
