/**
 * Named capture scenarios for `npm run progress:screenshot`
 * (implementation plan §8). Add the scenario that shows the behaviour a commit
 * introduces — the capture should highlight the change, not re-shoot a screen
 * that already looked like this.
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
    /** What the reviewer should look at in the resulting PNG. */
    highlights: string;
    /** Selector that must exist before capturing; keeps captures deterministic. */
    waitFor?: string;
    viewports?: readonly Viewport[];
    fullPage?: boolean;
}>;

export const SCENARIOS: readonly Scenario[] = [
    {
        id: 'boot',
        label: 'Production host mounts',
        route: '#/',
        highlights: 'The production shell renders and owns the hash route.'
    },
    {
        id: 'review-route',
        label: 'Reviewer route resolves',
        route: '#/review',
        highlights: 'The static hash router resolves the reviewer route on a hard refresh.'
    },
    {
        id: 'concept-route',
        label: 'Concept gallery route resolves',
        route: '#/concept',
        highlights: 'The development-only gallery route is reachable at #/concept.'
    }
];
