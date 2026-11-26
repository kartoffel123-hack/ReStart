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

    it('renders a visibly different placeholder for each hash route', () => {
        for (const [hash, heading] of [
            ['#/review', /reviewer/i],
            ['#/concept', /concept gallery/i]
        ] as const) {
            window.location.hash = hash;
            cleanup();
            render(<App />);
            expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
        }
    });
});
