/**
 * Ticket 1 · V01 · the compiled geometry package (plan 02 §3A, plan 03 §4 V01).
 *
 * One pass over the pinned inputs produces the geometry half of the dataset: the 70 placed
 * occurrences, their tessellation, the identity crosswalk that proves which mesh belongs to
 * which piece, and a GLB with one pickable node per occurrence ID.
 *
 * It refuses rather than publishing a partial package. A missing occurrence, an unresolved
 * identity or a changed source revision all mean the review data downstream would describe a
 * model that no longer exists, which is the failure mode the source pin exists to catch.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseStepEntities } from '../lib/step-file.js';
import { STEP_SHA256, buildAssemblyTree, type AssemblyTree } from '../lib/step-tree.js';
import { tessellateStep, reachableMeshes, TESSERATION_OPTIONS, type TessellationOptions } from '../lib/step-meshes.js';
import { buildCrosswalk, type Crosswalk } from '../lib/crosswalk.js';
import { buildAssemblyGlb, inspectAssemblyGlb, type GlbReport } from '../lib/glb.js';

/** Expected physical pieces on the pinned revision (plan 02 §1, BoM row count). */
export const EXPECTED_OCCURRENCES = 70;

export type ImportReport = Readonly<{
    schema: 'restart.import-report/1';
    generatedAt: string;
    source: Readonly<{ file: string; sha256: string; expectedSha256: string }>;
    runtime: Readonly<{ node: string; occtImportJs: string }>;
    options: TessellationOptions;
    tree: Readonly<{
        modelId: string;
        usageCount: number;
        assemblyDefinitionCount: number;
        leafDefinitionCount: number;
        occurrences: number;
        modules: number;
        diagnostics: readonly string[];
    }>;
    tessellation: Readonly<{
        meshes: number;
        nodes: number;
        meshBearingNodes: number;
        meshReferences: number;
        /** Diagnostic only — see data/review/tessellation-baseline.md (RI-01). */
        triangles: number;
    }>;
    crosswalk: Readonly<{
        matched: number;
        lowestScore: number;
        smallestMargin: number;
        unusedMeshes: readonly number[];
        issues: ReadonlyArray<Readonly<{ code: string; message: string; occurrenceId?: string }>>;
    }>;
    glb: Readonly<{ sha256: string; bytes: number; instances: number; problems: readonly string[] }>;
}>;

export type ImportPackage = Readonly<{ report: ImportReport; glb: Uint8Array<ArrayBufferLike> }>;

export function sha256(bytes: Uint8Array<ArrayBufferLike>): string {
    return createHash('sha256').update(bytes).digest('hex');
}

function declaredVersion(packageJsonPath: string, dependency: string): string {
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        devDependencies?: Record<string, string>;
    };
    return manifest.devDependencies?.[dependency] ?? 'unknown';
}

/** Read, verify and compile. Throws with the reason instead of returning a partial package. */
export async function buildImportPackage(
    stepPath: string,
    packageJsonPath = 'package.json'
): Promise<ImportPackage> {
    const bytes = new Uint8Array(readFileSync(resolve(stepPath)));
    const digest = sha256(bytes);
    if (digest !== STEP_SHA256) {
        throw new Error(
            `source revision changed: ${stepPath} is ${digest}\n` +
                `expected ${STEP_SHA256}\n` +
                `Everything downstream (crosswalk decisions, motion evidence, bench records) is ` +
                `keyed to the pinned STEP. Re-review before importing a new revision.`
        );
    }

    const tree: AssemblyTree = buildAssemblyTree(parseStepEntities(new TextDecoder().decode(bytes)));
    if (tree.diagnostics.length > 0) {
        throw new Error(
            `assembly tree reported ${tree.diagnostics.length} unresolved usage(s):\n` +
                tree.diagnostics.map((issue) => `  #${issue.entityId}: ${issue.message}`).join('\n')
        );
    }
    if (tree.occurrences.length !== EXPECTED_OCCURRENCES) {
        throw new Error(
            `expected ${EXPECTED_OCCURRENCES} physical pieces, expanded ${tree.occurrences.length}`
        );
    }

    const tessellation = await tessellateStep(bytes);
    const crosswalk: Crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
    if (crosswalk.issues.length > 0) {
        throw new Error(
            `identity crosswalk reported ${crosswalk.issues.length} issue(s):\n` +
                crosswalk.issues.map((issue) => `  ${issue.code}: ${issue.message}`).join('\n')
        );
    }

    const glb = await buildAssemblyGlb(tree.occurrences, tessellation.meshes, crosswalk);
    const inspection: GlbReport = await inspectAssemblyGlb(glb);
    if (inspection.problems.length > 0) {
        throw new Error(`GLB failed inspection:\n  ${inspection.problems.join('\n  ')}`);
    }

    const scores = crosswalk.entries.map((entry) => entry.score);
    const margins = crosswalk.entries.map((entry) => entry.margin);
    const report: ImportReport = {
        schema: 'restart.import-report/1',
        generatedAt: new Date().toISOString(),
        source: { file: stepPath, sha256: digest, expectedSha256: STEP_SHA256 },
        runtime: {
            node: process.version,
            occtImportJs: declaredVersion(resolve(packageJsonPath), 'occt-import-js')
        },
        options: tessellation.options,
        tree: {
            modelId: tree.modelId,
            usageCount: tree.usageCount,
            assemblyDefinitionCount: tree.assemblyDefinitionCount,
            leafDefinitionCount: tree.leafDefinitionCount,
            occurrences: tree.occurrences.length,
            modules: tree.modules.length,
            diagnostics: tree.diagnostics.map((issue) => `#${issue.entityId}: ${issue.message}`)
        },
        tessellation: {
            meshes: tessellation.meshes.length,
            nodes: tessellation.nodeCount,
            meshBearingNodes: tessellation.meshBearingNodeCount,
            meshReferences: reachableMeshes(tessellation.root).length,
            triangles: tessellation.triangleCount
        },
        crosswalk: {
            matched: crosswalk.entries.length,
            lowestScore: Math.min(...scores),
            smallestMargin: Math.min(...margins),
            unusedMeshes: crosswalk.unusedMeshes,
            issues: crosswalk.issues.map((issue) => ({
                code: issue.code,
                message: issue.message,
                ...(issue.occurrenceId === undefined ? {} : { occurrenceId: issue.occurrenceId })
            }))
        },
        glb: {
            sha256: sha256(glb),
            bytes: glb.byteLength,
            instances: inspection.instances.length,
            problems: inspection.problems
        }
    };
    return { report, glb };
}
