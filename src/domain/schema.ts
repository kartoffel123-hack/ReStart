/**
 * The repair model, defined once (plan 02 §3B). These contracts are the shared
 * input to the CLI, the browser worker and the test fixtures, so every record
 * here is serializable JSON: string IDs, plain arrays, no classes, no Maps.
 *
 * `src/domain` is pure: no DOM, no fetch, no renderer, no clock, no storage.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ vectors */

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export const quaternionSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof vec3Schema>;
export type Quaternion = z.infer<typeof quaternionSchema>;

/** Rigid transform. Translation in millimetres, rotation a unit quaternion. */
export const rigidFrameSchema = z.object({
    translation: vec3Schema,
    rotation: quaternionSchema
});
export type RigidFrame = z.infer<typeof rigidFrameSchema>;

/** Axis-aligned box in millimetres, used for conservative sweep volumes. */
export const boxSchema = z.object({ min: vec3Schema, max: vec3Schema });
export type Box = z.infer<typeof boxSchema>;

export const evidenceRefSchema = z.object({
    /** Where this relation came from: 'generated', 'reviewed', 'bench', ... */
    tier: z.enum(['generated', 'reviewed', 'replayed', 'proved', 'physical']),
    source: z.string(),
    note: z.string().optional(),
    revision: z.string().optional()
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

/* ------------------------------------------------- containment and contact */

export const occurrenceSchema = z.object({
    id: z.string(),
    /** Definition this occurrence instantiates, e.g. `NAUO79`. */
    definitionId: z.string(),
    definitionName: z.string(),
    /** Containing occurrence id, or null for the root assembly node. */
    parent: z.string().nullable(),
    /** Usage-id path from the root; identifies the physical piece in a revision. */
    path: z.array(z.string()),
    /** Assembly nodes contain pieces; only pieces are selectable and disturbable. */
    kind: z.enum(['assembly', 'piece']),
    installedPoseId: z.string(),
    meshId: z.string().nullable(),
    typeKey: z.string(),
    commonName: z.string(),
    locationLabel: z.string(),
    quantityGroup: z.string().optional()
});
export type Occurrence = z.infer<typeof occurrenceSchema>;

/** A reviewed functional unit: pieces that travel together or stay joined. */
export const unitSchema = z.object({
    id: z.string(),
    name: z.string(),
    memberIds: z.array(z.string()),
    internalConnectionIds: z.array(z.string()),
    evidence: evidenceRefSchema
});
export type Unit = z.infer<typeof unitSchema>;

export const connectionKindSchema = z.enum([
    'axle-bore',
    'pin-hole',
    'friction',
    'gear-mesh',
    'clip',
    'stud-tube',
    'other'
]);
export type ConnectionKind = z.infer<typeof connectionKindSchema>;

/** A connection identifies both endpoints and the interface between them. */
export const connectionSchema = z.object({
    id: z.string(),
    a: z.string(),
    b: z.string(),
    kind: connectionKindSchema,
    /** Interface origin and axis in assembly coordinates, millimetres. */
    origin: vec3Schema,
    axis: vec3Schema,
    /** Whether the interface is engaged in the installed assembly. */
    installedEngaged: z.boolean(),
    classification: z
        .object({
            rowId: z.string(),
            basis: z.string(),
            quality: z.string().optional(),
            language: z.enum(['EN', 'DE']).optional()
        })
        .optional(),
    evidence: evidenceRefSchema
});
export type Connection = z.infer<typeof connectionSchema>;

/* ---------------------------------------------------------- poses and needs */

export const poseKindSchema = z.enum(['installed', 'retracted', 'parked', 'bench', 'detached']);

/** A named configuration of one occurrence with an explicit rigid transform. */
export const poseSchema = z.object({
    id: z.string(),
    occurrenceId: z.string(),
    kind: poseKindSchema,
    frame: rigidFrameSchema,
    /** Frame the stored motion curve for this pose uses (plan 02 §3B). */
    curveFrame: z.string(),
    /** Partial withdrawals record their travel and a visible stopping reference. */
    travelMm: z.number().finite().optional(),
    stopLandmark: z.string().optional(),
    /** Positive support condition: what still carries this piece here. */
    supportedBy: z.string().optional()
});
export type Pose = z.infer<typeof poseSchema>;

export const requirementSchema = z.object({
    id: z.string(),
    subject: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('occurrence'), id: z.string() }),
        z.object({ kind: z.literal('connection'), id: z.string() })
    ]),
    /** Pose ids (occurrence subjects) or 'engaged'/'released' (connections). */
    acceptable: z.array(z.string()).min(1),
    /** Why this condition exists, so the reviewer can tell a blocker from a
     *  tool-corridor or a support requirement. */
    role: z.enum(['blocker', 'tool-access', 'support']).default('blocker'),
    reason: z.string(),
    evidence: evidenceRefSchema
});
export type Requirement = z.infer<typeof requirementSchema>;

