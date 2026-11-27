/**
 * Ticket 1 · V01 · GLB export (plan 02 §3A.5, plan 03 §4 V01 last bullet).
 *
 * The kernel hands over each mesh already sitting at its installed place. Shipping that
 * verbatim would leave the browser unable to move a piece without rewriting vertex buffers,
 * so every occurrence gets its own glTF node: the vertices are transformed back into the
 * part frame once, and the installed pose becomes the node transform. Positions and
 * translations convert millimetres → metres; the node transform is metres + quaternion.
 *
 * The source axis convention is preserved rather than baked into the geometry, because the
 * V01 landmarks are stated in source axes (the stage 1 axle at [0, 0, 0.032] m, the paired
 * blades near 0.0475 m on Y). A viewer that wants a different up axis adds its own display
 * root; the asset stays comparable to the STEP witnesses.
 */
import { Document, NodeIO, type Accessor, type Node } from '@gltf-transform/core';
import type { Crosswalk } from './crosswalk.js';
import { IDENTITY_PLACEMENT, type Occurrence, type Placement, type Vec3 } from './step-tree.js';
import type { TessellatedMesh } from './step-meshes.js';

export const MILLIMETRES_PER_METRE = 1000;

function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Columns of the frame are its axes, so the inverse is the transpose. */
function applyInverse(placement: Placement, point: Vec3): Vec3 {
    const delta: Vec3 = [
        point[0] - placement.translation[0],
        point[1] - placement.translation[1],
        point[2] - placement.translation[2]
    ];
    return [dot(placement.xAxis, delta), dot(placement.yAxis, delta), dot(placement.zAxis, delta)];
}

function applyDirection(placement: Placement, vector: Vec3): Vec3 {
    return [
        placement.xAxis[0] * vector[0] + placement.yAxis[0] * vector[1] + placement.zAxis[0] * vector[2],
        placement.xAxis[1] * vector[0] + placement.yAxis[1] * vector[1] + placement.zAxis[1] * vector[2],
        placement.xAxis[2] * vector[0] + placement.yAxis[2] * vector[1] + placement.zAxis[2] * vector[2]
    ];
}

/** Unit quaternion `[x, y, z, w]` for a right-handed orthonormal frame. */
export function quaternionFromFrame(placement: Placement): readonly [number, number, number, number] {
    const x = placement.xAxis;
    const y = placement.yAxis;
    const z = placement.zAxis;
    const m00 = x[0], m01 = y[0], m02 = z[0];
    const m10 = x[1], m11 = y[1], m12 = z[1];
    const m20 = x[2], m21 = y[2], m22 = z[2];
    const trace = m00 + m11 + m22;
    if (trace > 0) {
        const scale = Math.sqrt(1 + trace) * 2;
        return [(m21 - m12) / scale, (m02 - m20) / scale, (m10 - m01) / scale, 0.25 * scale];
    }
    if (m00 > m11 && m00 > m22) {
        const scale = Math.sqrt(1 + m00 - m11 - m22) * 2;
        return [0.25 * scale, (m01 + m10) / scale, (m02 + m20) / scale, (m21 - m12) / scale];
    }
    if (m11 > m22) {
        const scale = Math.sqrt(1 + m11 - m00 - m22) * 2;
        return [(m01 + m10) / scale, 0.25 * scale, (m12 + m21) / scale, (m02 - m20) / scale];
    }
    const scale = Math.sqrt(1 + m22 - m00 - m11) * 2;
    return [(m02 + m20) / scale, (m12 + m21) / scale, 0.25 * scale, (m10 - m01) / scale];
}

function metres(placement: Placement): [number, number, number] {
    return placement.translation.map((value) => value / MILLIMETRES_PER_METRE) as [number, number, number];
}

function indexAccessorFor(document: Document, triangles: readonly number[], vertexCount: number): Accessor {
    const array = vertexCount > 65535 ? new Uint32Array(triangles) : new Uint16Array(triangles);
    if (array instanceof Uint16Array) {
        const overflow = triangles.some((value) => value > 65535);
        if (overflow) throw new Error('index values exceed 16 bits while the vertex count fits');
    }
    return document.createAccessor().setType('SCALAR').setArray(array);
}

