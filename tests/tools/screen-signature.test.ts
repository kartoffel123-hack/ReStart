/**
 * A progress capture only highlights a change if the screen itself changed. The pixel
 * comparison added in plan §8.1 cannot tell that apart on its own: three routes that all
 * render one shared placeholder with different words produce three different pictures, so
 * each capture "differs" while the app is still one screen. These fixtures check the
 * structural half of the measurement — the layout identity that ignores wording.
 *
 * Fixtures are hand-authored from the rendered DOM of the placeholder stub and are not
 * regenerated from the app, so a change to the stub cannot quietly redefine "same screen".
 */
import { describe, expect, it } from 'vitest';
import {
    isPlaceholderStub,
    layoutSignature,
    placeholderFiles,
    redundantStubs,
    sameLayoutGroups,
    type ScreenNode
} from '../../tools/progress/screen-signature.js';

/** `src/presentation/placeholder-screen.tsx` as rendered: one card, four text nodes. */
function placeholderStub(heading: string, route: string): ScreenNode {
    void heading;
    void route;
    return {
        tag: 'section',
        classes: ['rs-placeholder'],
        placeholder: true,
        children: [
            { tag: 'p', classes: ['rs-placeholder__kicker'] },
            { tag: 'h1', classes: ['rs-placeholder__heading'] },
            { tag: 'p', classes: ['rs-placeholder__detail'] },
            {
                tag: 'p',
                classes: ['rs-placeholder__ticket'],
                children: [{ tag: 'strong', classes: [] }]
            }
        ]
    };
}

/** The mechanic screen as plan §5 describes it: inventory beside the stage, then steps. */
function mechanicScreen(): ScreenNode {
    return {
        tag: 'section',
        classes: ['rs-manual'],
        children: [
            {
                tag: 'aside',
                classes: ['rs-manual__inventory'],
                children: [
                    { tag: 'input', classes: ['rs-manual__search'] },
                    {
                        tag: 'ul',
                        classes: ['rs-manual__parts'],
                        children: [{ tag: 'li', classes: ['rs-manual__part'] }]
                    }
                ]
            },
            { tag: 'div', classes: ['rs-manual__stage'] },
            {
                tag: 'ol',
                classes: ['rs-manual__steps'],
                children: [{ tag: 'li', classes: ['rs-manual__step'] }]
            }
        ]
    };
}

describe('the layout identity of a captured screen', () => {
    it('is the same screen when only the words differ', () => {
        const manual = placeholderStub('Mechanic manual', 'manual');
        const review = placeholderStub('Reviewer', 'review');
        const concept = placeholderStub('Concept gallery', 'concept');

        expect(layoutSignature(review)).toBe(layoutSignature(manual));
        expect(layoutSignature(concept)).toBe(layoutSignature(manual));
    });

    it('is a different screen once the structure grows the inventory panel', () => {
        expect(layoutSignature(mechanicScreen())).not.toBe(layoutSignature(placeholderStub('Mechanic manual', 'manual')));
    });

    it('ignores class order so an equivalent stylesheet edit is not a new screen', () => {
        const first: ScreenNode = { tag: 'div', classes: ['a', 'b'] };
        const second: ScreenNode = { tag: 'div', classes: ['b', 'a'] };
        expect(layoutSignature(second)).toBe(layoutSignature(first));
    });

    it('separates nesting depth, which a flat tag list would miss', () => {
        const shallow: ScreenNode = {
            tag: 'section',
            classes: [],
            children: [{ tag: 'p', classes: [] }, { tag: 'p', classes: [] }]
        };
        const nested: ScreenNode = {
            tag: 'section',
            classes: [],
            children: [{ tag: 'p', classes: [], children: [{ tag: 'p', classes: [] }] }]
        };
        expect(layoutSignature(nested)).not.toBe(layoutSignature(shallow));
    });

    it('is stable for the same tree, so a capture set can be grouped by it', () => {
        const again = placeholderStub('Mechanic manual', 'manual');
        expect(layoutSignature(again)).toBe(layoutSignature(placeholderStub('Mechanic manual', 'manual')));
    });
});

