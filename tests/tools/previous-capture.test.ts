/**
 * The "Δ vs previous capture" number is only meaningful if *previous* means the capture
 * taken just before this one. Folders are named `<date>-<slug>`, so sorting by name orders
 * days correctly and scrambles captures taken on the same day — which is the normal case in
 * a session that commits several times a day. These tests pin the chronological lookup.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findPreviousCapture } from '../../tools/progress/previous-capture.js';

let root = '';

/** Folders are named so that the newer capture sorts *later* alphabetically or not. */
function captureFolder(name: string, file: string, takenAt: number): void {
    const directory = join(root, name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, file), 'png');
    const when = new Date(takenAt);
    utimesSync(join(directory, file), when, when);
    utimesSync(directory, when, when);
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'progress-root-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('previous capture lookup', () => {
    it('prefers the capture taken just before, even when its name sorts later', () => {
        captureFolder('2026-11-27-captures-compared-by-pixels', 'manual-route--laptop.png', 1_000);
        captureFolder('2026-11-27-tessellation-and-identity-crosswalk', 'manual-route--laptop.png', 2_000);
        captureFolder('2026-11-26-older-day', 'manual-route--laptop.png', 500);

        const found = findPreviousCapture(root, '2026-11-27-new-work', 'manual-route--laptop.png');
        expect(found?.folder).toBe('2026-11-27-tessellation-and-identity-crosswalk');
    });

    it('ignores the folder being written right now', () => {
        captureFolder('2026-11-27-new-work', 'manual-route--laptop.png', 3_000);
        captureFolder('2026-11-26-older-day', 'manual-route--laptop.png', 500);

        const found = findPreviousCapture(root, '2026-11-27-new-work', 'manual-route--laptop.png');
        expect(found?.folder).toBe('2026-11-26-older-day');
    });

    it('skips folders that never captured this scenario', () => {
        captureFolder('2026-11-27-b', 'review-route--laptop.png', 3_000);
        captureFolder('2026-11-26-a', 'manual-route--laptop.png', 1_000);

        const found = findPreviousCapture(root, '2026-11-27-current', 'manual-route--laptop.png');
        expect(found?.folder).toBe('2026-11-26-a');
    });

    it('reports no previous capture the first time a scenario runs', () => {
        captureFolder('2026-11-26-a', 'review-route--laptop.png', 1_000);
        expect(findPreviousCapture(root, '2026-11-27-current', 'manual-route--laptop.png')).toBeUndefined();
    });
});
