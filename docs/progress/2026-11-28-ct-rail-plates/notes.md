# Replay plate parking before wall and bridge removal

- Captured: 2026-11-28T09:45:09.409Z
- HEAD at capture: `6c263a9` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `6953e4208d6509c1`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
individual: L214 (7) → L215 (7) → wall (16) → bridge (2); contact-free round trip: false
reversed: L215 (7) → L214 (7) → wall (16) → bridge (2); contact-free round trip: false
topped: L214 with top (6) → L215 with top (6) → wall (14) → bridge (2); contact-free round trip: false
topsFirst: L237 (4) → L240 (4) → L214 (6) → L215 (6) → wall (14) → bridge (2); contact-free round trip: false
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `typecheck`
- `turntable-access.check.ts`
- `rail-plates.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-side-wall-release` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-side-wall-release` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 21.64 % since `2026-11-28-ct-side-wall-release` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-side-wall-release` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-side-wall-release` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
A  public/models/4000041/candidates/c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45/credits.json
A  public/models/4000041/candidates/c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45/geometry-704c13e6a4ec012a12e801d06bab407239afb4d75a23621a80b4c7ec14607619.glb
A  public/models/4000041/candidates/c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45/graph.json
A  public/models/4000041/candidates/c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45/index.json
A  public/models/4000041/candidates/c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45/manuals.json
A  public/models/4000041/candidates/c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45/motion-candidates.json
A  public/models/4000041/channel.json
 M tests/ct/turntable-access.check.ts
 M tools/ct/side-wall.ts
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-rail-plates/
?? docs/progress/2026-11-28-track-validated-ct-candidate-for-fresh-clones/
?? tools/ct/__pycache__/
?? tools/ct/rail-plates.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
