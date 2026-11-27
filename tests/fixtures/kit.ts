/**
 * Hand-worked synthetic fixtures (plan 03 §3). Short ids, controlled numbers,
 * and builders small enough to reconstruct on paper. The expected steps and
 * counts asserted beside them are authored by hand, never produced by the
 * production rule expander, cost function or candidate pruner.
 */
import type {
    AssemblyModel,
    Connection,
    Motion,
    Occurrence,
    Operation,
    Pose,
    PoseAssignment,
    Quaternion,
    Requirement,
    RigidFrame,
    SearchBudget,
    Tool,
    Unit,
    Vec3
} from '../../src/domain/schema.js';

export const IDENTITY = {
    schemaVersion: 1,
    graphRevision: 'fixture-graph-1',
    source: {
        datasetRevision: 'fixture-1',
        stepSha256: '0'.repeat(64),
        importerVersion: 'test',
        tessellation: { linearDeflection: 0.12, angularDeflection: 0.4, units: 'mm' as const },
        triangleCount: 0
    }
};

export const BUDGET: SearchBudget = { maxExpandedStates: 100_000, allowIncumbent: true };

const STRAIGHT_UP: Quaternion = [0, 0, 0, 1];

/** Fixture extraction axis is +Z; `mm` is the offset along it. */
function offset(mm: number): RigidFrame {
    return { translation: [0, 0, mm] as Vec3, rotation: STRAIGHT_UP };
}

export type PieceSpec = Readonly<{
    id: string;
    /** Installed position along the extraction axis, millimetres. */
    at?: number;
    /** Extra named poses as `name@travelMm`, e.g. `retracted-4mm@4`. */
    extraPoses?: readonly string[];
    definitionId?: string;
    commonName?: string;
    location?: string;
}>;

export type FixtureSpec = Readonly<{
    pieces: readonly PieceSpec[];
    connections?: readonly Connection[];
    units?: readonly Unit[];
    operations: readonly Operation[];
    alternativeGroups?: AssemblyModel['alternativeGroups'];
    functionChecks?: AssemblyModel['functionChecks'];
    tools?: Tool[];
}>;

const FINGERS: Tool = { id: 'fingers', name: 'Fingers', class: 'fingers', isBenchTool: true };
const PUSHER: Tool = {
    id: 'pusher',
    name: 'Spare axle used as a pusher',
    class: 'pusher',
    isBenchTool: true
};

/** Every fixture piece can be installed or fully detached. */
function posesFor(spec: PieceSpec): Pose[] {
    const at = spec.at ?? 0;
    const poses: Pose[] = [
        {
            id: `${spec.id}/installed`,
            occurrenceId: spec.id,
            kind: 'installed',
            frame: offset(at),
            curveFrame: 'assembly'
        },
        {
            id: `${spec.id}/detached`,
            occurrenceId: spec.id,
            kind: 'detached',
            frame: offset(at + 40),
            curveFrame: 'assembly'
        }
    ];
    for (const extra of spec.extraPoses ?? []) {
        const separator = extra.lastIndexOf('@');
        const name = separator < 0 ? extra : extra.slice(0, separator);
        const travel = separator < 0 ? 0 : Number(extra.slice(separator + 1));
        poses.push({
            id: `${spec.id}/${name}`,
            occurrenceId: spec.id,
            kind: name.startsWith('parked') ? 'parked' : 'retracted',
            frame: offset(at + travel),
            curveFrame: 'assembly',
            travelMm: travel,
            stopLandmark: `${name} stop`
        });
    }
    return poses;
}

function occurrenceFor(spec: PieceSpec): Occurrence {
    return {
        id: spec.id,
        definitionId: spec.definitionId ?? `def-${spec.id}`,
        definitionName: spec.definitionId ?? `def-${spec.id}`,
        parent: 'root',
        path: ['root', spec.id],
        kind: 'piece',
        installedPoseId: `${spec.id}/installed`,
        meshId: `mesh-${spec.id}`,
        typeKey: spec.definitionId ?? `def-${spec.id}`,
        commonName: spec.commonName ?? `piece ${spec.id}`,
        locationLabel: spec.location ?? `fixture position ${spec.id}`
    };
}

