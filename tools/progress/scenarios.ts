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
            '#/concept is the development gallery: three named states of the real ManualScreen, '
            + 'so a change captured here is a change the mechanic would see.',
        waitFor: '[data-route="concept"]'
    }
];
