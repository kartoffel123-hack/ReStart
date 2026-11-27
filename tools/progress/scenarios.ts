/**
 * Named capture scenarios for `npm run progress:screenshot`
 * (implementation plan §8). Add the scenario that shows the behaviour a commit
 * introduces — the capture should highlight the change, not re-shoot a screen
 * that already looked like this.
 *
 * `waitFor` is not decoration: it asserts the page reached the state the
 * scenario claims, so a route that silently renders the same placeholder as
 * every other route fails the capture instead of producing a misleading PNG.
 */
export type Viewport = Readonly<{ name: string; width: number; height: number }>;

/** The two gate widths from implementation plan §5. */
export const GATE_VIEWPORTS: readonly Viewport[] = [
    { name: 'laptop-1280x800', width: 1280, height: 800 },
    { name: 'phone-390x844', width: 390, height: 844 }
];

export type Scenario = Readonly<{
    id: string;
    label: string;
    /** Hash route to open, e.g. `#/` or `#/concept?state=buried-step`. */
    route: string;
    /** What the reviewer should be able to see in the resulting PNG. */
    highlights: string;
    /** Selector that must exist before capturing; keeps captures deterministic. */
    waitFor?: string;
    setup?: 'blocked-preview' | 'buried-pin';
    viewports?: readonly Viewport[];
    fullPage?: boolean;
}>;

export const SCENARIOS: readonly Scenario[] = [
    {
        id: 'manual-route',
        label: 'Mechanic manual route',
        route: '#/',
        highlights:
            'The real assembly picker highlights the light stud, the first playable target.',
        waitFor: '[data-route="manual"] canvas[data-target-point]'
    },
    {
        id: 'review-route',
        label: 'Reviewer route',
        route: '#/review',
        highlights:
            'The local reviewer shows the selected occurrence and its labeled relationships.',
        waitFor: '[data-route="review"] .react-flow__node'
    },
    {
        id:'buried-pin-step',label:'Blue friction pin exposed',route:'#/',setup:'buried-pin',
        waitFor:'[data-screen="manual"][data-phase="remove"] canvas',
        highlights:'After the cap is parked, the diagram highlights the blue friction pin and its withdrawal stroke.'
    },
    {
        id:'review-diff',label:'Draft changes the access path',route:'#/review',setup:'blocked-preview',
        waitFor:'[data-route="review"]',highlights:'A new blocker changes the direct stud swap into a six-step detour disturbing the pin.'
    },
    {
        id: 'nauo9-indirect-removal',
        label: 'NAUO9 direct and indirect removal steps',
        route: '#/graph?piece=30465%2FNAUO9',
        highlights:
            'NAUO9 graph shows direct removals in yellow and the indirect washer dependencies NAUO3 and NAUO5 in light yellow, with axle connections labelled for slide review.',
        waitFor: '[data-route="graph"] .rs-graph-visual'
    },
    {
        id: 'concept-route',
        label: 'Concept gallery route',
        route: '#/concept',
        highlights:
            'Gallery state "buried-blocked": the piece is hidden and its blocker is still fitted, '
            + 'so the confirm control is disabled and the screen says why. The real ManualScreen, '
            + 'so a change here is a change the mechanic would see.',
        // The state is asserted, not assumed: without data-scenario a capture that silently fell
        // back to the default card would still have found [data-route="concept"] and photographed
        // the same picture for every state (plan §8.6).
        waitFor: '[data-route="concept"] [data-scenario="buried-blocked"]'
    },
    {
        id: 'concept-ready-route',
        label: 'Concept gallery, step the mechanic acts on',
        route: '#/concept?state=buried-ready',
        highlights:
            'Gallery state "buried-ready": the same piece once its blocker is off, so the confirm '
            + 'control is live, the obstruction is gone from the drawing, and the warning band is '
            + 'replaced by the one move and its stop condition.',
        waitFor: '[data-route="concept"] [data-scenario="buried-ready"]'
    },
    {
        id: 'concept-restore-route',
        label: 'Concept gallery, restoration step',
        route: '#/concept?state=restore',
        highlights:
            'Gallery state "restore": a step that puts a piece back rather than taking one out. '
            + 'It reads differently -- different piece, direction and stop landmark -- which is '
            + 'why restoration is captured as its own state and not assumed from removal.',
        waitFor: '[data-route="concept"] [data-scenario="restore"]'
    }
];
