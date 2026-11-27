# feat(review): inspect exit evidence and rehearse draft procedures

- Captured: 2026-11-27T08:17:22.263Z
- HEAD at capture: `33799ea` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `a46509c4e94fead0`
- Captures that differ from the previous capture set: **4 of 5**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
Pilot: 84 generated connections; 69cafa076d244933930f8579d98f33adaece5ccc6b10a7c1e14967a578525555
Static pilot package intact: 12 single-target manuals.
  5 passed (6.8s)
Each occurrence links to its candidate exits and contacts. Draft rehearsal uses a separate in-memory session; the mechanic route retains its own checkpoint.
~~~

## Verification rows touched

- V06

## Commands actually run

- `npm run build && npm run test:e2e`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `review-route--laptop-1280x800.png` | laptop-1280x800 | `45ecf93b1d7e` | 11.00 % since `2026-11-27-reviewer-detour-and-buried-step` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `review-route--phone-390x844.png` | phone-390x844 | `45ecf93b1d7e` | 17.35 % since `2026-11-27-reviewer-detour-and-buried-step` | The local reviewer shows the selected occurrence and its labeled relationships. |
| `review-diff--laptop-1280x800.png` | laptop-1280x800 | `d1361c688a9c` | 11.53 % since `2026-11-27-reviewer-detour-and-buried-step` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `review-diff--phone-390x844.png` | phone-390x844 | `d1361c688a9c` | 0.00 % since `2026-11-27-reviewer-detour-and-buried-step` | A new blocker changes the direct stud swap into a six-step detour disturbing the pin. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 8.54 % since `2026-11-27-mechanical-review-worklist` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

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

- `review-diff--phone-390x844.png` unchanged since `2026-11-27-reviewer-detour-and-buried-step` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M  src/app/pilot-data.ts
M  src/app/reviewer.tsx
M  src/app/stud-pilot.tsx
M  src/graph-view/assembly-diagram.tsx
M  src/presentation/reviewer.css
M  tools/pilot/run.ts
?? docs/progress/2026-11-27-rehearsal-and-exit-evidence/
?? node_modules
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
