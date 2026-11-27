/**
 * Ticket 5 · V02/V04 · the finite actions a piece can take (plan 02 §3C step 2).
 *
 * A piece leaves along the axis its interfaces define, and how far is not the grip length. The
 * recorded grip is where the two faces' material *overlaps*, which can end long before the hole
 * does: a shaft seated 2 mm into a bore that runs to 18 mm is gripped over 2 mm but must travel
 * 18 mm to pass the far mouth. Sizing a stroke from the overlap would tell a mechanic to pull 2 mm
 * and find the piece still held, which is the failure this whole section exists to avoid.
 *
 * So the stroke is sized from two extents measured in one frame: the moving piece's own axial
 * extent, and the *stationary* mating feature's full axial extent. The holder's bounding box is a
 * collision question for the clearance kernel, not a stroke.
 */
import { describe, expect, it } from 'vitest';
import { strokeToClearHolder, type Extent } from '../../tools/lib/actions.js';

const NO_CLEARANCE = { clearanceMm: 0 };

describe('deriving the stroke a piece needs', () => {
    it('sizes the stroke by the hole the piece must pass out of, not by the grip it is held in', () => {
        // The advisor's fixture, and the counterexample to using the recorded band: a shaft
        // seated 2 mm into a bore spanning 10..18. The grip is 10..12, but the far mouth is at 18.
        const shaft: Extent = { fromMm: 0, toMm: 12 };
        const bore: Extent = { fromMm: 10, toMm: 18 };
        expect(strokeToClearHolder(shaft, bore, '+', NO_CLEARANCE)).toBeCloseTo(18, 6);
        // Back the way it came only its own 2 mm of insertion has to come out.
        expect(strokeToClearHolder(shaft, bore, '-', NO_CLEARANCE)).toBeCloseTo(2, 6);
    });

    it('carries the piece\u2019s own material past the far mouth, not just the grip', () => {
        const axle: Extent = { fromMm: 0, toMm: 22.45 };
        const wall: Extent = { fromMm: 10, toMm: 17.85 };
        // Out towards the far side: the axle's near end at 0 must pass the mouth at 17.85.
        expect(strokeToClearHolder(axle, wall, '+', NO_CLEARANCE)).toBeCloseTo(17.85, 6);
        // Back the other way: its far end at 22.45 must be brought back past 10.
        expect(strokeToClearHolder(axle, wall, '-', NO_CLEARANCE)).toBeCloseTo(12.45, 6);
    });

    it('is asymmetric when the piece sticks out further on one side', () => {
        // The mechanic-readable form: the short end goes out in one bush-length, the long end has
        // to be brought back nearly the whole axle. One stroke for both directions is wrong.
        const stubby: Extent = { fromMm: 0, toMm: 3 };
        const wall: Extent = { fromMm: 0, toMm: 3 };
        expect(strokeToClearHolder(stubby, wall, '+', NO_CLEARANCE)).toBeCloseTo(3, 6);
        expect(strokeToClearHolder(stubby, wall, '-', NO_CLEARANCE)).toBeCloseTo(3, 6);

        const long: Extent = { fromMm: 0, toMm: 30 };
        expect(strokeToClearHolder(long, wall, '+', NO_CLEARANCE)).toBeCloseTo(3, 6);
        expect(strokeToClearHolder(long, wall, '-', NO_CLEARANCE)).toBeCloseTo(30, 6);
    });

    it('takes the furthest holder when one piece runs through several on the same line', () => {
        const axle: Extent = { fromMm: 0, toMm: 20 };
        const holders: Extent[] = [
            { fromMm: 2, toMm: 5 },
            { fromMm: 12, toMm: 15 }
        ];
        expect(strokeToClearHolder(axle, holders, '+', NO_CLEARANCE)).toBeCloseTo(15, 6);
        expect(strokeToClearHolder(axle, holders, '-', NO_CLEARANCE)).toBeCloseTo(18, 6);
    });

    it('adds the clearance the reviewer asked for, and never a made-up margin', () => {
        const pin: Extent = { fromMm: 0, toMm: 8 };
        const wall: Extent = { fromMm: 0, toMm: 7.9 };
        expect(strokeToClearHolder(pin, wall, '+', { clearanceMm: 0.5 })).toBeCloseTo(8.4, 6);
        expect(strokeToClearHolder(pin, wall, '+', {})).toBeCloseTo(7.9, 6);
    });

    it('reports zero rather than a negative stroke in the direction that is already clear', () => {
        // A piece sitting wholly beyond the holder has no stroke to make that way; a negative
        // answer would become a negative travel in a pose and a sweep that runs backwards.
        expect(strokeToClearHolder({ fromMm: 20, toMm: 25 }, { fromMm: 0, toMm: 5 }, '+', NO_CLEARANCE)).toBe(0);
        // The other way it is not leaving but passing all the way through, so the honest number
        // is its whole travel and the enumerator declines the direction.
        expect(strokeToClearHolder({ fromMm: 20, toMm: 25 }, { fromMm: 0, toMm: 5 }, '-', NO_CLEARANCE)).toBeCloseTo(25, 6);
    });

    it('rejects an empty holder list instead of inventing a stroke', () => {
        expect(() => strokeToClearHolder({ fromMm: 0, toMm: 5 }, [], '+', NO_CLEARANCE)).toThrow(
            /at least one holder/
        );
    });
});
