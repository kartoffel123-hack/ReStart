/**
 * Generate the STEP-derived connection Degrees-of-Freedom (Freiheitsgrade / DOF) catalog.
 *
 * Reads the pinned STEP assembly through `buildImportPackage`, derives kinematic DOF
 * for every confirmed joint and every physical piece, validates against
 * `connectionDofCatalogSchema`, and writes:
 *   - `data/review/connection-dof.json` (human-readable review & calculation baseline)
 *   - `public/models/30465/pilot/connection-dof.json` (served to the browser `#/graph` view)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { buildImportPackage } from '../import/build-package.js';
import {
    computeGlobalDofFlags,
    connectionDofCatalogSchema,
    isAxisParallel,
    type ConnectionDof,
    type ConnectionDofCatalog,
    type KinematicType,
    type PieceDofSummary
} from '../../src/domain/dof.js';
import type { Vec3 } from '../../src/domain/schema.js';
import type { Joint } from '../lib/joints.js';

const STEP_PATH =
    'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';

function toMutableVec3(v: readonly [number, number, number]): Vec3 {
    return [v[0], v[1], v[2]];
}

function classifyJointDof(
    joint: Joint,
    nameA: string,
    nameB: string
): {
    kinematicType: KinematicType;
    translationAxes: Vec3[];
    rotationAxes: Vec3[];
    note: string;
} {
    const axis = toMutableVec3(joint.axis);
    const combined = `${nameA} ${nameB}`.toLowerCase();

    if (joint.kind === 'axle-bore') {
        const locksRotation =
            combined.includes('axle hole') ||
            combined.includes('bush') ||
            combined.includes('gear') ||
            combined.includes('rotor') ||
            combined.includes('cross') ||
            combined.includes('axle joint');

        if (locksRotation) {
            return {
                kinematicType: 'prismatic',
                translationAxes: [axis],
                rotationAxes: [],
                note: 'Cross-axle fit: 1 translational DOF along axis, axial rotation locked by cross profile.'
            };
        }
        return {
            kinematicType: 'cylindrical',
            translationAxes: [axis],
            rotationAxes: [axis],
            note: 'Axle in round bore: 1 translational DOF and 1 rotational DOF along axis.'
        };
    }

    if (joint.kind === 'pin-hole' || joint.kind === 'stud-tube' || joint.kind === 'friction') {
        return {
            kinematicType: 'cylindrical',
            translationAxes: [axis],
            rotationAxes: [axis],
            note:
                joint.radii.length > 1
                    ? 'Stepped cylindrical fit: 1 translational DOF along axis (verify flange/stop direction) and 1 rotational DOF.'
                    : 'Cylindrical pin/bore fit: 1 translational DOF and 1 rotational DOF along axis.'
        };
    }

    return {
        kinematicType: 'cylindrical',
        translationAxes: [axis],
        rotationAxes: [axis],
        note: `Generated from STEP ${joint.kind} interface: 1 translational DOF along canonical axis.`
    };
}

export async function generateConnectionDofCatalog(): Promise<ConnectionDofCatalog> {
    const input = await buildImportPackage(STEP_PATH);
    const nameById = new Map<string, string>();
    for (const piece of input.catalog.pieces) {
        nameById.set(piece.id, piece.name);
    }

    const connections: ConnectionDof[] = input.catalog.joints.map((joint) => {
        const [a, b] = joint.pieces;
        const nameA = nameById.get(a) ?? a;
        const nameB = nameById.get(b) ?? b;
        const classified = classifyJointDof(joint, nameA, nameB);
        const globalAxes = computeGlobalDofFlags(
            classified.translationAxes,
            classified.rotationAxes
        );

        return {
            connectionId: joint.id,
            pieces: [a, b],
            pieceNames: [nameA, nameB],
            kind: joint.kind,
            kinematicType: classified.kinematicType,
            axis: toMutableVec3(joint.axis),
            origin: toMutableVec3(joint.origin),
            releaseDirections: [
                toMutableVec3(joint.releaseDirections[0]),
                toMutableVec3(joint.releaseDirections[1])
            ],
            dof: {
                total: classified.translationAxes.length + classified.rotationAxes.length,
                translational: classified.translationAxes.length,
                rotational: classified.rotationAxes.length,
                translationAxes: classified.translationAxes,
                rotationAxes: classified.rotationAxes
            },
            globalAxes,
            engagementMm: Number(joint.engagementMm.toFixed(4)),
            spanMm: [Number(joint.spanMm[0].toFixed(4)), Number(joint.spanMm[1].toFixed(4))],
            holderSpanMm: [
                Number(joint.holderSpanMm[0].toFixed(4)),
                Number(joint.holderSpanMm[1].toFixed(4))
            ],
            steppedFit: joint.radii.length > 1,
            stepFaceEntities: [
                ...new Set(joint.faces.flatMap((f) => [f.maleEntityId, f.femaleEntityId]))
            ].sort(),
            note: classified.note
        };
    });

    const pieces: PieceDofSummary[] = input.catalog.pieces.map((piece) => {
        const touching = connections.filter(
            (c) => c.pieces[0] === piece.id || c.pieces[1] === piece.id
        );
        const distinctAxes: Vec3[] = [];
        for (const conn of touching) {
            for (const axis of conn.dof.translationAxes) {
                if (!distinctAxes.some((existing) => isAxisParallel(existing, axis))) {
                    distinctAxes.push(axis);
                }
            }
        }
        const remainingTranslationalDof =
            touching.length === 0 ? 3 : distinctAxes.length === 1 ? 1 : 0;
        const status =
            remainingTranslationalDof === 3
                ? 'kinematically-free'
                : remainingTranslationalDof === 1
                  ? 'axial-slide'
                  : 'kinematically-locked';

        return {
            pieceId: piece.id,
            commonName: piece.name,
            connectionIds: touching.map((c) => c.connectionId),
            distinctAxes,
            remainingTranslationalDof,
            status
        };
    });

    return connectionDofCatalogSchema.parse({
        schema: 'restart.connection-dof/1',
        sourceStepSha256: input.report.source.sha256,
        generatedFrom: STEP_PATH,
        units: 'mm',
        axisParallelTolerance: 0.995,
        connections,
        pieces
    });
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/dof/run.ts');
if (isMain) {
    const catalog = await generateConnectionDofCatalog();
    const json = JSON.stringify(catalog, null, 2) + '\n';
    await mkdir('data/review', { recursive: true });
    await mkdir('public/models/30465/pilot', { recursive: true });
    await writeFile('data/review/connection-dof.json', json, 'utf8');
    await writeFile('public/models/30465/pilot/connection-dof.json', json, 'utf8');

    const locked = catalog.pieces.filter((p) => p.status === 'kinematically-locked').length;
    const axial = catalog.pieces.filter((p) => p.status === 'axial-slide').length;
    const free = catalog.pieces.filter((p) => p.status === 'kinematically-free').length;
    console.log(
        `DOF catalog written: ${catalog.connections.length} connections, ${catalog.pieces.length} pieces ` +
            `(locked: ${locked}, axial-slide: ${axial}, free: ${free})`
    );
}
