/**
 * Ticket 1 · V01 · tessellation and the identity crosswalk (plan 02 §3A.3–4, plan 03 §4 V01).
 *
 * The hierarchy and the tessellator each claim 70 pieces. Only the vertex crosswalk proves
 * that a *specific* mesh belongs to a *specific* occurrence, which is what makes a repair
 * route point at the right geometry, so that is what this file pins.
 *
 * Triangle count is deliberately not asserted. Plan 02 §1 records 111,646 triangles for
 * these options; on this revision `occt-import-js@0.0.23` yields 48,874, and the count moves
 * with the deflection in a direction that makes 111,646 unreachable at 0.12 mm. The plan
 * itself calls the count a diagnostic. See data/review/tessellation-baseline.md.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseStepEntities } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, type AssemblyTree } from '../../tools/lib/step-tree.js';
import { tessellateStep, reachableMeshes, type TessellatedMesh, type Tessellation } from '../../tools/lib/step-meshes.js';
import { buildCrosswalk, MIN_MATCH_MARGIN, MIN_MATCH_SCORE } from '../../tools/lib/crosswalk.js';
import { buildAssemblyGlb, inspectAssemblyGlb } from '../../tools/lib/glb.js';

const STEP_PATH = resolve(
    'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP'
);

/** V01: 0.1 mm is the initial numerical landmark tolerance for this tessellation. */
const LANDMARK_TOLERANCE_M = 0.0001;

/** Content identity of a mesh, so a shuffled array can be compared against the original. */
function meshDigest(mesh: TessellatedMesh): string {
    const positions = mesh.positions;
    const tail = positions.slice(-6).join(',');
    return createHash('sha256')
        .update(`${mesh.name}|${positions.length}|${positions.slice(0, 6).join(',')}|${tail}|${mesh.triangles.join(',')}`)
        .digest('hex')
        .slice(0, 16);
}

