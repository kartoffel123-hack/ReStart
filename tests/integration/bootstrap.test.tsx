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

    it('labels each hash route, while every route is still one placeholder', () => {
        for (const [hash, heading] of [
            ['#/review', /reviewer/i],
            ['#/concept', /concept gallery/i]
        ] as const) {
            window.location.hash = hash;
            cleanup();
            render(<App />);
            expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
            // Distinct words are not a distinct screen: the marker tells a capture so.
            expect(document.querySelector('[data-placeholder]')).not.toBeNull();
        }
    });
});
