// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../../src/app/App.js';
import { PlaceholderScreen } from '../../src/presentation/placeholder-screen.js';

afterEach(cleanup);

describe('bootstrap shell', () => {
    it('opens the MRI geometry preview at the default route', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: 'LEGO MRI' })).toBeInTheDocument();
        expect(screen.getByText(/preview only/i)).toBeInTheDocument();
    });

    it('opens the graph reviewer on its own route', async () => {
        window.location.hash = '#/review';
        render(<App />);
        expect(await screen.findByRole('heading', { name: /reviewer/i })).toBeInTheDocument();
        expect(document.querySelector('[data-placeholder]')).toBeNull();
    });

    it('opens the dependency graph on its own route', async () => {
        window.location.hash = '#/graph';
        render(<App />);
        expect(await screen.findByRole('heading', { name: /dependency graph/i })).toBeInTheDocument();
        expect(document.querySelector('[data-placeholder]')).toBeNull();
    });

    it('opens the DOF and timing overview on its own route', async () => {
        window.location.hash = '#/dof';
        render(<App />);
        expect(await screen.findByRole('heading', { name: /freiheitsgrade/i })).toBeInTheDocument();
        expect(document.querySelector('[data-placeholder]')).toBeNull();
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
    it('keeps the helicopter single-target pilot on its explicit route', () => {
        window.location.hash = '#/helicopter';
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
