// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../../src/app/App.js';
import { PlaceholderScreen } from '../../src/presentation/placeholder-screen.js';

afterEach(cleanup);

describe('bootstrap shell', () => {
    it('mounts the production host on the manual route', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: /mechanic manual/i })).toBeInTheDocument();
    });

    it('keeps the reviewer route a labelled placeholder until ticket 8', () => {
        window.location.hash = '#/review';
        render(<App />);
        expect(screen.getByRole('heading', { name: /reviewer/i })).toBeInTheDocument();
        // Distinct words are not a distinct screen: the marker tells a capture so (plan §8.2).
        expect(document.querySelector('[data-placeholder]')).not.toBeNull();
    });

    it('resolves the concept route to the gallery, which renders the production screen', () => {
        // Changed with ticket 4. The gallery is not a placeholder: it mounts the real
        // ManualScreen with its real props, which is what makes a design review of it mean
        // something. It stays development-only, so this asserts the dev host.
        window.location.hash = '#/concept';
        render(<App />);
        expect(screen.getByRole('heading', { name: /concept gallery/i })).toBeInTheDocument();
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(document.querySelector('[data-screen="manual"]')).not.toBeNull();
    });
});

describe('placeholder honesty', () => {
    // A placeholder promises a screen that does not exist yet. Once the screen lands, the
    // promise becomes false, and a reader of docs/progress is told the wrong thing about
    // which ticket is outstanding. Ticket 4 delivered ManualScreen and the concept gallery,
    // so the manual route must stop claiming ticket 4: what it still lacks is the live scene
    // (ticket 7) and the compiled dataset that feeds it (ticket 9).
    it('opens the single-target pilot on the mechanic route', () => {
        // The hash survives cleanup, and an earlier test in this file sets it to #/concept.
        window.location.hash = '#/';
        render(<App />);
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(screen.getByText(/single-target pilot/i)).toBeInTheDocument();
    });

    it('says the gallery is development-only rather than naming an unbuilt ticket', () => {
        // The gallery itself is built, so this route's placeholder is not a promise about a
        // ticket: it is what a production build serves because the gallery is not shipped.
        // Asserted on the component directly, because under Vitest DEV is true and the host
        // renders the gallery.
        render(<PlaceholderScreen route="concept" />);
        expect(document.querySelector('[data-placeholder]')).not.toBeNull();
        expect(document.body.textContent).toMatch(/development only/i);
    });
});
