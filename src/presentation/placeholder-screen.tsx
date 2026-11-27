/**
 * Route placeholder shown until each screen lands with its own ticket. It is
 * labelled per route so a capture shows which route resolved, but every route here is
 * still ONE screen with different words. The marker below says so in the DOM, because a
 * renamed stub otherwise passes a pixel comparison as a new screen
 * (implementation plan §8.1).
 *
 * Because the routes look alike by design, the copy is the only thing a reader of
 * `docs/progress/` can read, so it has to stay true: it names the ticket that is still
 * outstanding for that route, not the one whose deliverable already landed. A placeholder
 * that promises an already-built screen tells the trail the wrong thing, so
 * `tests/integration/bootstrap.test.tsx` pins these promises.
 */
import type { ReactNode } from 'react';
import './placeholder-screen.css';

export type PlaceholderRoute = 'manual' | 'review' | 'concept';

type Promise = Readonly<{ heading: string; lead: string; ticket: string; detail: string }>;

const COPY: Record<PlaceholderRoute, Promise> = {
    // The screen landed with ticket 4 and is reviewed at #/concept. What this route still
    // lacks is the live scene and the dataset to load into it, so it names tickets 7 and 9.
    manual: {
        heading: 'Mechanic manual',
        lead: 'Waiting on',
        ticket: 'Ticket 7 · tests/ui/repair-session.test.tsx',
        detail:
            'The screen is built and reviewed at #/concept. This route still has no live ' +
            'assembly view and no compiled dataset to fill it (tickets 7 and 9).'
    },
    review: {
        heading: 'Reviewer',
        lead: 'Arrives with',
        ticket: 'Ticket 8 · tests/review/preview.test.tsx',
        detail: 'The full dependency graph, accept/reject on a generated relation, and a before/after route preview.'
    },
    // Not a promise about the future: the gallery is built, and a production build simply
    // does not ship it.
    concept: {
        heading: 'Concept gallery',
        lead: 'Not shipped ·',
        ticket: 'src/concept/gallery.tsx',
        detail:
            'The gallery is development only, so a production build serves this page instead ' +
            'of shipping the design-review states.'
    }
};

export function PlaceholderScreen({ route }: Readonly<{ route: PlaceholderRoute }>): ReactNode {
    const copy = COPY[route];
    return (
        <section
            className="rs-placeholder"
            data-route={route}
            data-placeholder={route}
            aria-labelledby="rs-placeholder-heading"
        >
            <p className="rs-placeholder__kicker">ReStart · 30465</p>
            <h1 className="rs-placeholder__heading" id="rs-placeholder-heading">
                {copy.heading}
            </h1>
            <p className="rs-placeholder__detail">{copy.detail}</p>
            <p className="rs-placeholder__ticket">
                {copy.lead} <strong>{copy.ticket}</strong>
            </p>
        </section>
    );
}