/** Deterministic shuffle, so a failure is reproducible from the seed alone. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
    const copy = [...items];
    let state = seed;
    for (let index = copy.length - 1; index > 0; index -= 1) {
        state = (state * 1103515245 + 12345) % 2147483648;
        const swap = state % (index + 1);
        const held = copy[index] as T;
        copy[index] = copy[swap] as T;
        copy[swap] = held;
    }
    return copy;
}

let tree: AssemblyTree;
let tessellation: Tessellation;
let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
let report: Awaited<ReturnType<typeof inspectAssemblyGlb>> = { instances: [], problems: ['not built'] };

beforeAll(async () => {
    const bytes = readFileSync(STEP_PATH);
    tree = buildAssemblyTree(parseStepEntities(bytes.toString('utf8')));
    tessellation = await tessellateStep(new Uint8Array(bytes));
}, 60_000);

describe('tessellation', () => {
    it('yields 70 meshes on 37 mesh-bearing nodes', () => {
        expect(tessellation.meshes).toHaveLength(70);
        expect(tessellation.nodeCount).toBe(39);
        expect(tessellation.meshBearingNodeCount).toBe(37);
        expect(reachableMeshes(tessellation.root)).toHaveLength(70);
    });

    it('gives every mesh finite positions and in-range triangles', () => {
        tessellation.meshes.forEach((mesh, index) => {
            expect(mesh.positions.length % 3, `mesh #${index}`).toBe(0);
            expect(mesh.positions.length, `mesh #${index}`).toBeGreaterThan(0);
            expect(mesh.positions.every((value) => Number.isFinite(value)), `mesh #${index} positions`).toBe(true);
            const vertexCount = mesh.positions.length / 3;
            expect(mesh.triangles.length % 3, `mesh #${index}`).toBe(0);
            expect(
                mesh.triangles.every((value) => Number.isInteger(value) && value >= 0 && value < vertexCount),
                `mesh #${index} indices`
            ).toBe(true);
        });
    });

    it('names every mesh with one of the 31 CAD definitions and leaves none unreachable', () => {
        const definitionNames = new Set(tree.occurrences.map((occurrence) => occurrence.name));
        expect(definitionNames.size).toBe(31);
        for (const mesh of tessellation.meshes) {
            expect(definitionNames.has(mesh.name), mesh.name).toBe(true);
        }
        const reachable = reachableMeshes(tessellation.root);
        expect(new Set(reachable).size).toBe(reachable.length);
        expect(reachable.length).toBe(tessellation.meshes.length);
    });
});

describe('identity crosswalk', () => {
    it('matches all 70 occurrences to 70 distinct meshes', () => {
        const crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
        expect(crosswalk.issues).toEqual([]);
        expect(crosswalk.unusedMeshes).toEqual([]);
        expect(crosswalk.entries).toHaveLength(70);
        expect(new Set(crosswalk.entries.map((entry) => entry.meshIndex)).size).toBe(70);
    });

    it('clears the required score and same-name margin on every match', () => {
        const crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
        for (const entry of crosswalk.entries) {
            expect(entry.score, entry.occurrenceId).toBeGreaterThanOrEqual(MIN_MATCH_SCORE);
            expect(entry.margin, entry.occurrenceId).toBeGreaterThanOrEqual(MIN_MATCH_MARGIN);
        }
    });

    it('reproduces the measured separation witnesses from plan 02 §1', () => {
        const crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
        const lowest = Math.min(...crosswalk.entries.map((entry) => entry.score));
        const closest = Math.min(...crosswalk.entries.map((entry) => entry.margin));
        expect(lowest).toBeGreaterThanOrEqual(0.9912);
        expect(closest).toBeGreaterThanOrEqual(0.5);
    });

    it('maps the same piece to the same geometry when the mesh array is shuffled', () => {
        const original = buildCrosswalk(tree.occurrences, tessellation.meshes);
        const order = shuffled(tessellation.meshes.map((_mesh, index) => index), 20261127);
        const meshByShuffledPosition = shuffled(tessellation.meshes, 20261127);
        const remapped = buildCrosswalk(tree.occurrences, meshByShuffledPosition);

        expect(remapped.issues).toEqual([]);
        for (const entry of original.entries) {
            const before = meshDigest(tessellation.meshes[entry.meshIndex] as TessellatedMesh);
            const after = remapped.byOccurrence.get(entry.occurrenceId);
            expect(after, entry.occurrenceId).toBeDefined();
            expect(meshDigest(meshByShuffledPosition[after?.meshIndex ?? -1] as TessellatedMesh), entry.occurrenceId).toBe(before);
        }
        // The order really changed, otherwise the check above would prove nothing.
        expect(order.some((index, position) => index !== position)).toBe(true);
    });

    it('reports a tied score as a diagnosable ambiguity instead of picking one', () => {
        const occurrenceId = '30465/NAUO1/NAUO79';
        const occurrence = tree.occurrences.find((candidate) => candidate.id === occurrenceId);
        expect(occurrence).toBeDefined();
        const matched = buildCrosswalk(tree.occurrences, tessellation.meshes).byOccurrence.get(occurrenceId);
        expect(matched).toBeDefined();
        // Duplicate the geometry it really matches, so the tie is about identity, not about
        // an unrelated mesh scoring badly.
        const twin = tessellation.meshes[matched?.meshIndex ?? -1] as TessellatedMesh;
        const crosswalk = buildCrosswalk([occurrence as (typeof tree.occurrences)[number]], [twin, twin]);
        const ambiguity = crosswalk.issues.filter((issue) => issue.code === 'ambiguous-match');
        expect(ambiguity).toHaveLength(1);
        expect(ambiguity[0]?.candidates).toHaveLength(2);
        expect(crosswalk.entries).toEqual([]);
    });

    it('names the candidates when a piece has no same-name mesh', () => {
        const occurrence = tree.occurrences[0];
        expect(occurrence).toBeDefined();
        const crosswalk = buildCrosswalk([occurrence as (typeof tree.occurrences)[number]], []);
        expect(crosswalk.issues.map((issue) => issue.code)).toEqual(['no-same-name-mesh']);
    });
});

describe('GLB package', () => {
    beforeAll(async () => {
        const crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
        expect(crosswalk.issues).toEqual([]);
        bytes = await buildAssemblyGlb(tree.occurrences, tessellation.meshes, crosswalk);
        report = await inspectAssemblyGlb(bytes);
    }, 120_000);

    it('ships one pickable node per occurrence ID', () => {
        expect(report.problems).toEqual([]);
        expect(report.instances.map((instance) => instance.instanceId)).toEqual(
            [...tree.occurrences.map((occurrence) => occurrence.id)].sort()
        );
        expect(new Set(report.instances.map((instance) => instance.instanceId)).size).toBe(70);
        for (const instance of report.instances) expect(instance.triangleCount).toBeGreaterThan(0);
    });

    it('puts the stage 1 axle at about [0, 0, 0.032] m in the reloaded binary', () => {
        const axle = report.instances.find((instance) => instance.instanceId === '30465/NAUO1/NAUO79');
        expect(axle).toBeDefined();
        const [x, y, z] = axle?.translation ?? [];
        expect(Math.abs(x ?? 0)).toBeLessThan(LANDMARK_TOLERANCE_M);
        expect(Math.abs(y ?? 0)).toBeLessThan(LANDMARK_TOLERANCE_M);
        expect(Math.abs((z ?? 0) - 0.032)).toBeLessThan(LANDMARK_TOLERANCE_M);
    });

    it('keeps the paired blade heights near 0.0475 m', () => {
        const blades = report.instances.filter((instance) => {
            const occurrence = tree.occurrences.find((candidate) => candidate.id === instance.instanceId);
            return occurrence?.name === 'Large Rotor Blade - 30465';
        });
        expect(blades).toHaveLength(2);
        for (const blade of blades) {
            expect(Math.abs((blade.translation[1] ?? 0) - 0.0475), blade.instanceId).toBeLessThan(LANDMARK_TOLERANCE_M);
        }
    });

    it('survives a metre/millimetre error and a doubled parent placement', () => {
        // The axle is 24 mm long: in metres the local extent is ~0.024, in decimetres it
        // would be 0.24, and a doubled parent placement would move it off its landmark.
        const axle = report.instances.find((instance) => instance.instanceId === '30465/NAUO1/NAUO79');
        expect(axle).toBeDefined();
        const extent = [0, 1, 2].map((axis) => (axle?.boundsMax[axis] ?? 0) - (axle?.boundsMin[axis] ?? 0));
        const longest = Math.max(...extent);
        expect(longest).toBeGreaterThan(0.015);
        expect(longest).toBeLessThan(0.04);
    });

    it('writes a non-trivial binary', () => {
        expect(bytes.length).toBeGreaterThan(100_000);
        // The GLB container starts with the ASCII magic "glTF" and version 2. Asserting
        // the whole header catches a JSON-only glTF or a version-1 KTX packature.
        const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('glTF');
        expect(header.getUint32(4, true)).toBe(2);
        expect(header.getUint32(8, true)).toBe(bytes.length);
    });
});