/* ------------------------------------------------------- tools and motions */

export const toolSchema = z.object({
    id: z.string(),
    name: z.string(),
    /** Fingers, a brick separator, or a spare axle/pin used as a pusher. */
    class: z.enum(['fingers', 'brick-separator', 'pusher', 'spare-axle', 'spare-pin', 'other']),
    /** A bench tool is never a model occurrence and never counts as disturbed. */
    isBenchTool: z.boolean(),
    envelope: boxSchema.optional()
});
export type Tool = z.infer<typeof toolSchema>;

/** One sampled frame of a motion path, in assembly coordinates. */
export const motionFrameSchema = z.object({
    atMm: z.number().finite().min(0),
    frame: rigidFrameSchema
});

export const allowedContactSchema = z.object({
    /** The pair this exception covers. */
    a: z.string(),
    b: z.string(),
    /** Only the mating interface may touch, in this direction, until reviewed otherwise. */
    region: z.string(),
    evidence: evidenceRefSchema
});

/**
 * A motion is one physical stroke. Obstructions are compiled into the
 * operation that uses this motion, so the domain stays discrete and the
 * geometry lives in `tools/` (plan 02 §3C).
 */
export const motionSchema = z.object({
    id: z.string(),
    members: z.array(z.string()).min(1),
    /** Ordered path frames; the first must match the `from` pose. */
    frames: z.array(motionFrameSchema).min(2),
    /** Which frame the curve is expressed in — 'assembly' or an occurrence id. */
    curveFrame: z.string(),
    toolId: z.string(),
    /** Conservative swept volume for the stroke, assembly coordinates. */
    sweep: boxSchema,
    /** Reviewed mating-contact exceptions for this stroke. */
    allowedContacts: z.array(allowedContactSchema).default([]),
    /** Whether the sweep was checked, and with what tolerance. */
    toleranceMm: z.number().finite().default(0.5),
    evidence: evidenceRefSchema
});
export type Motion = z.infer<typeof motionSchema>;

/* ---------------------------------------------------------------- operations */

export const phaseSchema = z.enum(['remove', 'replace', 'restore', 'check']);

export const poseAssignmentSchema = z.object({
    occurrenceId: z.string(),
    poseId: z.string()
});
export type PoseAssignment = z.infer<typeof poseAssignmentSchema>;

/**
 * One admissible move. Different admissible paths are distinct operations, and
 * alternatives share an `alternativeGroup` so the graph can show a labelled
 * choice instead of implying every blocker must come off.
 */
export const operationSchema = z.object({
    id: z.string(),
    label: z.string(),
    phase: phaseSchema,
    /** Occurrence ids this move physically displaces. */
    members: z.array(z.string()).min(1),
    /** Required pose of each member before the move is legal. */
    from: z.array(poseAssignmentSchema),
    /** Pose each member takes after the move. */
    to: z.array(poseAssignmentSchema),
    /** Every requirement must hold for the move to be offered. */
    requires: z.array(requirementSchema).default([]),
    /** Connections the move releases or establishes. */
    releasesConnectionIds: z.array(z.string()).default([]),
    establishesConnectionIds: z.array(z.string()).default([]),
    /** Set when the move turns the whole assembly: it disturbs nothing. */
    wholeAssembly: z.boolean().default(false),
    /** An intact-module move carries all members rigidly as one unit. */
    unitId: z.string().optional(),
    motionId: z.string(),
    toolId: z.string(),
    /** Presentation and hashing: direction, stroke, stop and camera note. */
    direction: vec3Schema,
    directionLabel: z.string(),
    strokeMm: z.number().finite(),
    stopLandmark: z.string(),
    cameraNote: z.string().optional(),
    /** The independently checked return for this outward stroke. */
    returnOperationId: z.string().optional(),
    /** Alternative moves that satisfy the same need carry the same group id. */
    alternativeGroup: z.string().optional(),
    /** True when this operation is itself the paired return of another. */
    isReturn: z.boolean().default(false),
    /** Exchange operations fit the like-for-like spare into a target slot. */
    fitsReplacementOf: z.string().optional(),
    estimatedSeconds: z
        .object({
            seconds: z.number().finite(),
            rowId: z.string(),
            basis: z.string(),
            coverage: z.enum(['timed', 'proxy', 'unknown'])
        })
        .optional(),
    evidence: evidenceRefSchema
});
export type Operation = z.infer<typeof operationSchema>;

