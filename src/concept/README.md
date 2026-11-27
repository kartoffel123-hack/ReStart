# Concept gallery (development only)

Route `#/concept` on the dev server. It renders the **production** screens with their **real**
props against named fixture states, so a revision made here is a revision the mechanic gets.
Nothing in this folder is mounted by the production host (`src/app/App.tsx` gates it on
`import.meta.env.DEV`), and no test reads the gallery's appearance.

## Developer map

| Screen | Component | Styles | Fixture state | Test |
| --- | --- | --- | --- | --- |
| Mechanic manual | `src/presentation/manual-screen.tsx` | `manual-screen.css`, tokens in `src/presentation/tokens.css` | `src/concept/scenarios.ts` | `tests/ui/manual-screen.test.tsx` |
| ↳ its view model | `src/presentation/manual-contract.ts` | — | `CONCEPT_SCENARIOS` | same |
| ↳ its step session | `src/app/manual-session.ts` | — | — | same |
| Drawing field (schematic) | `src/concept/schematic-scene.tsx` | `schematic-scene.css` | `SchematicScene` props per scenario | `tests/ui/concept-gallery.test.tsx` |
| Part inset (schematic) | `src/concept/part-inset.tsx` | inherits the inset frame from `manual-screen.css` | `PartInset` | same |
| Gallery chrome | `src/concept/gallery.tsx` | `gallery.css` | `src/concept/scenarios.ts` | same |
| Reviewer | not built — ticket 8 | — | — | `tests/review/preview.test.tsx` |

## What belongs where

- **Appearance** goes in `src/presentation/tokens.css` (colour, type, spacing) and the screen's
  own stylesheet. Nothing in `src/domain/` reads CSS.
- **Meaning** — which step is current, whether confirmation is allowed, what the evidence says —
  is computed in `src/app/` and `src/domain/`, never in a component.
- **The scene slot** is filled by the Three.js adapter in `src/scene/` once ticket 7 lands. The
  schematic here exists so arrow direction, crop and label legibility can be settled now; it is
  labelled as a schematic on screen and must not be mistaken for the live view.

## Reviewing a state

Pick a card, then at 1280×800 and again at 390×844 ask: which piece, which way, what is the next
action, when do I stop? If a teammate cannot answer without asking, the state needs a change here
or in the screen before the layout propagates (plan 02 §5.4).
