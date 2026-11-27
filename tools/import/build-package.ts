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
import { extractFeatureTable } from '../lib/features.js';
import { tessellateStep, reachableMeshes, TESSERATION_OPTIONS, type TessellationOptions } from '../lib/step-meshes.js';
import { buildCrosswalk, type Crosswalk } from '../lib/crosswalk.js';
import { buildAssemblyGlb, inspectAssemblyGlb, type GlbReport } from '../lib/glb.js';
import {
    joinSources,
    readBillOfMaterials,
    readInventory,
    readTimingLookup,
    MATERIAL_PROVENANCE,
    TIMING_PROVENANCE
} from '../lib/workbooks.js';

/** Expected physical pieces on the pinned revision (plan 02 §1, BoM row count). */
export const EXPECTED_OCCURRENCES = 70;

/** Supplied workbooks, read build-side only (plan 02 §1). */
export const WORKBOOK_PATHS = Object.freeze({
    components: 'assets/siemens-provided/Components.xlsx',
    bom: 'assets/siemens-provided/BoM_Helicopter_LEGO.xlsx',
    mtm: 'assets/siemens-provided/MTM_Mapping_Connection_V3.xlsx'
});

export type ImportReport = Readonly<{
    schema: 'restart.import-report/2';
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
    /** Ticket 3C-1: candidate interface features per definition (plan 02 §3C step 1). */
    features: Readonly<{
        definitions: number;
        surfaces: number;
        cylinders: number;
        travelAxes: number;
        definitionsWithoutCylinder: readonly string[];
        diagnostics: ReadonlyArray<Readonly<{ code: string; message: string; definitionId?: string }>>;
    }>;
    /** Ticket 2: type catalog, row references, candidate units and timing coverage. */
    sources: Readonly<{
        types: number;
        quantityTotal: number;
        declaredTotal: number | null;
        unmatchedInventory: readonly string[];
        unmatchedOccurrences: readonly string[];
        bomRows: number;
        /** BoM rows whose type matches the occurrence at the same index; low by design. */
        positionalAgreement: number;
        uniqueRows: number;
        ambiguousRows: number;
        functionalUnitsNeedReview: boolean;
        timingRows: number;
        timingCrossChecks: number;
        notices: readonly string[];
        provenance: Readonly<{ materials: string; timing: string }>;
    }>;
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

    const index = parseStepEntities(new TextDecoder().decode(bytes));
    const tree: AssemblyTree = buildAssemblyTree(index);
    // Candidate interface features (plan 02 §3C step 1): the geometry the move generator is
    // allowed to reason about, with the STEP entity behind every face it cites.
    const features = extractFeatureTable(index, tree);
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

    const inventory = await readInventory(WORKBOOK_PATHS.components);
    const bom = await readBillOfMaterials(WORKBOOK_PATHS.bom);
    const timing = await readTimingLookup(WORKBOOK_PATHS.mtm);
    const joined = joinSources({ inventory, bom, occurrences: tree.occurrences });
    if (joined.issues.length > 0) {
        throw new Error(
            `workbook join reported ${joined.issues.length} issue(s):\n` +
                joined.issues.map((message) => `  ${message}`).join('\n')
        );
    }
    if (timing.crossCheckIssues.length > 0) {
        throw new Error(
            `MTM English and German sheets disagree:\n` +
                timing.crossCheckIssues.map((message) => `  ${message}`).join('\n')
        );
    }

    const scores = crosswalk.entries.map((entry) => entry.score);
    const margins = crosswalk.entries.map((entry) => entry.margin);
    const report: ImportReport = {
        schema: 'restart.import-report/2',
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
        features: {
            definitions: features.definitions.length,
            surfaces: features.definitions.reduce((total, entry) => total + entry.surfaceCount, 0),
            cylinders: features.definitions.reduce((total, entry) => total + entry.cylinders.length, 0),
            travelAxes: features.definitions.reduce((total, entry) => total + entry.travelAxes.length, 0),
            definitionsWithoutCylinder: features.definitions
                .filter((entry) => entry.cylinders.length === 0)
                .map((entry) => entry.definitionId),
            diagnostics: features.diagnostics.map((issue) => ({
                code: issue.code,
                message: issue.message,
                ...(issue.definitionId === undefined ? {} : { definitionId: issue.definitionId })
            }))
        },
        glb: {
            sha256: sha256(glb),
            bytes: glb.byteLength,
            instances: inspection.instances.length,
            problems: inspection.problems
        },
        sources: {
            types: joined.types.length,
            quantityTotal: inventory.rows.reduce((total, row) => total + row.quantity, 0),
            declaredTotal: inventory.declaredTotal,
            unmatchedInventory: joined.unmatchedInventory,
            unmatchedOccurrences: joined.unmatchedOccurrences,
            bomRows: bom.rows.length,
            positionalAgreement: joined.positionalAgreement,
            uniqueRows: joined.uniqueRows,
            ambiguousRows: joined.ambiguousRows,
            functionalUnitsNeedReview: joined.functionalUnitsNeedReview,
            timingRows: timing.rows.length,
            timingCrossChecks: timing.crossCheckIssues.length,
            notices: joined.notices,
            provenance: { materials: MATERIAL_PROVENANCE, timing: TIMING_PROVENANCE }
        }
    };
    return { report, glb };
}