/** A labelled choice set: exactly one member is normally enough. */
export const alternativeGroupSchema = z.object({
    id: z.string(),
    /** What this choice accomplishes, for the reviewer's textual list. */
    satisfies: z.string(),
    operationIds: z.array(z.string()).min(1),
    note: z.string().optional()
});
export type AlternativeGroup = z.infer<typeof alternativeGroupSchema>;

/** A function check the mechanic performs on the kit. */
export const functionCheckSchema = z.object({
    id: z.string(),
    instruction: z.string(),
    /** Which units or mechanisms the check exercises. */
    subjectUnitIds: z.array(z.string()).default([]),
    expectedBehaviour: z.string()
});
export type FunctionCheck = z.infer<typeof functionCheckSchema>;

/* ------------------------------------------------------------------- model */

/** Fingerprint of the source the model was derived from (plan 02 §3A). */
export const sourceRevisionSchema = z.object({
    datasetRevision: z.string(),
    stepSha256: z.string(),
    importerVersion: z.string(),
    tessellation: z.object({
        linearDeflection: z.number(),
        angularDeflection: z.number(),
        units: z.literal('mm')
    }),
    triangleCount: z.number().int().nonnegative()
});
export type SourceRevision = z.infer<typeof sourceRevisionSchema>;

/**
 * The immutable base the planner and reviewer both consume. `graphRevision`
 * changes when reviewed decisions change; `source` changes only with the CAD.
 */
export const assemblyModelSchema = z.object({
    schemaVersion: z.number().int().positive(),
    graphRevision: z.string(),
    source: sourceRevisionSchema,
    occurrences: z.array(occurrenceSchema),
    units: z.array(unitSchema).default([]),
    connections: z.array(connectionSchema).default([]),
    poses: z.array(poseSchema),
    tools: z.array(toolSchema),
    motions: z.array(motionSchema),
    operations: z.array(operationSchema),
    alternativeGroups: z.array(alternativeGroupSchema).default([]),
    functionChecks: z.array(functionCheckSchema).default([])
});
export type AssemblyModel = z.infer<typeof assemblyModelSchema>;

/* ------------------------------------------------------------ review patches */

export const reviewEditSchema = z.object({
    id: z.string(),
    /** The generated option or blocker this edit talks about. */
    targetOperationId: z.string().optional(),
    alternativeGroup: z.string().optional(),
    decision: z.enum(['accept', 'reject', 'add']),
    /** For 'add': the requirement this decision imposes on one move option. */
    requirement: requirementSchema.optional(),
    /** Remove a generated requirement from the option. */
    removesRequirementId: z.string().optional(),
    /** A new or corrected operation, fully authored. */
    operation: operationSchema.optional(),
    motion: motionSchema.optional(),
    reason: z.string(),
    author: z.string(),
    evidence: evidenceRefSchema
});
export type ReviewEdit = z.infer<typeof reviewEditSchema>;

export const reviewPatchSchema = z.object({
    schemaVersion: z.number().int().positive(),
    baseGraphRevision: z.string(),
    baseDatasetRevision: z.string(),
    edits: z.array(reviewEditSchema),
    note: z.string().optional()
});
export type ReviewPatch = z.infer<typeof reviewPatchSchema>;

/* -------------------------------------------------------------- search state */

export const searchBudgetSchema = z.object({
    maxExpandedStates: z.number().int().positive().default(100_000),
    /** Search may stop with a replayable incumbent rather than a proof. */
    allowIncumbent: z.boolean().default(true)
});
export type SearchBudget = z.infer<typeof searchBudgetSchema>;

/** Honest, separate reporting of what the search actually established. */
export const proofStatusSchema = z.enum([
    'proved-minimum',
    'best-route-found',
    'search-incomplete',
    'no-feasible-route'
]);
export type ProofStatus = z.infer<typeof proofStatusSchema>;

/* ------------------------------------------------------------------ repairs */

export const repairStepSchema = z.object({
    stepId: z.string(),
    ordinal: z.number().int().positive(),
    phase: phaseSchema,
    operationId: z.string(),
    heading: z.string(),
    instruction: z.string(),
    toolLabel: z.string(),
    stopLandmark: z.string(),
    directionLabel: z.string(),
    partLabel: z.string(),
    locationLabel: z.string(),
    cameraNote: z.string().optional()
});
export type RepairStep = z.infer<typeof repairStepSchema>;

