# Verify the complete string and posed CT bodies

- Captured: 2026-11-28T01:00:14.154Z
- HEAD at capture: `d44fad0` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `6d444373535c7e45`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
566/566 source placements matched by definition and pose, 4782 positive-volume solids; STEP SHA-256 ac353a4f709faa817ffca7694e5b8bd6398aec548f953b7ad1e6584d491072d5
240312 source vertex and triangle-centre checks passed at 0.1 mm
Original string omitted 30.197 mm despite unchanged bounds. Corrected maximum outside distance: 0.0761 mm.
CT-05: physical trial remains open.
~~~

## Verification rows touched

- CT-V01
- CT-V02

## Commands actually run

- `tools.ct.solids --repair-open`
- `Fusion export`
- `tools.ct.check_step --export-meshes`
- `geometry unittest`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-xml-reconciliation` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-xml-reconciliation` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 24.51 % since `2026-11-28-ct-xml-reconciliation` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-xml-reconciliation` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-xml-reconciliation` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M README.md
 M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M data/review/4000041/cad-round-trip.md
 M package.json
 M src/app/dof-overview.tsx
 M src/app/package-loader.ts
 M src/app/stud-pilot.tsx
 M src/scene/stud-scene.tsx
 M tests/e2e/ct-manual.spec.ts
 M tools/ct/check_step.py
 M tools/ct/compile.ts
 M tools/ct/fusion_assembly.py
 M tools/ct/import.ts
 M tools/ct/requirements-cad.txt
 M tools/ct/site.ts
 M tools/ct/solids.py
 M tools/ct/source.py
 M tools/ct/surfaces.py
 M tools/ct/verify.ts
?? assets/.DS_Store
?? data/review/4000041/operator-handoff.md
?? docs/progress/2026-11-28-ct-surface-fidelity/
?? tests/ct/
?? tests/geometry/test_ct_fidelity.py
?? tools/ct/fidelity.py
?? tools/ct/generation.ts
?? tools/ct/pack_site.py
?? tools/ct/patterns.py
?? tools/ct/resample.py
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
