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
