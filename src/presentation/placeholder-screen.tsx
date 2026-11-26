/**
 * Route placeholder shown until each screen lands with its own ticket. It is
 * deliberately distinct per route: the progress captures under docs/progress/
 * have to show which route resolved, otherwise every capture is the same
 * picture and the trail proves nothing (implementation plan §8).
 */
import type { ReactNode } from 'react';
import './placeholder-screen.css';

export type PlaceholderRoute = 'manual' | 'review' | 'concept';

const COPY: Record<PlaceholderRoute, Readonly<{ heading: string; ticket: string; detail: string }>> = {
    manual: {
        heading: 'Mechanic manual',
        ticket: 'Ticket 4 · tests/ui/manual-screen.test.tsx',
        detail: 'Searchable inventory beside the assembled helicopter, then one step at a time.'
    },
    review: {
        heading: 'Reviewer',
        ticket: 'Ticket 8 · tests/review/preview.test.tsx',
        detail: 'The full dependency graph, accept/reject on a generated relation, and a before/after route preview.'
    },
    concept: {
        heading: 'Concept gallery',
        ticket: 'Ticket 4 · src/concept',
        detail: 'Development-only gallery rendering the production screens against named fixture states.'
    }
};

export function PlaceholderScreen({ route }: Readonly<{ route: PlaceholderRoute }>): ReactNode {
    const copy = COPY[route];
    return (
        <section className="rs-placeholder" data-route={route} aria-labelledby="rs-placeholder-heading">
            <p className="rs-placeholder__kicker">ReStart · 30465</p>
            <h1 className="rs-placeholder__heading" id="rs-placeholder-heading">
                {copy.heading}
            </h1>
            <p className="rs-placeholder__detail">{copy.detail}</p>
            <p className="rs-placeholder__ticket">
                Arrives with <strong>{copy.ticket}</strong>
            </p>
        </section>
    );
}
