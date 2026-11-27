# UI and UX design

**ReStart 0.1.0 · mechanic manual, reviewer and design gallery**

This is the working design reference for the interface. It records the visual language, the
screen and state inventory, the 3D view conventions, the copy rules and the accessibility
contract — the things a designer or front-end engineer needs in one place before changing a
screen.

It does not replace the plans. Product decisions, evidence meaning and the planner objective
stay in [01-software-design-plan.md](plans/0.1.0/01-software-design-plan.md); ticket boundaries
and the presentation contract stay in
[02-software-design-implementation-plan.md](plans/0.1.0/02-software-design-implementation-plan.md)
§5; acceptance gates stay in
[03-software-verification-plan.md](plans/0.1.0/03-software-verification-plan.md) (V05). Where
this document and a plan disagree, the plan wins and this document is corrected.

| | |
|---|---|
| Status | Living document, first written 2026-11-27 on `feat/ui-redesign` |
| Audience | Designers, front-end engineers, reviewers of a UI change |
| Code it describes | `src/presentation/`, `src/scene/`, `src/graph-view/`, `src/concept/` |
| Gate widths | 1280 × 800 and 390 × 844 (plan 02 §5, plan 03 V05) |

## 1. How to use it

1. Read [§3 Principles](#3-principles) and [§8 Content and voice](#8-content-and-voice) before
   changing any screen. Most design mistakes here are a broken principle or a dishonest label,
   not a wrong pixel.
2. Change appearance in `src/presentation/tokens.css` and the screen's own stylesheet, not in
   components and never in `src/domain/` or `src/app/`.
3. Review the state you changed at both gate widths — in the gallery where a fixture exists,
   otherwise on `#/` — then capture it before committing
   ([§12](#12-review-gates-and-the-capture-trail)).
4. If you add or remove a screen, a state, a token or a rule, update this document in the same
   commit. A design document that lags the app is worse than none.

## 2. Who the interface is for

| Person | What they are doing | What the interface owes them |
|---|---|---|
| **Mechanic at the bench** | Holding the real helicopter, one hand free, following one step | Which piece, which way, when to stop, and one obvious control — legible at arm's length, gloves and workshop light included |
| **Reviewer** | Deciding whether a modeled relation or route is right | The whole graph, the evidence behind one edge, and a preview of what an edit changes |
| **Presenter / judge** | Understanding the product loop in a few minutes | A repair that completes visibly, with counts, preserved units and evidence status in plain words |
| **Teammate testing a route** | Following the page uncoached | Every cue readable without a second person explaining it (plan 02 §5.4) |

Environment assumptions: a Windows laptop with Chrome or Edge and no installation, a Mac for
development, a phone at 390 px as the narrow gate, and a Quest 3 for the optional WebXR path.
The page must work without a model service, sign-in or CAD install.

## 3. Principles

1. **One action at a time.** The manual shows the current step only. History is reachable, but
   confirming is only possible on the current step.
2. **The page reads like the supplied instruction sheet.** Grey build field, white paper, one
   large step numeral, a pale inset for the piece on its own, one dark confirmation control.
3. **Three facts are never hidden:** which piece, which way, when to stop. They live in the
   step strip and in the scene, not in a tooltip or a hover state.
4. **Colour is never the only cue.** The active piece has a dark contour and a text callout; the
   kit colour is preserved but not load-bearing. A colour-blind mechanic still identifies it.
5. **The DOM owns text and controls.** The canvas is a picture. Instructions, labels, counts,
   evidence and buttons are real elements, selectable and readable by assistive technology.
6. **Status is honest.** Minimum proved, best route found, search incomplete and no feasible
   route are four different statements and never collapse into "done". Evidence tiers never
   merge either ([§8.3](#83-evidence-and-status-wording)).
7. **Returning is free.** Orbiting, replaying, pausing, browsing history or opening the
   exploded view never changes the confirmed assembly state. Only an explicit confirmation
   advances it.
8. **The view is a tool, not a showcase.** Orthographic isometric framing, no camera moves the
   mechanic did not ask for, and a reset that returns to the saved step view.

## 4. Visual language

### 4.1 Palette

Defined once in `src/presentation/tokens.css`. Contrast is the measured WCAG 2 ratio of the
token on the background it is actually used on, computed for this document; 4.5:1 is the AA
text bar, 3:1 the non-text bar.

| Token | Value | Role | Measured contrast |
|---|---|---|---|
| `--rs-build-field` | `#E6E6E6` | Page and drawing-field background | — |
| `--rs-paper` | `#FFFFFF` | Instruction strip, secondary controls | — |
| `--rs-ink` | `#172127` | Body text, contours, primary button fill | 16.36 on paper · 13.11 on field |
| `--rs-parts-inset` | `#FFF2C4` | Part inset, quantity badge, warning band | — |
| `--rs-motion-arrow` | `#B92324` | Motion arrow, placeholder accent | 5.05 on field |
| `--rs-focus` | `#0B57D0` | Focus ring | 6.39 on paper · 5.12 on field |
| `--rs-ok` | `#14683D` | Stop landmark, positive status | 6.82 on paper |
| `--rs-warn` | `#8A5A00` | Blocked-step band and its text | 5.29 on inset |
| `--rs-danger` | `#A3140F` | Failure and error text | 7.88 on paper |
| `--rs-muted` | `#5C666D` | Secondary text, phase label, captions | 5.87 on paper · 4.70 on field |
| `--rs-hairline` | `#C9CFD3` | Panel and control borders | 1.57 on paper — **below the 3:1 non-text bar**, see [§13](#13-known-gaps-and-open-questions) |

Kit colours are not tokens. They come from the dataset's inventory and are mapped to hex in the
scene adapter (ten names: Black, Dark Grey, Light Grey, White, Lime Green, Red, Transparent Red,
Blue, Beige, Yellow). "Transparent Red" renders opaque; a real translucent material is out of
scope.

### 4.2 Typography

| Token / role | Family | Size | Used for |
|---|---|---|---|
| `--rs-font-body` | Atkinson Hyperlegible Next → Atkinson Hyperlegible → system sans | `--rs-body-size` = 16 px | Instructions, labels, controls |
| `--rs-font-numeral` | Barlow Condensed → Oswald → body | 4 rem (3 rem at ≤60 rem) | Step numeral, placeholder headings, gallery title |
| Phase label | body | 0.8125 rem, uppercase, `0.08em` tracking | "Taking it apart" |
| Fact term | body | 0.8125 rem, uppercase, `0.06em` tracking | "Which way", "Tool", "Stop when" |
| Secondary | body | 0.875 rem | Location line, quantity badge |
| Heading | body, 700 | 1.375 rem / 1.25 | Step heading |
| Body | body | 1 rem / 1.5 | Instruction sentence |

Both families are named in tokens but **no font files are loaded**; see the gap in [§13](#13-known-gaps-and-open-questions).
Until that is fixed the page renders in the system sans on most machines.

### 4.3 Spacing, shape and targets

- Spacing scale: 8 / 16 / 24 / 32 px (`--rs-space-1` … `-4`). Nothing else is a spacing value.
- Corner radius: 6 px (`--rs-radius`) on panels, buttons and badges.
- Minimum hit target: 44 px (`--rs-min-hit`) for buttons and primary controls; the picker's
  text inputs and selects use 40 px.
- Focus ring: 3 px `--rs-focus` with a 2 px offset, `:focus-visible` only.
- Body size never below 16 px for instructions; 13 px is reserved for uppercase labels.

### 4.4 How a piece is drawn

| Cue | Implementation | Why |
|---|---|---|
| Kit colour | Mesh material from the inventory colour | The mechanic matches the physical brick |
| Active contour | `EdgesGeometry` at 32° on the target mesh, ink colour | Identifies the piece without relying on colour |
| Start ghost | Wireframe copy of the target at the starting pose, 16 % opacity, no depth write | Shows where the piece came from without hiding it |
| Motion arrow | `ArrowHelper` in `--rs-motion-arrow`, 1.5 mm head, 1 mm head width | One direction, one stroke, anchored to the piece |
| Part inset | Isolated copy of the same mesh on a pale field, with name and "1×" | A buried piece gets its own picture |
| Exploded view | Radial offsets from the build centre (0, 12 mm, 0), slider 0–1 | Relationships, never a tool path |

## 5. Layout

At `#/graph`, the dependency tree and helicopter share the drawing area. On a laptop the parts list and repair details scroll inside separate side panels. At widths up to 60 rem, **Teile**, **Graph & 3D**, and **Details** switch between panels in the same viewport. Selecting a part returns to the drawing; the header identifies the target by name and occurrence ID.

### 5.1 Mechanic manual (a step is open)

```
┌───────────────────────────────────────┬──────────────────────────┐
│  Assembly view (2fr)                  │  This step (1fr, 20rem+) │
│  grey field, 24rem min height         │  phase · numeral of total│
│  ┌─────────────┐                      │  heading · piece · 1×    │
│  │ part inset  │  helicopter,         │  instruction             │
│  │ 12rem       │  contour + arrow     │  Which way / Tool / Stop │
│  └─────────────┘                      │  [blocked band if any]   │
│                                       │  [ Confirm this step ]   │
│                                       │  Replay · Back · Reset   │
└───────────────────────────────────────┴──────────────────────────┘
```

- Grid: `minmax(0, 2fr) minmax(20rem, 1fr)`, 24 px gap, 24 px page padding, full viewport height.
- The inset overlays the field bottom-left at laptop width and becomes static under the drawing
  at ≤60 rem, because an overlay on a 16 rem field hides the piece it explains.
- The confirmation control is the last thing in the strip and sits at the bottom (`margin-top:
  auto`), so it does not move between steps of different length.

### 5.2 Piece picker (no step open)

- Grid `minmax(16rem, 1fr) 2fr`: search and occurrence list left, the assembly right at 68 vh.
- A shared title identifies the kit. Isolate and explode sit beneath the drawing; the selected piece's name, occurrence ID and repair action share a pale inset in the inventory. At ≤48 rem the drawing comes before the inventory in a single column.
- Controls: search by name, element ID, design number or usage ID; grouped occurrence select;
  isolate checkbox; exploded-view slider; description picker; "Select …" button; joint-repair
  button when the target is the pin or the light stud.
- Below the list: "N of 70 targets available" and, when a target has no modeled route, a link to
  the reviewer's candidate exits rather than a dead end.

### 5.3 Reviewer

- Grid `3fr 2fr`: hierarchy and relationship list left, graph and scene right; 14 rem scene.
- A draft status line reports "Draft: N steps"; rehearsing it opens a banner that says the state
  replay is local and offers "Back to reviewer". The published baseline stays one click away.
- The preview compares against the baseline: step count, healthy pieces disturbed, search status,
  replay pass/fail, timing coverage, and the added and removed move IDs — then offers "Rehearse
  draft locally". A dead end reports the first unsatisfied reasons instead of an empty page.
- Single column at ≤48 rem.

**Graph view** (`src/graph-view/assembly-diagram.tsx`). It shows the local neighbourhood of the
selected occurrence, laid out left to right by Dagre (170 × 48 nodes, 28 px node gap, 96 px rank
gap), with the selected node on the pale inset colour. The three relationships stay visually
distinct and are never collapsed into one edge style:

| Relationship | Line | Label |
|---|---|---|
| Contains | Dashed `6 3` | "contains" |
| Connected to | Solid | The connection kind |
| Requires | Dashed `4 4` | `requires <state or state>` |
| Operation alternative | Dashed `2 2` | `choice: <group>` or the phase |

Clicking an occurrence node selects it; the textual prerequisite list stays beside the graph, so
the diagram never becomes the only way to read a dependency (plan 02 §6.1).

### 5.4 Completion, checkpoint and fallback

- **Completion** is a plain document, max 48 rem: what was replaced, healthy pieces disturbed,
  units preserved, timing coverage, fit check, physical-trial status, procedure fingerprint and
  the export button.
- **Checkpoint resume** appears on refresh and asks the mechanic to confirm the physical kit
  before resuming; a changed procedure offers a restart from the installed state instead.
- **No WebGL**: the scene is replaced by a labelled text route with the direction and stop
  landmark, plus "Retry 3D view". The manual still works.

### 5.5 Breakpoints

| Width | Manual | Picker | Reviewer |
|---|---|---|---|
| >60 rem | Two columns | Two columns | Two columns |
| ≤60 rem | Field above strip; numeral 3 rem; facts stack | — | — |
| ≤48 rem | — | One column, scene 38 vh | One column |

## 6. Screen and state inventory

| Screen | Route | Component | Styles | Fixture | States to review |
|---|---|---|---|---|---|
| Piece picker | `#/` before a step | `PiecePickerScreen` via `stud-pilot.tsx` | `stud-pilot.css` | — | loading, load error + retry, filtered list, isolated piece, exploded |
| Mechanic manual | `#/` with a step | `ManualScreen` via `stud-pilot.tsx` | `manual-screen.css` | `#/concept` scenarios | remove · replace · restore · check; blocked; history view; reduced motion |
| Completion | `#/` after the check | `stud-pilot.tsx` | `stud-pilot.css` | — | single target, joint target, no physical trial, unknown duration |
| Checkpoint resume | `#/` on refresh | `stud-pilot.tsx`, `checkpoint.ts` | `stud-pilot.css` | — | kit matches, procedure changed |
| Reviewer | `#/review` | `reviewer.tsx`, `graph-view/assembly-diagram.tsx` | `reviewer.css` | — | baseline, draft diff, rehearsal, no route survives |
| Concept gallery | `#/concept` (dev only) | `concept/gallery.tsx` | `gallery.css` | `concept/scenarios.ts` | buried-blocked, buried-ready, restore |

Manual session states, in the order a mechanic meets them:

```
select → [remove …] → replace → [restore …] → check → complete
            │                      │
            └── blocked (confirm disabled, reason shown)
history view (confirm disabled until "Back to this step")
fit check failed (reason band + recheck)
refresh → checkpoint → resume | restart
```

### 6.1 Interaction map

| Intent | Control | Handler | Owns the rule |
|---|---|---|---|
| Select a piece | Mesh click, list row, occurrence select | `onPick` → `select` | `src/app/` |
| Confirm the physical step | "Confirm this step" | `confirmStep` | `src/app/manual-session.ts` |
| Replay / pause the stroke | "Replay the motion", "Pause animation" | `replayMotion`, pause ref | `src/app/` |
| Return to the saved view | "Reset the view" | `resetCamera` | `src/app/` |
| Return to the current step | "Back to this step" | `returnToCurrentStep` | `src/app/` |
| Inspect history | "Confirmed steps" list | `setHistory` | `src/app/` |
| Isolate / explode | Checkbox, slider | view state | `src/app/` (not domain) |
| Enter WebXR | "Open AR/VR twin" | `xr.enter` | `src/scene/` |
| Export the repair report | "Export repair report" | `exportJson` | `src/app/` |

## 7. The 3D view

The scene adapter is `src/scene/stud-scene.tsx` with the isolated inset in
`src/scene/part-inset.ts`. One renderer per mounted scene, one animation loop, disposal on
unmount.

### 7.1 Camera

| Property | Value | Reason |
|---|---|---|
| Projection | Orthographic | World units map to equal pixels on both axes; depth never foreshortens the assembly |
| Default axis | `(-1, 1, -1)` normalised | True isometric: 35.26° elevation, 45° azimuth; keeps the existing nose/tail corner |
| Camera distance | 0.4 m from the target | Irrelevant to orthographic scale; only clears near/far (0.0001 / 2) |
| Picker framing | 0.125 m half-height | Reproduces the previous 0.36 m at 38° look |
| Focused framing | `max(0.014, 1.3 × (targetRadius + halfStroke))` | Part plus its full stroke, with margin |
| Containment | `halfHeight / min(1, aspect)` | Fits the narrower axis at any panel shape |
| Zoom | `OrbitControls`, clamped 0.4–12 | Dolly is zoom in orthographic; the clamp keeps it usable |
| Reset | Reframing resets zoom to 1; resize keeps it | "Reset the view" must reframe; a window resize must not undo a zoom |

The inset uses the same axis and an orthographic half-extent of `radius × 1.38` (the equivalent
of the old `radius × 4.8` at 32°).

### 7.2 Interaction

- **Pick**: click → ray from pointer → nearest visible instance → `instanceId` back to the app.
  The canvas publishes `data-target-point` (the target's projected NDC) so the end-to-end test
  can click the piece it means. Keyboard users select through the occurrence list.
- **Orbit / zoom**: drag and wheel. No inertia; the view stops when the pointer stops.
- **Isolate**: every other piece hidden. **Explode**: radial offsets, reversible.
- **Replay**: 1200 ms interpolation from start to end pose; reduced motion jumps to the end and
  leaves the arrow and ghost visible.
- **WebXR**: only offered when the browser supports a session and the page is secure. Trigger
  confirms the step, squeeze replays; the twin sits 0.65 m ahead and 0.17 m below the viewer,
  scaled 3×, with no physical registration claimed.

### 7.3 What the scene may not do

- It may not move the camera on its own except when the step, target or focus changes, or when
  the mechanic asks for a reset.
- It may not hide the instruction text behind the canvas.
- It may not present the exploded view as a removal path.
- It may not claim a pose the replay has not produced.

## 8. Content and voice

### 8.1 Instruction sentence

One sentence, second person, imperative, with four parts: **action + object + direction +
stop landmark**.

> Support the cross block and pull the blue pin toward the parked cap until the split end is
> clear of the block.

Rules:

- Name the piece the way the kit does ("blue friction pin", "light stud"), then the location.
- Direction words are referenced to the model ("toward the parked cap"), never "left/right"
  alone.
- The stop condition is a visible landmark, not a distance the mechanic cannot measure.
- Quantity is always "1×" in the badge; the instruction says what to do once.
- Sentence case for headings and labels. No exclamation marks. No "simply" or "just".

### 8.2 Labels

| Label | Meaning | Notes |
|---|---|---|
| Phase | "Taking it apart", "Fitting the new part", "Putting it back", "Checking it works" | Uppercase micro-label |
| Count | "2 of 6" | Numeral large, total muted |
| Which way | Direction and approach side | Always present |
| Tool | Fingers, brick separator, spare axle | Always present |
| Stop when | Visible landmark | Green, always present |
| 1× | Quantity of the piece this step handles | Pale badge |

### 8.3 Evidence and status wording

| Statement | Meaning | Never say |
|---|---|---|
| "Replayed against model" | Every step, including return, passed the recorded state and clearance checks for these revisions | "Verified" |
| "Minimum under reviewed moves" | Search eliminated every lower-disturbance route in this catalog | "Optimal" without the model qualifier |
| "Best route found" | A complete route, but the search was capped before proving the minimum | "Minimum" |
| "Search incomplete" | Capped with no complete incumbent | "No route" |
| "No feasible route" | Search exhausted, with the first unsatisfied alternatives | "Impossible" |
| "Physically verified" | A linked bench record exists for this exact procedure | Anything else |
| "Preserved intact" | A reviewed functional unit kept all internal connections throughout | "Not disturbed" |

Timing is reported as coverage plus a labelled estimate — "4 of 5 actions timed", "Duration
unknown", "challenge estimate". The workbook colours and MTM times are challenge assumptions and
are never presented as measured material or time data.

## 9. Accessibility

Checklist for any screen change:

- [ ] Every control reachable and operable by keyboard, in DOM order, with a visible focus ring.
- [ ] Every button and primary control at least 44 × 44 px; text inputs at least 40 px.
- [ ] Text meets 4.5:1; non-text boundaries meet 3:1.
- [ ] The active piece is identifiable without colour (contour + text callout).
- [ ] The step can be completed with the scene replaced by the text route.
- [ ] Under `prefers-reduced-motion: reduce`, the stroke is shown as start and end poses.
- [ ] The assembly view, the scene container and the part inset have accessible names ("Assembly
      view", "Helicopter with selected piece highlighted", "<piece> on its own").
- [ ] No meaning is carried by an animation, a hover, or a colour alone.
- [ ] Loading, error and retry states are announced (`role="status"`).

## 10. Motion

| Motion | Duration | Reduced motion |
|---|---|---|
| Stroke replay | 1200 ms lerp | Jump to the end, keep arrow and ghost |
| Page / panel transitions | None | None |
| Orbit, zoom, explode | Direct manipulation | Unchanged |

`--rs-motion-duration` exists in tokens but is not read by the scene, which hardcodes 1200 ms.
Either wire the token through or delete it ([§13](#13-known-gaps-and-open-questions)).

## 11. Changing the look

| Layer | Where | What belongs there |
|---|---|---|
| Tokens | `src/presentation/tokens.css` | Colour, type, spacing, radius, hit target, motion |
| Composition | `manual-screen.css`, `stud-pilot.css`, `reviewer.css` | Grid, breakpoints, panel order |
| Components | `src/presentation/*.tsx` | Structure, slots, accessible names, action wiring |
| Scene | `src/scene/` | Camera, framing, materials, picking, XR |
| Fixtures | `src/concept/scenarios.ts`, `src/concept/README.md` | Named states a designer can open instantly |

Rules:

- A design change must not alter route choice, counts, eligibility or evidence. Those are
  computed in `src/app/` and `src/domain/`; if a redesign needs different numbers, that is a
  product change, not a visual one.
- Keep the same `ManualScreen` props contract (`manual-contract.ts`). A replacement shell must
  complete the same repair with the same procedure fingerprint.
- Review the changed state in `#/concept` at 1280 × 800 and 390 × 844 and ask the four questions:
  which piece, which way, what next, when to stop. A teammate must answer without help.
- Capture the state before committing ([§12](#12-review-gates-and-the-capture-trail)).

## 12. Review gates and the capture trail

- **Visual review**: the Playwright-rendered progress captures are reviewed at 1280 × 800 and
  390 × 844 as part of V05. Nothing under `docs/progress/` is read by a test, and there is no
  automated screenshot-diff gate yet ([§13](#13-known-gaps-and-open-questions)).
- **Novice check**: someone other than the author identifies the piece, direction and next
  action from the page alone (plan 02 §5.4).
- **Browser check**: `npm run test:e2e` exercises real picking, single and joint repair, failed
  fit check and checkpoint resume in Chromium against the production build.
- **Pre-commit capture**: `npm run progress:screenshot -- --title "<change>"`; the tool reports
  pixel difference, layout identity and placeholder status, and calls out a capture that repeats
  the previous commit, dropping it when it is only a placeholder (plan 02 §8). A UI commit with
  no visible change needs `--evidence-file`.

## 13. Known gaps and open questions

| # | Gap | Impact | Suggested fix |
|---|---|---|---|
| 1 | Atkinson Hyperlegible Next and Barlow Condensed are named but never loaded (no `@font-face`, no `<link>`) | The page renders in the system sans; the designed numeral weight is missing | Self-host the two families as `woff2` and add `@font-face`, or replace the tokens with a stack that exists |
| 2 | `--rs-hairline` is 1.57:1 on paper and 1.25:1 against the field | Secondary controls and panel edges fall below the 3:1 non-text bar (WCAG 1.4.11) | Darken interactive borders to `#6F787E` (4.50 on paper, 3.61 on field), or give secondary buttons a field-contrasting fill |
| 3 | `--rs-motion-duration` (900 ms) is unused; the scene hardcodes 1200 ms | The token does not describe the real motion | Read the token in the scene adapter or remove it |
| 5 | Canvas picking is pointer-only | A keyboard user cannot pick a mesh directly | The occurrence list is the keyboard path; if the canvas must be operable, add a focusable overlay or keyboard cycling |
| 6 | The gallery still draws `SchematicScene`, not the real Three.js scene | A designer cannot review the actual 3D view in `#/concept` | Point the gallery's scene slot at `StudScene` with a fixture GLB, or document that the real view is reviewed on `#/` |
| 7 | `src/concept/README.md` still says the reviewer is "not built" and the real view "arrives with ticket 7" | Stale developer map | Update the two rows |
| 8 | No capture at tablet width (768–1024) | A layout that breaks between the two gates is not seen | Add a tablet viewport to the gate set if the schedule allows |
| 9 | No automated import-boundary test | A presentation import inside `domain` is caught by review, not CI | Add a test that scans `src/domain/**` imports |
| 10 | Dark mode is out of scope (`color-scheme: light`) | A mechanic in a dim workshop gets a bright page | Out of scope for 0.1.0; record if it becomes a requirement |
| 11 | No automated visual regression gate, though AGENTS.md refers to a frozen Playwright gate | A restyle can break a gate width without a failing check | Add `toHaveScreenshot` at the two widths once the layout is frozen, or correct the AGENTS.md wording |

## 14. Change log

| Date | Change | Author |
|---|---|---|
| 2026-11-27 | First version: visual language, screen states, 3D conventions, copy, accessibility, gaps | UI redesign branch |
