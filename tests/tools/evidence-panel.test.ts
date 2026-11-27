/**
 * A commit that changes no rendered surface still has to leave an image that shows the change
 * (implementation plan §8.3). The panel is that image, so two things have to hold: it is
 * findable by the previous-folder comparison that decides whether a capture set repeats the
 * last commit, and it reproduces the measured output rather than rendering it as markup.
 *
 * Fixtures are hand-written strings, not output of the tool, so a change to the panel cannot
 * quietly redefine what a valid panel is.
 */
import { describe, expect, it } from 'vitest';
import {
    EVIDENCE_FILE_NAME,
    EVIDENCE_VIEWPORT,
    evidenceHtml,
    requireEvidenceBody
} from '../../tools/progress/evidence-panel.js';

const panel = {
    title: 'importer reads candidate interface features from the STEP',
    captured: '2026-11-27T02:30:00.000Z',
    head: 'a996150',
    commands: ['npm run typecheck', 'npm test'],
    body: [
        'interface features   1295 cylinders over 31 definitions, 64 candidate travel axes',
        '  axle NAUO1/NAUO79  pd:4817  5 cylinders, radius 2.35 mm, axis local ±[0, 0, 1]',
        '  world axis         [-1, 0, 0]  bounds centre [0, 0, 32] mm'
    ].join('\n')
};

describe('the evidence panel of a commit with no rendered surface', () => {
    it('is named after the gate viewport so it is compared against the previous commit', () => {
        // App captures are `<scenario>--<viewport>.png`; the comparison in §8.1 finds the
        // previous folder's file by name, so the panel has to follow the same shape.
        expect(EVIDENCE_FILE_NAME).toBe(`evidence--${EVIDENCE_VIEWPORT.name}.png`);
        expect(EVIDENCE_FILE_NAME).toMatch(/--[a-z]+-\d+x\d+\.png$/);
    });

    it('reproduces the measured output line for line, indentation included', () => {
        const html = evidenceHtml(panel);
        expect(html).toContain(panel.body);
        expect(html).toContain('  axle NAUO1/NAUO79  pd:4817');
        expect(html).toContain('interface features');
        expect(html).toContain(panel.title);
    });

    it('does not let markup inside the measured output rewrite the panel', () => {
        // Counterexample for an implementation that interpolates the body raw: STEP dumps and
        // test output contain angle brackets, and a naive panel would render them as elements,
        // silently dropping the very line the reviewer came to read.
        const hostile = {
            ...panel,
            body: 'surface <CYLINDRICAL_SURFACE> #4276\n</pre><h1>all green</h1><pre>'
        };
        const html = evidenceHtml(hostile);
        expect(html.match(/<pre>/g)).toHaveLength(1);
        expect(html).not.toContain('<h1>all green</h1>');
        expect(html).toContain('&lt;CYLINDRICAL_SURFACE&gt;');
        expect(html).toContain('&lt;/pre&gt;&lt;h1&gt;all green&lt;/h1&gt;');
    });

    it('escapes the commands it lists as well as the body', () => {
        const html = evidenceHtml({ ...panel, commands: ['npm test -- --reporter=<html>'] });
        expect(html).toContain('--reporter=&lt;html&gt;');
        expect(html).not.toContain('--reporter=<html>');
    });

    it('refuses an empty panel instead of producing a blank screenshot', () => {
        expect(() => requireEvidenceBody('\n   \n\t\n', 'evidence.txt')).toThrow(/empty/);
        expect(requireEvidenceBody(`${panel.body}\n\n`, 'evidence.txt')).toBe(panel.body);
    });
});