/** Build the release GLB: one node per occurrence, geometry in the part frame. */
export async function buildAssemblyGlb(
    occurrences: readonly Occurrence[],
    meshes: readonly TessellatedMesh[],
    crosswalk: Crosswalk
): Promise<Uint8Array> {
    const document = new Document();
    const buffer = document.createBuffer('restart');
    const scene = document.createScene('30465');

    for (const occurrence of occurrences) {
        const match = crosswalk.byOccurrence.get(occurrence.id);
        if (!match) {
            throw new Error(`occurrence ${occurrence.id} has no crosswalked mesh; refusing to export a partial model`);
        }
        const mesh = meshes[match.meshIndex] as TessellatedMesh;
        const world: Placement = occurrence.worldPlacement;

        const positions = new Float32Array(mesh.positions.length);
        for (let offset = 0; offset + 2 < mesh.positions.length; offset += 3) {
            const point: Vec3 = [
                mesh.positions[offset] as number,
                mesh.positions[offset + 1] as number,
                mesh.positions[offset + 2] as number
            ];
            const local = applyInverse(world, point);
            positions[offset] = local[0] / MILLIMETRES_PER_METRE;
            positions[offset + 1] = local[1] / MILLIMETRES_PER_METRE;
            positions[offset + 2] = local[2] / MILLIMETRES_PER_METRE;
        }

        const primitive = document
            .createPrimitive()
            .setAttribute(
                'POSITION',
                document.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer)
            )
            .setIndices(indexAccessorFor(document, mesh.triangles, mesh.positions.length / 3).setBuffer(buffer));

        if (mesh.normals) {
            const normals = new Float32Array(mesh.normals.length);
            for (let offset = 0; offset + 2 < mesh.normals.length; offset += 3) {
                const vector: Vec3 = [
                    mesh.normals[offset] as number,
                    mesh.normals[offset + 1] as number,
                    mesh.normals[offset + 2] as number
                ];
                const rotated = applyInverse(world, applyDirection(IDENTITY_PLACEMENT, vector));
                normals[offset] = rotated[0];
                normals[offset + 1] = rotated[1];
                normals[offset + 2] = rotated[2];
            }
            primitive.setAttribute(
                'NORMAL',
                document.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer)
            );
        }

        const gltfMesh = document.createMesh(occurrence.id).addPrimitive(primitive);
        const node: Node = document
            .createNode(occurrence.id)
            .setMesh(gltfMesh)
            .setTranslation(metres(world))
            .setRotation([...quaternionFromFrame(world)] as [number, number, number, number])
            .setExtras({
                instanceId: occurrence.id,
                definitionId: occurrence.definitionId,
                partName: occurrence.name,
                units: 'metres',
                sourceUnits: 'millimetres'
            });
        scene.addChild(node);
    }

    document.getRoot().setDefaultScene(scene);
    return new NodeIO().writeBinary(document);
}

export type GlbInstance = Readonly<{
    instanceId: string;
    translation: readonly [number, number, number];
    boundsMin: readonly [number, number, number];
    boundsMax: readonly [number, number, number];
    triangleCount: number;
}>;

export type GlbReport = Readonly<{
    instances: readonly GlbInstance[];
    /** Instance IDs that appear more than once, or nodes without an `instanceId`. */
    problems: readonly string[];
}>;

/** Reload with the real loader and report each instance in world metres. */
export async function inspectAssemblyGlb(bytes: Uint8Array): Promise<GlbReport> {
    const document = await new NodeIO().readBinary(bytes);
    const instances: GlbInstance[] = [];
    const problems: string[] = [];
    const seen = new Map<string, number>();

    for (const node of document.getRoot().listNodes()) {
        const extras = node.getExtras() as { instanceId?: unknown } | undefined;
        const instanceId = typeof extras?.instanceId === 'string' ? extras.instanceId : undefined;
        if (instanceId === undefined) {
            problems.push(`node ${JSON.stringify(node.getName())} has no extras.instanceId`);
            continue;
        }
        seen.set(instanceId, (seen.get(instanceId) ?? 0) + 1);

        const translation = node.getTranslation();
        const rotation = node.getRotation();
        if (![...translation, ...rotation].every((value) => Number.isFinite(value))) {
            problems.push(`${instanceId} has a non-finite transform`);
        }

        const min: [number, number, number] = [Infinity, Infinity, Infinity];
        const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
        let triangles = 0;
        const mesh = node.getMesh();
        if (!mesh) {
            problems.push(`${instanceId} resolved no mesh`);
        }
        for (const primitive of mesh?.listPrimitives() ?? []) {
                triangles += (primitive.getIndices()?.getArray()?.length ?? 0) / 3;
                const position = primitive.getAttribute('POSITION');
                if (!position) {
                    problems.push(`${instanceId} has a primitive without positions`);
                    continue;
                }
                const lower = position.getMin([]);
                const upper = position.getMax([]);
                for (let axis = 0; axis < 3; axis += 1) {
                    const localMin = lower?.[axis];
                    const localMax = upper?.[axis];
                    if (localMin === undefined || localMax === undefined) {
                        problems.push(`${instanceId} has a primitive without usable bounds`);
                        continue;
                    }
                    // Conservative world extent: translate, then widen by the full local span
                    // so a rotation cannot make the check claim a tighter box than reality.
                    const centre = (localMin + localMax) / 2 + (translation[axis] as number);
                    const half = (localMax - localMin) / 2;
                    if (centre - half < (min[axis] as number)) min[axis] = centre - half;
                    if (centre + half > (max[axis] as number)) max[axis] = centre + half;
                }
        }
        if (triangles === 0) problems.push(`${instanceId} resolved no triangles`);
        for (let axis = 0; axis < 3; axis += 1) {
            if ((max[axis] as number) - (min[axis] as number) <= 0) {
                problems.push(`${instanceId} has a non-positive extent on axis ${axis}`);
            }
        }
        instances.push({
            instanceId,
            translation: [translation[0] as number, translation[1] as number, translation[2] as number],
            boundsMin: min,
            boundsMax: max,
            triangleCount: triangles
        });
    }

    for (const [instanceId, count] of seen) {
        if (count > 1) problems.push(`${instanceId} resolved to ${count} nodes, expected exactly 1`);
    }
    instances.sort((a, b) => (a.instanceId < b.instanceId ? -1 : 1));
    return { instances, problems };
}
