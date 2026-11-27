/**
 * Layout identity of a rendered screen (implementation plan §8.1).
 *
 * Pixels alone cannot tell a new screen from a renamed old one. Three routes that render
 * one shared placeholder with different copy produce three different pictures, so every
 * pixel comparison reports "changed" while the application is still a single stub screen.
 * This module describes the *structure* of a screen — tags, classes and nesting, with all
 * text and attribute values excluded — so a capture set can say honestly whether it shows
 * a screen that exists or a placeholder that is standing in for one.
 *
 * Pure and DOM-free: the browser-side walk in `capture.ts` produces a `ScreenNode` tree and
 * this module reduces it. No test reads a PNG or a capture folder.
 */
import { createHash } from 'node:crypto';

/** One element of a rendered screen. Text and attributes are deliberately absent. */
export type ScreenNode = Readonly<{
    tag: string;
    classes?: readonly string[];
    /** Set when the element carries the placeholder marker; a stub is not a real screen. */
    placeholder?: boolean;
    children?: readonly ScreenNode[];
}>;

function encodeNode(node: ScreenNode): string {
    // Sorted so a stylesheet or class-list reorder is not reported as a new screen.
    const classes = [...(node.classes ?? [])].filter((name) => name.length > 0).sort();
    const suffix = classes.length === 0 ? '' : `.${classes.join('.')}`;
    const children = node.children ?? [];
    if (children.length === 0) return `${node.tag}${suffix}`;
    return `${node.tag}${suffix}[${children.map(encodeNode).join(',')}]`;
}

/**
 * Canonical identity of a screen's layout. Two screens with the same signature are the same
 * screen wearing different words; a change here is a change in structure, not in copy.
 */
export function layoutSignature(root: ScreenNode): string {
    return encodeNode(root);
}

/** Compact, stable label for a signature, safe to print in `notes.md`. */
export function layoutId(signature: string): string {
    return createHash('sha256').update(signature).digest('hex').slice(0, 12);
}

/** True when any element of the screen carries the placeholder marker. */
export function isPlaceholderStub(root: ScreenNode): boolean {
    if (root.placeholder === true) return true;
    return (root.children ?? []).some(isPlaceholderStub);
}

/** One written capture, as recorded by the capture tool. */
export type CaptureLayout = Readonly<{
    file: string;
    /** Viewport name; layouts are only compared at the same size. */
    viewport: string;
    /** `layoutSignature` of the screen this capture rendered. */
    layout: string;
}>;

/**
 * Captures that render the same layout at the same size, in first-seen order. A group here
 * means the scenarios claim distinct screens but the application serves one structure —
 * the case pixel comparison alone cannot see.
 */
export function sameLayoutGroups(captures: readonly CaptureLayout[]): string[][] {
    const groups: { viewport: string; layout: string; files: string[] }[] = [];
    for (const capture of captures) {
        const match = groups.find(
            (group) => group.viewport === capture.viewport && group.layout === capture.layout
        );
        if (match === undefined) {
            groups.push({ viewport: capture.viewport, layout: capture.layout, files: [capture.file] });
        } else {
            match.files.push(capture.file);
        }
    }
    return groups.filter((group) => group.files.length > 1).map((group) => group.files);
}

/** The captures whose screen is still a placeholder rather than a built screen. */
export function placeholderFiles(captures: readonly { file: string; stub: boolean }[]): string[] {
    return captures.filter((capture) => capture.stub).map((capture) => capture.file);
}
