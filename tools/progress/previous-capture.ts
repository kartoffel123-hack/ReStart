/**
 * Finding the capture this one should be compared against (implementation plan §8.1).
 *
 * Folders are named `<yyyy-mm-dd>-<slug>`. Name order is correct across days and wrong
 * within one day, which is the common case, so the recorded `Captured:` timestamp in each
 * folder's `notes.md` decides the order; file mtimes and then the name break ties. mtimes
 * alone would be wrong after a fresh clone, where every folder shares one checkout time.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export type PreviousCapture = Readonly<{ folder: string; file: string }>;

type Order = Readonly<{ date: string; capturedAt: number; mtimeMs: number; name: string }>;

const CAPTURED_LINE = /^- Captured: (\S+)$/m;

function orderKey(root: string, name: string): Order {
    const directory = resolve(root, name);
    let capturedAt = 0;
    try {
        const notes = readFileSync(resolve(directory, 'notes.md'), 'utf8');
        const stamp = CAPTURED_LINE.exec(notes)?.[1];
        capturedAt = stamp === undefined ? 0 : Date.parse(stamp);
    } catch {
        capturedAt = 0;
    }
    return {
        date: name.slice(0, 10),
        capturedAt: Number.isNaN(capturedAt) ? 0 : capturedAt,
        mtimeMs: statSync(directory).mtimeMs,
        name
    };
}

function newestFirst(a: Order, b: Order): number {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.capturedAt !== b.capturedAt) return b.capturedAt - a.capturedAt;
    if (a.mtimeMs !== b.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return a.name < b.name ? 1 : -1;
}

/** The most recent capture folder before `current` that holds `file`, if any. */
export function findPreviousCapture(
    root: string,
    current: string,
    file: string
): PreviousCapture | undefined {
    let candidates: Order[];
    try {
        candidates = readdirSync(root, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && entry.name !== current)
            .map((entry) => orderKey(root, entry.name))
            .sort(newestFirst);
    } catch {
        return undefined;
    }
    for (const candidate of candidates) {
        const path = resolve(root, candidate.name, file);
        if (existsSync(path)) return { folder: candidate.name, file: path };
    }
    return undefined;
}
