// @vitest-environment jsdom
/**
 * Ticket 4 · V05 · the gallery and the production screen share view props (plan 02 §5.4).
 *
 * The deliverable is not "a gallery exists"; it is that what the gallery shows *is* the screen the
 * mechanic gets. A gallery that re-implemented the layout would drift, and a design review of it
 * would prove nothing. So these tests assert the gallery renders the production screen's own
 * landmarks, and that switching state changes the step rather than the chrome.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConceptGallery } from '../../src/concept/gallery.js';
import { CONCEPT_SCENARIOS } from '../../src/concept/scenarios.js';

beforeEach(() => {
    cleanup();
    // The gallery now records the chosen state in the address (plan §8.6), and jsdom carries
    // `window.location.hash` across every test in a file. Without this reset, a test that clicks
    // a card silently decides which state the next test is handed.
    window.location.hash = '#/concept';
});

describe('the concept gallery', () => {
    it('renders the production manual screen, not a copy of it', () => {
        render(<ConceptGallery />);
        expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('data-screen', 'manual');
        expect(screen.getByRole('region', { name: 'This step' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm this step/i })).toBeInTheDocument();
    });

    it('offers every named example state', () => {
        render(<ConceptGallery />);
        const nav = screen.getByRole('navigation', { name: 'Example states' });
        for (const scenario of CONCEPT_SCENARIOS) {
            expect(screen.getByRole('button', { name: new RegExp(scenario.label, 'i') })).toBeInTheDocument();
        }
        expect(nav).toBeInTheDocument();
    });

    it('shows the blocked state with the reason the mechanic needs', async () => {
        const user = userEvent.setup();
        render(<ConceptGallery />);
        await user.click(
            screen.getByRole('button', { name: /Buried piece, blocker still in place/i })
        );
        expect(screen.getByRole('button', { name: /confirm this step/i })).toBeDisabled();
        expect(screen.getByText(/has not come off yet/i)).toBeInTheDocument();
    });

    it('switches the step, and the phase label with it', async () => {
        const user = userEvent.setup();
        render(<ConceptGallery />);
        const strip = () => screen.getByRole('region', { name: 'This step' });
        expect(within(strip()).getByText(/Taking it apart/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Putting it back/i }));

        // The scenario card is labelled the same way on purpose, so the phase is read off the
        // screen itself rather than off the gallery chrome beside it.
        expect(within(strip()).getByText(/Putting it back/i)).toBeInTheDocument();
        expect(within(strip()).getByText('Friction pin 5L')).toBeInTheDocument();
    });

    it('draws the removal direction and the piece in the inset, so the arrow can be reviewed', () => {
        render(<ConceptGallery />);
        expect(screen.getByRole('img', { name: /moves straight out along the axle/i })).toBeInTheDocument();
        expect(screen.getByTestId('part-inset')).toBeInTheDocument();
    });
});

describe('opening one named example state directly', () => {
    // Every commit photographs this gallery, and a photograph of the default card is the same
    // picture at every commit. The other two states -- the step the mechanic actually acts on,
    // and a restoration -- had never appeared in a single capture. For a capture to reach them
    // the state has to be addressable, and the capture has to be able to prove it arrived.

    it('renders the state named in the address, not the first one', () => {
        window.location.hash = '#/concept?state=restore';
        render(<ConceptGallery />);
        const strip = screen.getByRole('region', { name: 'This step' });
        expect(within(strip).getByText('Friction pin 5L')).toBeInTheDocument();
        expect(within(strip).getByText(/Putting it back/i)).toBeInTheDocument();
    });

    it('marks which state it rendered, so a capture cannot claim one and show another', () => {
        window.location.hash = '#/concept?state=buried-ready';
        render(<ConceptGallery />);
        expect(document.querySelector('[data-scenario="buried-ready"]')).not.toBeNull();
    });

    it('keeps the state in the address when a card is chosen, so a review link reloads it', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/concept';
        render(<ConceptGallery />);
        await user.click(screen.getByRole('button', { name: /Putting it back/i }));
        expect(window.location.hash).toContain('state=restore');
    });

    it('falls back to the first state for a name that is not one, and says which it showed', () => {
        window.location.hash = '#/concept?state=not-a-state';
        render(<ConceptGallery />);
        expect(document.querySelector('[data-scenario="buried-blocked"]')).not.toBeNull();
        const strip = screen.getByRole('region', { name: 'This step' });
        expect(within(strip).getByText('Bush 3L')).toBeInTheDocument();
    });
});
