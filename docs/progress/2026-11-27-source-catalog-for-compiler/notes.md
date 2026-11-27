# feat(import): export occurrence and joint records for compilation

- Captured: 2026-11-27T08:05:45.772Z
- HEAD at capture: `1d7df83` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `570770688dba4e2c`
- Captures that differ from the previous capture set: **1 of 1**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
  identity crosswalk       70/70 matched, lowest score 0.9912, smallest margin 0.5000
  connections              84 joints, one per piece pair per axis line, from 1632 face pairs (RV-003b); grip 1.80–8.00 mm, 0 split grips, 5 stepped fits, 0 piece pairs on more than one line
 Test Files  2 passed (2)
      Tests  23 passed (23)
World bounds are measured after transforming vertices; 54 repeated BoM rows remain type-level links (RV-002).
~~~

## Verification rows touched

- V01

## Commands actually run

- `npm run typecheck && npm run model:import && npx vitest run tests/data/identity.test.ts tests/integration/import-package.test.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 17.62 % since `2026-11-27-holder-span-strokes` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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
M  tools/import/build-package.ts
M  tools/import/run.ts
M  tools/lib/step-tree.ts
?? docs/progress/2026-11-27-source-catalog-for-compiler/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
