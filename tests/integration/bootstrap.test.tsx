// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../../src/app/App.js';

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