describe('recognising a screen that is still a placeholder', () => {
    it('reports the stub, wherever the marker sits in the tree', () => {
        expect(isPlaceholderStub(placeholderStub('Reviewer', 'review'))).toBe(true);
        expect(isPlaceholderStub(mechanicScreen())).toBe(false);
    });

    it('treats a marker on a nested element as a placeholder screen', () => {
        const wrapper: ScreenNode = {
            tag: 'div',
            classes: ['rs-app'],
            children: [placeholderStub('Mechanic manual', 'manual')]
        };
        expect(isPlaceholderStub(wrapper)).toBe(true);
    });

    it('does not call a real screen a stub because it reuses a placeholder class name', () => {
        const real: ScreenNode = { tag: 'section', classes: ['rs-placeholder-banner'], children: [] };
        expect(isPlaceholderStub(real)).toBe(false);
    });
});

describe('grouping a capture set by what it actually shows', () => {
    const stub = layoutSignature(placeholderStub('Mechanic manual', 'manual'));
    const review = layoutSignature(placeholderStub('Reviewer', 'review'));
    const real = layoutSignature(mechanicScreen());

    it('collapses three routes that render one shared layout', () => {
        const groups = sameLayoutGroups([
            { file: 'manual-route--laptop.png', viewport: 'laptop', layout: stub },
            { file: 'review-route--laptop.png', viewport: 'laptop', layout: review },
            { file: 'concept-route--laptop.png', viewport: 'laptop', layout: stub }
        ]);
        expect(groups).toEqual([
            ['manual-route--laptop.png', 'review-route--laptop.png', 'concept-route--laptop.png']
        ]);
    });

    it('does not compare layouts across viewport sizes', () => {
        const groups = sameLayoutGroups([
            { file: 'manual--laptop.png', viewport: 'laptop', layout: stub },
            { file: 'manual--phone.png', viewport: 'phone', layout: stub }
        ]);
        expect(groups).toEqual([]);
    });

    it('keeps a real screen out of the shared-layout group', () => {
        const groups = sameLayoutGroups([
            { file: 'manual--laptop.png', viewport: 'laptop', layout: stub },
            { file: 'review--laptop.png', viewport: 'laptop', layout: review },
            { file: 'gallery--laptop.png', viewport: 'laptop', layout: real }
        ]);
        expect(groups).toEqual([['manual--laptop.png', 'review--laptop.png']]);
    });

    it('lists the captures that are still a placeholder standing in for a screen', () => {
        const stubs = placeholderFiles([
            { file: 'manual--laptop.png', stub: true },
            { file: 'gallery--laptop.png', stub: false }
        ]);
        expect(stubs).toEqual(['manual--laptop.png']);
    });

    describe('dropping a placeholder capture that repeats', () => {
        const stub = { file: 'manual--laptop.png', stub: true, unchanged: true };
        const builtScreen = { file: 'manual--phone.png', stub: false, unchanged: true };
        const changedStub = { file: 'manual--wide.png', stub: true, unchanged: false };
        const panel = { file: 'evidence--laptop.png', stub: false, unchanged: false };

        it('drops a stub that repeats, once the panel carries the change', () => {
            expect(redundantStubs([stub, builtScreen, changedStub, panel], true)).toEqual([
                'manual--laptop.png'
            ]);
        });

        it('keeps every capture when there is no fresh panel to replace it', () => {
            // Without the panel a stub is the only image the commit has, and §8.2's "routing
            // only" record is better than an empty folder.
            expect(redundantStubs([stub, builtScreen, changedStub], false)).toEqual([]);
        });

        it('keeps a capture of a built screen even when it repeats', () => {
            // A built screen that did not change this commit still shows what the app looks like;
            // only a stand-in for a screen that does not exist yet is noise.
            expect(redundantStubs([builtScreen, panel], true)).toEqual([]);
        });

        it('keeps a stub whose capture actually differs', () => {
            expect(redundantStubs([changedStub, panel], true)).toEqual([]);
        });
    });
});
