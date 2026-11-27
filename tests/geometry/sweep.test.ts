/**
 * Swept-volume clearance (implementation plan §3C step 3, ticket 5 · V02/V10).
 *
 * This is the primitive the automatic graph is built from: a stroke either provably misses
 * every neighbour, or names the neighbour and the travel at which it hits. A false "clear"
 * here silently removes a real step from a mechanic's manual; a false "collision" tells them
 * to strip a healthy part off a helicopter that needed no such thing. Both are product bugs,
 * so the fixtures are hand-authored boxes with arithmetic a reviewer can redo by hand.
 *
 * Nothing here reads the STEP file. The witnesses that tie these primitives to the real
 * geometry live in tests/data/features.test.ts and the import integration test.
 */
import { describe, expect, it } from 'vitest';
import {
    buildObstacle,
    clearanceAlongPath,
    translatePath,
    type TriangleSoup
} from '../../tools/lib/sweep.js';
import { IDENTITY_FRAME, frameAt, rotatedFrame } from '../helpers/frames.js';

/** Axis-aligned box as 12 non-indexed triangles, centred on `centre`, in millimetres. */
function box(
    id: string,
    centre: readonly [number, number, number],
    size: readonly [number, number, number]
): TriangleSoup {
    const [cx, cy, cz] = centre;
    const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2];
    const corner = (sx: number, sy: number, sz: number): number[] => [
        cx + sx * hx,
        cy + sy * hy,
        cz + sz * hz
    ];
    const faces: readonly (readonly (readonly [number, number, number])[])[] = [
        [[-1, -1, 1], [1, -1, 1], [1, 1, 1]],
        [[-1, -1, 1], [1, 1, 1], [-1, 1, 1]],
        [[-1, -1, -1], [1, 1, -1], [1, -1, -1]],
        [[-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
        [[-1, 1, -1], [1, 1, -1], [1, 1, 1]],
        [[-1, 1, -1], [1, 1, 1], [-1, 1, 1]],
        [[-1, -1, -1], [1, -1, 1], [1, -1, -1]],
        [[-1, -1, -1], [-1, -1, 1], [1, -1, 1]],
        [[1, -1, -1], [1, 1, -1], [1, 1, 1]],
        [[1, -1, -1], [1, 1, 1], [1, -1, 1]],
        [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1]],
        [[-1, -1, -1], [-1, 1, 1], [-1, -1, 1]]
    ];
    const positions: number[] = [];
    for (const face of faces) {
        for (const sign of face) positions.push(...corner(sign[0], sign[1], sign[2]));
    }
    return { id, positions };
}

/** A 10 mm cube centred on the origin, so its +X face sits at x = 5. */
const cube = box('mover', [0, 0, 0], [10, 10, 10]);

/** A plate whose near face is at `x`; it is 20 × 20, so the cube cannot slip past it. */
const wallAt = (x: number): TriangleSoup => box('wall', [x, 0, 0], [0.5, 20, 20]);

const plusX = [1, 0, 0] as const;

