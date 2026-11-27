/**
 * Pure kinematic Degrees-of-Freedom (Freiheitsgrade / DOF) schema and solver.
 *
 * Derived build-side from the pinned STEP assembly (`tools/dof/run.ts`) and consumed
 * by the browser dependency-graph view to compute — for each of the 70 parts — which
 * other parts must be removed to free the target and in which reverse order to
 * reassemble the helicopter afterward.
 *
 * `src/domain` is pure: no DOM, no fetch, no renderer, no clock, no storage.
 */
import { z } from 'zod';
import { connectionKindSchema, vec3Schema, type ConnectionKind, type Vec3 } from './schema.js';

export const kinematicTypeSchema = z.enum([
    'prismatic',
    'cylindrical',
    'revolute',
    'planar',
    'fixed'
]);
export type KinematicType = z.infer<typeof kinematicTypeSchema>;

export const globalDofFlagsSchema = z.object({
    tx: z.boolean(),
    ty: z.boolean(),
    tz: z.boolean(),
    rx: z.boolean(),
    ry: z.boolean(),
    rz: z.boolean()
});
export type GlobalDofFlags = z.infer<typeof globalDofFlagsSchema>;

export const connectionDofSchema = z.object({
    connectionId: z.string(),
    pieces: z.tuple([z.string(), z.string()]),
    pieceNames: z.tuple([z.string(), z.string()]),
    kind: connectionKindSchema,
    kinematicType: kinematicTypeSchema,
    /** Canonical unit axis of the joint in assembly coordinates. */
    axis: vec3Schema,
    /** Point on the joint axis closest to the assembly origin (mm). */
    origin: vec3Schema,
    releaseDirections: z.tuple([vec3Schema, vec3Schema]),
    dof: z.object({
        total: z.number().int().min(0).max(6),
        translational: z.number().int().min(0).max(3),
        rotational: z.number().int().min(0).max(3),
        translationAxes: z.array(vec3Schema),
        rotationAxes: z.array(vec3Schema)
    }),
    globalAxes: globalDofFlagsSchema,
    engagementMm: z.number().nonnegative(),
    spanMm: z.tuple([z.number(), z.number()]),
    holderSpanMm: z.tuple([z.number(), z.number()]),
    steppedFit: z.boolean(),
    stepFaceEntities: z.array(z.string()),
    note: z.string()
});
export type ConnectionDof = z.infer<typeof connectionDofSchema>;

export const pieceDofSummarySchema = z.object({
    pieceId: z.string(),
    commonName: z.string(),
    connectionIds: z.array(z.string()),
    distinctAxes: z.array(vec3Schema),
    remainingTranslationalDof: z.number().int().min(0).max(3),
    status: z.enum(['kinematically-free', 'axial-slide', 'kinematically-locked'])
});
export type PieceDofSummary = z.infer<typeof pieceDofSummarySchema>;

export const connectionDofCatalogSchema = z.object({
    schema: z.literal('restart.connection-dof/1'),
    sourceStepSha256: z.string(),
    generatedFrom: z.string(),
    units: z.literal('mm'),
    axisParallelTolerance: z.number().positive(),
    connections: z.array(connectionDofSchema),
    pieces: z.array(pieceDofSummarySchema)
});
export type ConnectionDofCatalog = z.infer<typeof connectionDofCatalogSchema>;

const AXIS_PARALLEL_COS = 0.995;

