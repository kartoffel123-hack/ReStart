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
    viewports?: readonly Viewport[];
    fullPage?: boolean;
}>;

export const SCENARIOS: readonly Scenario[] = [
    {
        id: 'manual-route',
        label: 'Mechanic manual route',
        route: '#/',
        highlights:
            '#/ resolves to the mechanic route. ManualScreen is built and reviewed at '
            + '#/concept; this route still shows the shared placeholder, because it has no live '
            + 'assembly view (ticket 7) and no compiled dataset to load (ticket 9).',
        waitFor: '[data-route="manual"]'
    },
    {
        id: 'review-route',
        label: 'Reviewer route',
        route: '#/review',
        highlights:
            '#/review survives a hard refresh on a static host; its screen is still the shared '
            + 'placeholder (ticket 8).',
        waitFor: '[data-route="review"]'
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
