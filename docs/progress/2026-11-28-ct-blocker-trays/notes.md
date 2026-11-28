# Sweep the turntable with its adjacent fixtures on trays

- Captured: 2026-11-28T09:28:26.064Z
- HEAD at capture: `2926513` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5174/
- Capture set digest: `76cb012a9d48f661`
- Captures that differ from the previous capture set: **1 of 3**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Generation c78413ffcecdfb9f6dbf0a387fbca403f13212bb80a97e0fc459e1be44933d45
Full kit: 566 occurrences; both roofs parked.
Intact-turntable contacts at proposed tray poses:
tileOnly [42, 0, 0] out; [0, 0, 42] back
both [41, 0, 0] out; [0, 0, 41] back
bothWithSupports [34, 0, 0] out; [0, 0, 34] back
CT-V03: endpoint results do not prove the fixtures can reach their trays.
~~~

## Verification rows touched

- CT-V03

## Commands actually run

- `typecheck`
- `turntable-access.check.ts`
- `turntable-blockers.ts`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-turntable-carrier` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `manual-route--phone-390x844.png` | phone-390x844 | `4808c12abcbb` | 0.00 % since `2026-11-28-ct-turntable-carrier` | The full assembly is presented in the default three-quarter view with no piece selected; the selection panel prompts the mechanic to click a piece. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-28-ct-turntable-carrier` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `manual-route--laptop-1280x800.png` unchanged since `2026-11-28-ct-turntable-carrier` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `manual-route--phone-390x844.png` unchanged since `2026-11-28-ct-turntable-carrier` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M assets/lego-helicopter-30465-1.snapshot.9/.DS_Store
 M tests/ct/turntable-access.check.ts
 M tools/ct/turntable-access.ts
 M vite.config.ts
?? assets/.DS_Store
?? "dist 2.zip"
?? dist.zip
?? docs/progress/2026-11-28-ct-blocker-trays/
?? tools/ct/__pycache__/
?? tools/ct/turntable-blockers.ts
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