export function dotVec3(a: readonly number[], b: readonly number[]): number {
    return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

export function isAxisParallel(a: readonly number[], b: readonly number[]): boolean {
    const lenA = Math.hypot(a[0]!, a[1]!, a[2]!);
    const lenB = Math.hypot(b[0]!, b[1]!, b[2]!);
    if (lenA < 1e-9 || lenB < 1e-9) return false;
    return Math.abs(dotVec3(a, b) / (lenA * lenB)) >= AXIS_PARALLEL_COS;
}

export function formatAxisLabel(axis: readonly number[]): string {
    const ax = Math.abs(axis[0]!);
    const ay = Math.abs(axis[1]!);
    const az = Math.abs(axis[2]!);
    if (ax > 0.98 && ay < 0.05 && az < 0.05) return axis[0]! >= 0 ? '+X' : '-X';
    if (ay > 0.98 && ax < 0.05 && az < 0.05) return axis[1]! >= 0 ? '+Y' : '-Y';
    if (az > 0.98 && ax < 0.05 && ay < 0.05) return axis[2]! >= 0 ? '+Z' : '-Z';
    return `[${axis.map((v) => v.toFixed(2)).join(', ')}]`;
}

/**
 * Does `connection` permit rigid translation along `direction`?
 * A connection permits translation along `direction` iff at least one of its
 * allowed `translationAxes` is parallel to `direction`.
 */
export function connectionAllowsTranslation(
    connection: ConnectionDof,
    direction: readonly number[]
): boolean {
    return connection.dof.translationAxes.some((allowed) => isAxisParallel(allowed, direction));
}

/**
 * Return all connections touching `pieceId` whose DOF block translation along `direction`.
 */
export function dofBlockingConnections(
    pieceId: string,
    direction: readonly number[],
    connections: readonly ConnectionDof[]
): readonly ConnectionDof[] {
    return connections.filter(
        (conn) =>
            (conn.pieces[0] === pieceId || conn.pieces[1] === pieceId) &&
            !connectionAllowsTranslation(conn, direction)
    );
}

export type ConnectionTimingRule = Readonly<{
    kind: ConnectionKind;
    seconds: number;
    mtmRowId: string;
    mtmLabel: string;
}>;

/**
 * Challenge-assumption MTM timing defaults per connection kind, mapped from
 * `assets/siemens-provided/MTM_Mapping_Connection_V3.xlsx` (`Vorschlag_2_Raster`).
 * These are fictitious challenge assumptions, never measured disassembly times.
 */
export const MTM_TIMING_PROVENANCE =
    'Challenge-Annahme: fiktive MTM-Basiswerte aus MTM_Mapping_Connection_V3.xlsx × Faktor 2 (Lösen) sowie Praxis-Kalibrierung für kompletten Zusammenbau ≈ 15 min (keine gemessenen Einzelzeiten).';

/**
 * Calibration factor for reassembly relative to disassembly:
 * With 84 connections (378 s disassembly at 2× MTM), factor 2.38 calibrates full
 * helicopter reassembly to ~900 s (15 minutes), matching physical build experience.
 */
export const DEFAULT_REASSEMBLY_FACTOR = 2.38;

export const DEFAULT_CONNECTION_TIMING: Readonly<Record<ConnectionKind, ConnectionTimingRule>> = {
    'pin-hole': {
        kind: 'pin-hole',
        seconds: 6,
        mtmRowId: 'ST-mittel ×2',
        mtmLabel: 'Steckverbindung / Bolzen (Ineinanderschieben 4.1.3, Faktor ×2)'
    },
    'axle-bore': {
        kind: 'axle-bore',
        seconds: 4,
        mtmRowId: 'ST-klein ×2',
        mtmLabel: 'Steckverbindung / Spielpassung (Ineinanderschieben 4.1.3, Faktor ×2)'
    },
    'stud-tube': {
        kind: 'stud-tube',
        seconds: 6,
        mtmRowId: 'CL-mikro ×2',
        mtmLabel: 'Schnappverbindung / Mikro-Clip (4.1.6, Faktor ×2)'
    },
    friction: {
        kind: 'friction',
        seconds: 6,
        mtmRowId: 'ST-mittel ×2',
        mtmLabel: 'Steckverbindung / Reibpassung (4.1.3, Faktor ×2)'
    },
    clip: {
        kind: 'clip',
        seconds: 6,
        mtmRowId: 'CL-std ×2',
        mtmLabel: 'Schnappverbindung / Standard-Clip (4.1.6, Faktor ×2)'
    },
    'gear-mesh': {
        kind: 'gear-mesh',
        seconds: 2,
        mtmRowId: 'EL-dicht-s ×2',
        mtmLabel: 'Einlegen / Auflegen (4.1.2, Faktor ×2)'
    },
    other: {
        kind: 'other',
        seconds: 4,
        mtmRowId: 'ST-klein ×2',
        mtmLabel: 'Steckverbindung allgemein (4.1.3, Faktor ×2)'
    }
};

export type ConnectionTimingOverrides = Partial<Readonly<Record<ConnectionKind, number>>>;

export type ConnectionTypeTimingRow = Readonly<{
    kind: ConnectionKind;
    count: number;
    secondsPerConnection: number;
    totalReleaseSeconds: number;
    totalReassemblySeconds: number;
    totalRoundTripSeconds: number;
    mtmRowId: string;
    mtmLabel: string;
}>;

export type PieceTimingRow = Readonly<{
    pieceId: string;
    commonName: string;
    connectionCount: number;
    directReleaseSeconds: number;
    directReassemblySeconds: number;
    directRoundTripSeconds: number;
}>;

export type DofTimingSummary = Readonly<{
    challengeAssumption: true;
    provenance: string;
    reassemblyFactor: number;
    byType: readonly ConnectionTypeTimingRow[];
    byPiece: readonly PieceTimingRow[];
    totalConnections: number;
    totalReleaseSeconds: number;
    totalReassemblySeconds: number;
    totalRoundTripSeconds: number;
}>;

export function secondsForConnectionKind(
    kind: ConnectionKind,
    overrides?: ConnectionTimingOverrides
): number {
    const custom = overrides?.[kind];
    if (custom !== undefined && Number.isFinite(custom) && custom >= 0) {
        return custom;
    }
    return DEFAULT_CONNECTION_TIMING[kind].seconds;
}

export function computeDofTimingSummary(
    catalog: ConnectionDofCatalog,
    overrides?: ConnectionTimingOverrides,
    reassemblyFactor: number = DEFAULT_REASSEMBLY_FACTOR
): DofTimingSummary {
    const factor =
        Number.isFinite(reassemblyFactor) && reassemblyFactor >= 0
            ? reassemblyFactor
            : DEFAULT_REASSEMBLY_FACTOR;

    const countByKind = new Map<ConnectionKind, number>();
    for (const conn of catalog.connections) {
        countByKind.set(conn.kind, (countByKind.get(conn.kind) ?? 0) + 1);
    }

    const byType: ConnectionTypeTimingRow[] = [...countByKind.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([kind, count]) => {
            const rule = DEFAULT_CONNECTION_TIMING[kind];
            const sec = secondsForConnectionKind(kind, overrides);
            const totalReleaseSeconds = Number((count * sec).toFixed(2));
            const totalReassemblySeconds = Number((totalReleaseSeconds * factor).toFixed(2));
            return {
                kind,
                count,
                secondsPerConnection: sec,
                totalReleaseSeconds,
                totalReassemblySeconds,
                totalRoundTripSeconds: Number(
                    (totalReleaseSeconds + totalReassemblySeconds).toFixed(2)
                ),
                mtmRowId: rule.mtmRowId,
                mtmLabel: rule.mtmLabel
            };
        });

    const connById = new Map(catalog.connections.map((c) => [c.connectionId, c]));
    const byPiece: PieceTimingRow[] = catalog.pieces.map((piece) => {
        let directReleaseSeconds = 0;
        for (const cid of piece.connectionIds) {
            const conn = connById.get(cid);
            if (!conn) continue;
            directReleaseSeconds += secondsForConnectionKind(conn.kind, overrides);
        }
        directReleaseSeconds = Number(directReleaseSeconds.toFixed(2));
        const directReassemblySeconds = Number((directReleaseSeconds * factor).toFixed(2));
        return {
            pieceId: piece.pieceId,
            commonName: piece.commonName,
            connectionCount: piece.connectionIds.length,
            directReleaseSeconds,
            directReassemblySeconds,
            directRoundTripSeconds: Number(
                (directReleaseSeconds + directReassemblySeconds).toFixed(2)
            )
        };
    });

    const totalReleaseSeconds = Number(
        byType.reduce((sum, row) => sum + row.totalReleaseSeconds, 0).toFixed(2)
    );
    const totalReassemblySeconds = Number(
        byType.reduce((sum, row) => sum + row.totalReassemblySeconds, 0).toFixed(2)
    );

    return {
        challengeAssumption: true,
        provenance: MTM_TIMING_PROVENANCE,
        reassemblyFactor: factor,
        byType,
        byPiece,
        totalConnections: catalog.connections.length,
        totalReleaseSeconds,
        totalReassemblySeconds,
        totalRoundTripSeconds: Number((totalReleaseSeconds + totalReassemblySeconds).toFixed(2))
    };
}

/**
 * Classify global X/Y/Z translational and rotational DOF flags from allowed axes.
 */
export function computeGlobalDofFlags(
    translationAxes: readonly Vec3[],
    rotationAxes: readonly Vec3[]
): GlobalDofFlags {
    const X: Vec3 = [1, 0, 0];
    const Y: Vec3 = [0, 1, 0];
    const Z: Vec3 = [0, 0, 1];
    return {
        tx: translationAxes.some((a) => isAxisParallel(a, X)),
        ty: translationAxes.some((a) => isAxisParallel(a, Y)),
        tz: translationAxes.some((a) => isAxisParallel(a, Z)),
        rx: rotationAxes.some((a) => isAxisParallel(a, X)),
        ry: rotationAxes.some((a) => isAxisParallel(a, Y)),
        rz: rotationAxes.some((a) => isAxisParallel(a, Z))
    };
}
