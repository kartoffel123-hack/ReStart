// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../../src/app/App.js';

afterEach(cleanup);

describe('bootstrap shell', () => {
    it('mounts the production host', () => {
        render(<App />);
        expect(screen.getByText(/repair manual is booting/i)).toBeInTheDocument();
    });
});
