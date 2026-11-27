# the placeholder stops promising a screen that already exists

- Captured: 2026-11-27T05:17:49.611Z
- HEAD at capture: `aeaf555` (commit this folder with the change it documents)
- Server: Vite dev server at http://localhost:5173/
- Capture set digest: `a48fed2e0ddaeeef`
- Captures that differ from the previous capture set: **3 of 5**

## Evidence panel (plan §8.3)

`evidence--laptop-1280x800.png` is the image that highlights this commit. No rendered
surface changed, so the capture tool rendered the measured output below into a
page and screenshotted it. It is reproduced here verbatim so the trail can be
read without opening the PNG:

~~~
the three routes really are one screen, and the copy had started lying about it

measured, not asserted: all three routes render one PlaceholderScreen structure, so they
share the layout identity that notes.md prints for every capture of them --
  manual-route  laptop 11d980a1d2e7 placeholder
  review-route  laptop 11d980a1d2e7 placeholder
  concept-route laptop 11d980a1d2e7 placeholder   (before ticket 4 landed)
same layout id at both 1280x800 and 390x844. plan 8.1 requires this: a stub wearing new words
must not pass a pixel comparison as a new screen, so "all three look the same" is the correct
signal, not a defect.

what was actually wrong is that the copy promised a screen that already exists:
  #/        claimed "Arrives with Ticket 4 . tests/ui/manual-screen.test.tsx"
            ticket 4 landed in aeaf555: ManualScreen, manual-contract, manual-session and the
            gallery are all committed and reviewed at #/concept. what #/ still lacks is the live
            assembly view (ticket 7) and a compiled dataset to load (ticket 9), so the promise
            now names those.
  #/concept claimed "Arrives with Ticket 4 . src/concept" and "the gallery has no states until
            the screens exist". the gallery has three named states of the real screen. it is
            not a promise about the future at all -- a production build serves this page because
            the gallery is development only, so the copy says that instead.
  #/review  unchanged: ticket 8 is genuinely outstanding.
  tools/progress/scenarios.ts prints these same sentences as each PNG's highlight in notes.md,
  so they were corrected in the same diff.

pinned so the trail cannot drift again          tests/integration/bootstrap.test.tsx
  "names the ticket that still blocks the mechanic route"  asserts /ticket 7/i and not /ticket 4/i
  "says the gallery is development-only ..."               asserts the concept copy states why
  both failed before the copy changed, for the reason they were written. the second is asserted
  on PlaceholderScreen directly, because under Vitest import.meta.env.DEV is true and the host
  renders the gallery rather than the fallback.

npm run typecheck          clean
npm test                   Test Files 19 passed (19)   Tests 213 passed (213)   (was 211)

needs review, with the ticket that acts on it
  RV-004   #/ still renders a placeholder while its screen exists. it becomes a real screen when
           ticket 7 supplies the scene slot and ticket 9 fills public/models/30465/. until then
           its PNG evidences routing only.
  RV-005   folders written before 8.4 landed still hold byte-identical manual-route PNGs
           (md5 3186abfa in 12 folders). left in place on purpose: each folder's notes.md names
           and references them, so deleting would break the trail. 8.4 stops new ones.
~~~

## Verification rows touched

- V05

## Commands actually run

- `npm run typecheck`
- `npm test`

## What each capture highlights

Δ is the fraction of pixels differing from the same scenario in the previous capture
folder; at or below 0.2 % the two renders count as the same screen.

| File | Viewport | Layout | Δ vs previous capture | Highlight |
| --- | --- | --- | --- | --- |
| `manual-route--laptop-1280x800.png` | laptop-1280x800 | `11d980a1d2e7` placeholder | 5.94 % since `2026-11-27-confirmed-joints-by-face-contact` | #/ resolves to the mechanic route. ManualScreen is built and reviewed at #/concept; this route still shows the shared placeholder, because it has no live assembly view (ticket 7) and no compiled dataset to load (ticket 9). |
| `manual-route--phone-390x844.png` | phone-390x844 | `11d980a1d2e7` placeholder | 10.54 % since `2026-11-27-confirmed-joints-by-face-contact` | #/ resolves to the mechanic route. ManualScreen is built and reviewed at #/concept; this route still shows the shared placeholder, because it has no live assembly view (ticket 7) and no compiled dataset to load (ticket 9). |
| `concept-route--laptop-1280x800.png` | laptop-1280x800 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-manual-screen-and-concept-gallery` | #/concept is the development gallery: three named states of the real ManualScreen, so a change captured here is a change the mechanic would see. |
| `concept-route--phone-390x844.png` | phone-390x844 | `2fe7f3d9b689` | 0.00 % since `2026-11-27-manual-screen-and-concept-gallery` | #/concept is the development gallery: three named states of the real ManualScreen, so a change captured here is a change the mechanic would see. |
| `evidence--laptop-1280x800.png` | laptop-1280x800 | `48c401671ac3` | 100.00 % since `2026-11-27-manual-screen-and-concept-gallery` | Evidence panel (plan §8.3): the measured output this commit produced, in place of a screen that does not exist yet. |

## Screens still rendered by a placeholder

These scenarios name a screen that is not built yet, so their PNGs show a labelled stub.
They confirm routing only: they cannot evidence behaviour introduced by this commit.

- `manual-route--laptop-1280x800.png`
- `manual-route--phone-390x844.png`

**2 of 5** captures are placeholders.

## Captures that share one layout

Each scenario renders a structurally different screen at its viewport size.

## Captures that look the same

Every capture in this set is visually distinct at its viewport size.

## Placeholder captures dropped from this folder

These routes are still rendered by a placeholder and their capture was identical
to the previous commit’s, so committing them would add pictures that highlight
nothing while the evidence panel above carries the change (plan §8.3). The
routes and the tickets that will replace them stay recorded here:

- `review-route--laptop-1280x800.png`
- `review-route--phone-390x844.png`

## Unchanged since the previous capture

These are pixel-for-pixel what the previous capture already showed, so they document
no newly introduced behaviour:

- `concept-route--laptop-1280x800.png` unchanged since `2026-11-27-manual-screen-and-concept-gallery` — drop it with `--only`, or render this commit’s output with `--evidence-file`
- `concept-route--phone-390x844.png` unchanged since `2026-11-27-manual-screen-and-concept-gallery` — drop it with `--only`, or render this commit’s output with `--evidence-file`

## Working tree at capture

```
M docs/progress/README.md
 M src/presentation/placeholder-screen.tsx
 M tests/integration/bootstrap.test.tsx
 M tools/progress/scenarios.ts
?? docs/progress/2026-11-27-placeholder-copy-names-the-real-ticket/
```

Captures under `docs/progress/` are a progress trail, not release evidence: no test
reads them and they satisfy no V-row in the verification plan.