/** Timing is reported with its coverage, never as a silent zero. */
export const timingSummarySchema = z.object({
    estimatedSeconds: z.number().finite().nullable(),
    timedActions: z.number().int().nonnegative(),
    totalActions: z.number().int().nonnegative(),
    basis: z.string(),
    coverage: z.enum(['complete', 'partial', 'none']),
    rowIds: z.array(z.string()).default([])
});
export type TimingSummary = z.infer<typeof timingSummarySchema>;

export const unitOutcomeSchema = z.object({
    unitId: z.string(),
    name: z.string(),
    /** 'left-in-place' never moved; 'preserved-intact' travelled rigidly. */
    outcome: z.enum(['left-in-place', 'preserved-intact', 'taken-apart', 'not-applicable']),
    memberIds: z.array(z.string()),
    reason: z.string()
});
export type UnitOutcome = z.infer<typeof unitOutcomeSchema>;

export const searchReportSchema = z.object({
    status: proofStatusSchema,
    expandedStates: z.number().int().nonnegative(),
    budget: z.number().int().positive(),
    /** The equal-count tie frontier may still be open. */
    tieFrontierComplete: z.boolean(),
    bestDisturbedCount: z.number().int().nonnegative().nullable(),
    lowerBound: z.number().int().nonnegative().nullable(),
    /** Populated for 'no-feasible-route': the first unmet requirement per option. */
    firstUnsatisfied: z
        .array(
            z.object({
                operationId: z.string(),
                requirementId: z.string(),
                subjectId: z.string(),
                reason: z.string()
            })
        )
        .default([]),
    incumbentSource: z.enum(['reference-route', 'search', 'none'])
});
export type SearchReport = z.infer<typeof searchReportSchema>;

export const replayReportSchema = z.object({
    ok: z.boolean(),
    steps: z.array(
        z.object({
            stepId: z.string(),
            operationId: z.string(),
            poseDiff: z.array(poseAssignmentSchema),
            engagedConnectionIds: z.array(z.string()),
            issues: z.array(z.string())
        })
    ),
    issues: z.array(z.string()).default([])
});
export type ReplayReport = z.infer<typeof replayReportSchema>;

export const evidenceStatusSchema = z.object({
    generated: z.boolean(),
    reviewed: z.boolean(),
    replayedAgainstModel: z.boolean(),
    minimumUnderReviewedModel: z.boolean(),
    physicallyVerified: z.boolean(),
    /** Only a linked bench record can set physicallyVerified. */
    benchRecordId: z.string().nullable(),
    /** Edits that would invalidate the linked bench record. */
    invalidations: z.array(z.string()).default([])
});
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;

/**
 * A complete repair: release, exchange, insert, restore, check. The procedure
 * fingerprint is separate from the graph revision so a dependency edit that
 * leaves the operator's actions alone keeps its physical record.
 */
export const repairSchema = z.object({
    targetIds: z.array(z.string()).min(1),
    graphRevision: z.string(),
    datasetRevision: z.string(),
    procedureFingerprint: z.string(),
    steps: z.array(repairStepSchema),
    operationIds: z.array(z.string()),
    disturbedIds: z.array(z.string()),
    disturbedCount: z.number().int().nonnegative(),
    preservedUnits: z.array(unitOutcomeSchema),
    timing: timingSummarySchema,
    search: searchReportSchema,
    replay: replayReportSchema,
    functionCheckId: z.string().nullable(),
    /** Distinct pieces the search still had to move when it stopped. */
    alternatives: z.array(z.string()).default([])
});
export type Repair = z.infer<typeof repairSchema>;

/** Everything the shipped bundle publishes for one target occurrence. */
export const manualEntrySchema = z.object({
    targetId: z.string(),
    repair: repairSchema,
    /** Present when the target has no feasible route in this catalog. */
    diagnostic: z
        .object({ code: z.string(), message: z.string(), firstUnsatisfied: z.array(z.string()) })
        .optional()
});
export type ManualEntry = z.infer<typeof manualEntrySchema>;

/** The small manifest the app revalidates on every load (plan 02 §6.7). */
export const datasetManifestSchema = z.object({
    schemaVersion: z.number().int().positive(),
    datasetRevision: z.string(),
    graphRevision: z.string(),
    source: sourceRevisionSchema,
    files: z.object({
        geometry: z.string(),
        graph: z.string(),
        manuals: z.string(),
        inventory: z.string()
    }),
    /** Content hashes let the loader refuse a mixed-revision bundle. */
    hashes: z.record(z.string(), z.string()),
    coverage: z.object({
        targets: z.number().int().nonnegative(),
        solved: z.number().int().nonnegative(),
        unresolved: z.array(z.string()).default([])
    })
});
export type DatasetManifest = z.infer<typeof datasetManifestSchema>;