export function buildFixture(spec: FixtureSpec): AssemblyModel {
    const poses = spec.pieces.flatMap(posesFor);
    const occurrences: Occurrence[] = [
        {
            id: 'root',
            definitionId: 'fixture-root',
            definitionName: 'fixture-root',
            parent: null,
            path: ['root'],
            kind: 'assembly',
            installedPoseId: 'root/installed',
            meshId: null,
            typeKey: 'root',
            commonName: 'Fixture assembly',
            locationLabel: 'bench'
        },
        ...spec.pieces.map(occurrenceFor)
    ];
    poses.push({
        id: 'root/installed',
        occurrenceId: 'root',
        kind: 'installed',
        frame: offset(0),
        curveFrame: 'assembly'
    });

    const sweep = { min: [-50, -50, -50] as Vec3, max: [50, 50, 90] as Vec3 };
    const motions: Motion[] = spec.operations.map((operation) => ({
        id: operation.motionId,
        members: operation.members,
        frames: [
            { atMm: 0, frame: offset(0) },
            { atMm: Math.max(operation.strokeMm, 1), frame: offset(operation.strokeMm) }
        ],
        curveFrame: 'assembly',
        toolId: operation.toolId,
        sweep,
        allowedContacts: [],
        toleranceMm: 0.5,
        evidence: { tier: 'generated', source: 'fixture' }
    }));

    return {
        ...IDENTITY,
        occurrences: [...occurrences],
        poses: [...poses],
        connections: [...(spec.connections ?? [])],
        units: [...(spec.units ?? [])],
        tools: [FINGERS, PUSHER, ...(spec.tools ?? [])],
        motions: [...motions],
        operations: [...spec.operations],
        alternativeGroups: [...(spec.alternativeGroups ?? [])],
        functionChecks: spec.functionChecks ?? [
            {
                id: 'check-spin',
                instruction: 'Turn the rotor by hand and feel the replaced part drive it.',
                subjectUnitIds: [],
                expectedBehaviour: 'the rotor turns without binding'
            }
        ]
    };
}

/** A fixture operation with the presentation noise filled in. */
export function op(
    id: string,
    members: readonly string[],
    from: readonly PoseAssignment[],
    to: readonly PoseAssignment[],
    extra: Partial<Operation> = {}
): Operation {
    return {
        id,
        label: extra.label ?? id,
        phase: extra.phase ?? 'remove',
        members: [...members],
        from: [...from],
        to: [...to],
        requires: extra.requires ?? [],
        releasesConnectionIds: extra.releasesConnectionIds ?? [],
        establishesConnectionIds: extra.establishesConnectionIds ?? [],
        wholeAssembly: extra.wholeAssembly ?? false,
        motionId: extra.motionId ?? `motion-${id}`,
        toolId: extra.toolId ?? 'fingers',
        direction: extra.direction ?? ([0, 0, 1] as Vec3),
        directionLabel: extra.directionLabel ?? 'pull out',
        strokeMm: extra.strokeMm ?? 40,
        stopLandmark: extra.stopLandmark ?? 'clear of the assembly',
        returnOperationId: extra.returnOperationId,
        unitId: extra.unitId,
        alternativeGroup: extra.alternativeGroup,
        isReturn: extra.isReturn ?? false,
        fitsReplacementOf: extra.fitsReplacementOf,
        estimatedSeconds: extra.estimatedSeconds,
        cameraNote: extra.cameraNote,
        evidence: extra.evidence ?? { tier: 'reviewed', source: 'fixture author' }
    };
}

/** Requirement: `subject` must sit in one of `poses`. */
export function needsPose(
    id: string,
    subject: string,
    poses: readonly string[],
    reason: string,
    role: Requirement['role'] = 'blocker'
): Requirement {
    return {
        id,
        subject: { kind: 'occurrence', id: subject },
        acceptable: [...poses],
        role,
        reason,
        evidence: { tier: 'reviewed', source: 'fixture author' }
    };
}

export function connection(
    id: string,
    a: string,
    b: string,
    kind: Connection['kind'] = 'friction'
): Connection {
    return {
        id,
        a,
        b,
        kind,
        origin: [0, 0, 0] as Vec3,
        axis: [0, 0, 1] as Vec3,
        installedEngaged: true,
        evidence: { tier: 'reviewed', source: 'fixture author' }
    };
}
