/**
 * Ticket 1 · V01 · the import entry point (plan 02 §3A, plan 03 §4 V01).
 *
 * The libraries are unit-tested individually; what this file pins is that one pass over the
 * real inputs produces a package that could be published, and that it refuses rather than
 * publishing a partial one. The refusal matters more than the success path: a silently missing
 * piece would leave review data describing a model that no longer exists.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildImportPackage, EXPECTED_OCCURRENCES, sha256 } from '../../tools/import/build-package.js';
import { STEP_SHA256 } from '../../tools/lib/step-tree.js';
import { inspectAssemblyGlb } from '../../tools/lib/glb.js';

const STEP = 'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';

let report: Awaited<ReturnType<typeof buildImportPackage>>['report'];
let glb: Uint8Array<ArrayBufferLike>;

beforeAll(async () => {
    const built = await buildImportPackage(STEP);
    report = built.report;
    glb = built.glb;
}, 180_000);

describe('model:import package', () => {
    it('imports the pinned revision and nothing else', () => {
        expect(report.source.sha256).toBe(STEP_SHA256);
        expect(report.tree.diagnostics).toEqual([]);
        expect(report.tree.occurrences).toBe(EXPECTED_OCCURRENCES);
    });

    it('carries the candidate interface features the move generator will be built on', () => {
        // §3C step 1 runs in the same pass as the geometry: if the feature table were computed
        // somewhere else it could drift from the revision the meshes were tessellated from.
        expect(report.features.definitions).toBe(report.tree.leafDefinitionCount);
        expect(report.features.cylinders).toBe(1295);
        expect(report.features.surfaces).toBe(2451);
        expect(report.features.travelAxes).toBe(64);
        expect(report.features.definitionsWithoutCylinder).toEqual([]);
        expect(report.features.diagnostics).toEqual([]);
    });

    it('names the candidate mating interfaces and does not call them joints', () => {
        // §3C step 4, from the same pass as the features it reads. The candidate count is
        // pinned because it is the number a reviewer has to be able to see and distrust: 8,102
        // coaxial radius-matched pairs is more joints than a 70-piece helicopter has, so the
        // report says "candidates" and the confirmation step has to collapse it.
        expect(report.interfaces.faces).toBe(2312);
        expect(report.interfaces.candidates).toBe(8102);
        expect(report.interfaces.fitToleranceMm).toBe(0.1);
        expect(report.interfaces.axisToleranceMm).toBe(0.1);
        const classified = Object.values(report.interfaces.kindCounts).reduce((total, n) => total + n, 0);
        expect(classified).toBe(report.interfaces.candidates);
    });

    it('collapses the candidates into the joints a 70-piece helicopter could have', () => {
        // §3C step 4, decided by face contact rather than by an untrimmed surface. The candidate
        // list above is a measurement to distrust; this is the measurement that answers it, so
        // both ends are pinned: 8,102 candidates, 84 pairs of pieces that really grip.
        const confirmed = report.interfaces.confirmed;
        expect(confirmed.piecePairs).toBe(84);
        expect(confirmed.joints).toBe(1632);
        expect(confirmed.joints).toBeLessThan(report.interfaces.candidates / 4);
        // The grips sit on discrete kit heights: 1.80 mm is the friction section of a Friction
        // Pin with Stud, 3.00 mm is one bush, 8.00 mm is the width a bevel gear or beam holds an
        // axle over. A doubled parent placement would read 16 mm and a mm/metre swap far more, so
        // this span still fails loudly on the faults it is here to catch. The bound carries 1 um
        // because the grip is a measured float: the widest grip evaluates at 8.000000000000004.
        expect(confirmed.engagementMinMm).toBeGreaterThanOrEqual(1.8);
        expect(confirmed.engagementMaxMm).toBeLessThanOrEqual(8.001);
        // LEGO's line-to-line fit is 0.05 mm; nothing confirmed may be looser than the deflection.
        expect(confirmed.contactMaxMm).toBeLessThan(0.06);
        // Every piece is accounted for. The light stud was the last unexplained one and is now
        // confirmed against its own friction pin, which closes RV-003a.
        expect(confirmed.withoutJoint).toEqual([]);
    });

    it('proves every piece has its own mesh and its own pickable node', () => {
        expect(report.crosswalk.matched).toBe(EXPECTED_OCCURRENCES);
        expect(report.crosswalk.issues).toEqual([]);
        expect(report.crosswalk.unusedMeshes).toEqual([]);
        expect(report.glb.instances).toBe(EXPECTED_OCCURRENCES);
        expect(report.glb.problems).toEqual([]);
    });

    it('records the runtime that produced the numbers a later run must reproduce', () => {
        expect(report.runtime.occtImportJs).toBe('0.0.23');
        expect(report.options).toEqual({
            linearDeflectionType: 'absolute',
            linearDeflection: 0.12,
            angularDeflection: 0.4
        });
        // Triangle count is logged, never asserted as a gate (data/review/tessellation-baseline.md).
        expect(report.tessellation.triangles).toBeGreaterThan(0);
    });

    it('names the geometry by its own content hash', async () => {
        expect(report.glb.sha256).toBe(sha256(glb));
        const inspection = await inspectAssemblyGlb(glb);
        expect(inspection.instances.map((instance) => instance.instanceId)).toHaveLength(
            EXPECTED_OCCURRENCES
        );
    });

    it('refuses a source whose revision does not match the pin', async () => {
        const directory = mkdtempSync(join(tmpdir(), 'restart-revision-'));
        try {
            const tampered = join(directory, 'tampered.STEP');
            copyFileSync(STEP, tampered);
            writeFileSync(tampered, Buffer.concat([readFileSync(tampered), Buffer.from('\n')]), 'utf8');
            await expect(buildImportPackage(tampered)).rejects.toThrow(/source revision changed/);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
