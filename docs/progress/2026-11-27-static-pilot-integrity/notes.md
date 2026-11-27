# build: verify the static pilot before packaging the site

- Captured: 2026-11-27T08:08:12.472Z
- HEAD at capture: `f9f6eb4` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `3a0e374f5c522293`
- Captures that differ from the previous capture set: **1 of 1**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Pilot: 84 generated connections; 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
Static pilot package intact: 12 single-target manuals.
A clean checkout can build the pilot from pinned sources. A release uses its static artifacts instead; Windows Edge and Safari checks remain manual.
~~~

## Verification rows touched

- V08

## Commands actually run

- `npm run build`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 8.50 % since `2026-11-27-classification-holdout` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
M  package.json
A  public/models/30465/channel.json
A  tools/pilot/ensure.ts
A  tools/verify/site-run.ts
A  tools/verify/site.ts
A  vercel.json
?? docs/progress/2026-11-27-static-pilot-integrity/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
