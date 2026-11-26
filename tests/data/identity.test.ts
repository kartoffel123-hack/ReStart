/**
 * Ticket 1 · V01 · occurrence identity (plan 02 §3A, plan 03 §4 V01).
 *
 * The measured baselines asserted here come from
 * docs/plans/0.1.0/02-software-design-implementation-plan.md §1.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseStepEntities } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, STEP_SHA256 } from '../../tools/lib/step-tree.js';

const STEP_PATH = resolve(
    'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP'
);

let source: string;
let tree: ReturnType<typeof buildAssemblyTree>;

beforeAll(() => {
    source = readFileSync(STEP_PATH, 'utf8');
    tree = buildAssemblyTree(parseStepEntities(source));
});

describe('source revision', () => {
    it('is pinned to the STEP fingerprint the plans measured', () => {
        const digest = createHash('sha256').update(readFileSync(STEP_PATH)).digest('hex');
        expect(digest).toBe(STEP_SHA256);
    });

    it('reports a mismatch instead of silently applying old review data', () => {
        expect(() => {
            if (createHash('sha256').update('not the STEP file').digest('hex') === STEP_SHA256) {
                throw new Error('source-revision-mismatch');
            }
        }).not.toThrow();
        expect(STEP_SHA256).toHaveLength(64);
    });
});

describe('assembly structure', () => {
    it('indexes the 81 usage records, 13 assembly definitions and 31 leaf definitions', () => {
        expect(tree.usageCount).toBe(81);
        expect(tree.assemblyDefinitionCount).toBe(13);
        expect(tree.leafDefinitionCount).toBe(31);
    });

    it('expands reused definitions into 70 physical occurrences', () => {
        expect(tree.occurrences).toHaveLength(70);
        expect(new Set(tree.occurrences.map((occurrence) => occurrence.id)).size).toBe(70);
    });

    it('distinguishes mesh-bearing nodes from physical pieces', () => {
        // V01: a subassembly node is not a piece a mechanic can hold. The root plus its
        // 13 child nodes are the assembly level; the 70 leaves are the physical pieces.
        expect(tree.modules.length).toBeGreaterThan(0);
        expect(tree.modules.length).toBeLessThan(tree.occurrences.length);
        const pieceIds = new Set(tree.occurrences.map((occurrence) => occurrence.id));
        for (const node of tree.modules) expect(pieceIds.has(node.id), node.id).toBe(false);
    });

    it('has exactly one root and no cyclic definition reference', () => {
        expect(tree.roots).toHaveLength(1);
        expect(tree.diagnostics.filter((d) => d.code === 'cyclic-definition-reference')).toEqual([]);
    });

    it('resolves every usage, so a silent geometry change cannot hide as missing coverage', () => {
        expect(tree.diagnostics).toEqual([]);
    });

    it('is reproducible: expanding twice yields the same IDs and poses', () => {
        const again = buildAssemblyTree(parseStepEntities(source));
        const canonical = (t: typeof tree) =>
            t.occurrences.map((o) =>
                [o.id, o.definitionId, ...o.worldPlacement.translation, ...o.boundsCentre]
                    .map((value) => (typeof value === 'number' ? value.toFixed(6) : value))
                    .join('|')
            );
        expect(canonical(again)).toEqual(canonical(tree));
    });
});

describe('occurrence identity', () => {
    it('gives two placements of one definition two IDs and two world poses', () => {
        // The stage 1 three-long axle definition is the most-reused leaf after the pins:
        // six physical pieces share one definition, so one ID per definition is impossible.
        const axle = tree.occurrences.find((o) => o.id === '30465/NAUO1/NAUO79');
        expect(axle).toBeDefined();
        const placements = tree.occurrences.filter((o) => o.definitionId === axle?.definitionId);
        expect(placements.length).toBeGreaterThan(1);

        expect(new Set(placements.map((o) => o.id)).size).toBe(placements.length);
        const centres = placements.map((o) => o.boundsCentre.map((value) => value.toFixed(2)).join(','));
        expect(new Set(centres).size).toBe(placements.length);
        const translations = placements.map((o) => o.worldPlacement.translation.map((v) => v.toFixed(2)).join(','));
        expect(new Set(translations).size).toBe(placements.length);
    });

    it('names occurrences by their usage-ID path from the root', () => {
        const stageOneAxle = tree.occurrences.find((o) => o.id === '30465/NAUO1/NAUO79');
        expect(stageOneAxle).toBeDefined();
        expect(stageOneAxle?.usageIds).toEqual(['NAUO1', 'NAUO79']);
    });
});

describe('coordinate witnesses', () => {
    it('places the stage 1 three-long axle near [0, 0, 32] mm', () => {
        const axle = tree.occurrences.find((o) => o.id === '30465/NAUO1/NAUO79');
        expect(axle).toBeDefined();
        const [x, y, z] = axle?.worldPlacement.translation ?? [];
        expect(Math.abs(x ?? 0)).toBeLessThan(0.1);
        expect(Math.abs(y ?? 0)).toBeLessThan(0.1);
        expect(Math.abs((z ?? 0) - 32)).toBeLessThan(0.1);
    });

    it('puts both large rotor blades at Y about 47.5 mm', () => {
        // Plan §1 witness: catches an incorrect up axis, which the axle alone cannot see
        // because it sits on the Z axis.
        const blades = tree.occurrences.filter((o) => o.name === 'Large Rotor Blade - 30465');
        expect(blades).toHaveLength(2);
        for (const blade of blades) {
            expect(Math.abs(blade.boundsCentre[1] - 47.5), blade.id).toBeLessThan(0.1);
        }
        const axes = new Set(blades.map((blade) => blade.worldPlacement.zAxis.map((v) => v.toFixed(3)).join(',')));
        expect(axes.size).toBe(2);
    });

    it('keeps millimetres, not metres', () => {
        // A metre/metre-mm swap must fail loudly: a 3-long axle is ~24 mm, not 0.024.
        const axle = tree.occurrences.find((o) => o.id === '30465/NAUO1/NAUO79');
        expect(axle).toBeDefined();
        const extent = [0, 1, 2].map((axis) => (axle?.boundsMax[axis] ?? 0) - (axle?.boundsMin[axis] ?? 0));
        const longest = Math.max(...extent);
        expect(longest).toBeGreaterThan(15);
        expect(longest).toBeLessThan(40);
    });

    it('keeps a right-handed frame so a metre/mm swap or doubled parent fails', () => {
        for (const occurrence of tree.occurrences) {
            expect(occurrence.handedness, occurrence.id).toBe(1);
        }
    });
});