describe('a straight stroke against a neighbour', () => {
    it('names the neighbour and the travel left before contact', () => {
        // Cube face at x = 5, wall face at x = 14.75: 9.75 mm of free travel.
        const wall = buildObstacle(wallAt(15), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(cube, translatePath(plusX, IDENTITY_FRAME, 20, 0.25), wall);
        expect(verdict.status).toBe('collision');
        expect(verdict.obstacleId).toBe('wall');
        expect(verdict.atMm).toBeCloseTo(9.75, 1);
        expect(verdict.basis).toBe('sampled');
    });

    it('reports the gap it left when the stroke stops short', () => {
        const wall = buildObstacle(wallAt(15), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(cube, translatePath(plusX, IDENTITY_FRAME, 5, 0.25), wall);
        expect(verdict.status).toBe('clear');
        expect(verdict.minGapMm).not.toBeNull();
        expect(verdict.minGapMm as number).toBeCloseTo(4.75, 1);
    });

    it('reports contact at zero travel for a piece already seated against its neighbour', () => {
        // Every real piece starts in contact with something, so the primitive has to say so
        // honestly at atMm 0; deciding whether that contact is the mating interface is the
        // generator's job, not this one's.
        const seated = buildObstacle(box('seated', [5.25, 0, 0], [0.5, 20, 20]), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(cube, translatePath(plusX, IDENTITY_FRAME, 2, 0.25), seated);
        expect(verdict.status).toBe('collision');
        expect(verdict.atMm).toBeLessThanOrEqual(0.02);
    });

    it('misses a neighbour that stands beside the path', () => {
        const beside = buildObstacle(box('beside', [0, 30, 0], [10, 10, 10]), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(cube, translatePath(plusX, IDENTITY_FRAME, 20, 0.25), beside);
        expect(verdict.status).toBe('clear');
        expect(verdict.minGapMm).toBeNull();
    });
});

describe('a neighbour thinner than the sample step', () => {
    // A 0.5 mm plate stepping 1 mm at a time lands on either side of a 0.4 mm plate that
    // sits exactly in the window between two samples. Sampling alone calls that clear.
    const thin = box('mover', [0, 0, 0], [0.5, 10, 10]);
    const sliver = box('sliver', [0.5, 0, 0], [0.4, 10, 10]);

    it('still reports the hit, because the interval is tested and not only the samples', () => {
        const obstacle = buildObstacle(sliver, IDENTITY_FRAME);
        const verdict = clearanceAlongPath(thin, translatePath(plusX, IDENTITY_FRAME, 3, 1), obstacle);
        // Samples alone would say clear: at 0 mm the mover spans x -0.25..0.25 and the
        // sliver 0.3..0.7; at 1 mm the mover spans 0.75..1.25. Neither overlaps, yet the
        // piece passes straight through the sliver between the two samples.
        expect(verdict.status).toBe('collision');
        expect(verdict.obstacleId).toBe('sliver');
        expect(verdict.atMm).toBeGreaterThan(0);
        expect(verdict.atMm).toBeLessThan(1);
    });

    it('does not invent a hit where the intervals still miss', () => {
        const obstacle = buildObstacle(box('sliver', [4.5, 0, 0], [0.4, 10, 10]), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(thin, translatePath(plusX, IDENTITY_FRAME, 3, 1), obstacle);
        expect(verdict.status).toBe('clear');
    });
});

describe('a stroke that turns instead of sliding', () => {
    // A 2 mm cube sitting 6 mm out along +X, swung a quarter turn about the origin. Its centre
    // traces a 6 mm arc into a 1 mm plate that the straight-out stroke never approaches.
    const slim = () => box('slim', [6, 0, 0], [2, 2, 2]);

    it('catches a neighbour on the arc that the straight stroke misses', () => {
        const obstacle = buildObstacle(box('plate', [0, 6, 0], [1, 1, 1]), IDENTITY_FRAME);
        const straight = clearanceAlongPath(
            slim(),
            translatePath(plusX, IDENTITY_FRAME, 6, 0.25),
            obstacle
        );
        expect(straight.status).toBe('clear');

        const turning = clearanceAlongPath(slim(), [
            { atMm: 0, frame: IDENTITY_FRAME },
            { atMm: 20, frame: rotatedFrame([0, 0, 0], [0, 0, 1], Math.PI / 2) }
        ], obstacle);
        expect(turning.status).toBe('collision');
        expect(turning.atMm).toBeGreaterThan(0);
        expect(turning.atMm).toBeLessThanOrEqual(20);
    });

    it('leaves a neighbour outside the arc alone', () => {
        const obstacle = buildObstacle(box('plate', [0, 12, 0], [1, 1, 1]), IDENTITY_FRAME);
        const turning = clearanceAlongPath(slim(), [
            { atMm: 0, frame: IDENTITY_FRAME },
            { atMm: 20, frame: rotatedFrame([0, 0, 0], [0, 0, 1], Math.PI / 2) }
        ], obstacle);
        expect(turning.status).toBe('clear');
    });
});

describe('the verdict a reviewer has to be able to re-derive', () => {
    it('lets a stroke through the empty corner of a concave neighbour', () => {
        // An L: a leg along +X and a leg along +Y, so its AABB is a 10 x 10 square whose middle
        // is empty. Real Technic beams are like this — holes, channels, a lightening web — and
        // calling every stroke that crosses the bounds a review item would bury the reviewer in
        // work that means nothing.
        const lShape: TriangleSoup = {
            id: 'bracket',
            positions: [...box('a', [5, 0.5, 0], [10, 1, 2]).positions, ...box('b', [0.5, 5, 0], [1, 10, 2]).positions]
        };
        const obstacle = buildObstacle(lShape, IDENTITY_FRAME);
        // Inside the bounds the whole way: x travels 2.5 to 9.5 at y = 4.5..5.5, which is
        // empty space between the legs.
        const through = box('mover', [3, 5, 0], [1, 1, 1]);
        const verdict = clearanceAlongPath(
            through,
            translatePath(plusX, IDENTITY_FRAME, 6, 0.25),
            obstacle
        );
        expect(verdict.status).toBe('clear');

        // The same stroke on the bottom leg's centreline hits it, so the fixture is testing the
        // empty corner and not a piece that never arrives.
        const along = box('mover', [3, 0.5, 0], [1, 1, 1]);
        const lower = clearanceAlongPath(along, translatePath(plusX, IDENTITY_FRAME, 6, 0.25), obstacle);
        expect(lower.status).toBe('collision');
    });

    it('says it could not tell when the path is too coarse to refine', () => {
        // One 20 mm interval with a refinement budget of 5 placements cannot resolve a 0.5 mm
        // wall. `ambiguous` is the honest answer; `clear` would be a silent wrong manual.
        const wall = buildObstacle(wallAt(15), IDENTITY_FRAME);
        const coarse = [
            { atMm: 0, frame: IDENTITY_FRAME },
            { atMm: 20, frame: frameAt([20, 0, 0]) }
        ];
        const verdict = clearanceAlongPath(cube, coarse, wall, { maxRefineSteps: 5 });
        expect(verdict.status).toBe('ambiguous');
        expect(verdict.basis).toBe('interval');
        expect(verdict.obstacleId).toBe('wall');
    });

    it('is deterministic, so a rebuilt dataset cannot change a chosen route', () => {
        const wall = buildObstacle(wallAt(15), IDENTITY_FRAME);
        const path = translatePath(plusX, IDENTITY_FRAME, 20, 0.25);
        const first = clearanceAlongPath(cube, path, wall);
        const second = clearanceAlongPath(cube, path, wall);
        expect(second).toEqual(first);
    });

    it('places the contact on the path, never before it or past its end', () => {
        const wall = buildObstacle(wallAt(15), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(cube, translatePath(plusX, IDENTITY_FRAME, 20, 0.25), wall);
        expect(verdict.atMm).toBeGreaterThanOrEqual(0);
        expect(verdict.atMm).toBeLessThanOrEqual(20);
    });

    it('states the pose it measured against, so a doubled parent placement fails loudly', () => {
        // The same wall placed twice as far out is a different obstacle, not a rounding
        // difference: a doubled parent placement must change the verdict.
        const near = buildObstacle(wallAt(15), IDENTITY_FRAME);
        const doubled = buildObstacle(wallAt(15), frameAt([15, 0, 0]));
        const path = translatePath(plusX, IDENTITY_FRAME, 20, 0.25);
        expect(clearanceAlongPath(cube, path, near).status).toBe('collision');
        expect(clearanceAlongPath(cube, path, doubled).status).toBe('clear');
    });

    it('reports a null gap rather than a misleading zero when nothing came near', () => {
        const far = buildObstacle(box('far', [500, 0, 0], [10, 10, 10]), IDENTITY_FRAME);
        const verdict = clearanceAlongPath(cube, translatePath(plusX, IDENTITY_FRAME, 20, 0.25), far);
        expect(verdict.status).toBe('clear');
        expect(verdict.minGapMm).toBeNull();
    });
});
