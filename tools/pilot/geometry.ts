import { NodeIO } from '@gltf-transform/core';
import { Matrix4, Triangle, Vector3 } from 'three';
import { buildObstacle, clearanceAlongPath, translatePath } from '../lib/sweep.js';
import type { RigidFrame, Vec3 } from '../../src/domain/schema.js';

export const TARGET = '30465/NAUO33/NAUO39';
export const PIN = '30465/NAUO33/NAUO38';
const origin: RigidFrame = { translation: [0, 0, 0], rotation: [0, 0, 0, 1] };

/** Replay the proposed translation in world mm against the reloaded, serialized meshes. */
// One decode per immutable GLB buffer within a build/verification pass. The
// verifier reopens the file and thus cannot reuse the compiler's cached data.
const decoded=new WeakMap<Uint8Array,ReturnType<typeof decodeWorldMeshes>>();
export function readWorldMeshes(glb:Uint8Array) {
    const cached=decoded.get(glb);if(cached) return cached;
    const result=decodeWorldMeshes(glb);decoded.set(glb,result);return result;
}

async function decodeWorldMeshes(glb: Uint8Array) {
    const doc = await new NodeIO().readBinary(glb);
    return doc.getRoot().listNodes().map(node => {
        const id = String(node.getExtras().instanceId);
        const primitive = node.getMesh()!.listPrimitives()[0]!;
        const vertices = primitive.getAttribute('POSITION')!;
        const matrix = new Matrix4().fromArray(node.getWorldMatrix());
        const positions: number[] = [];
        const v = new Vector3();
        for (const i of primitive.getIndices()!.getArray()!) {
            positions.push(...v.fromArray(vertices.getElement(i, [])).applyMatrix4(matrix).multiplyScalar(1000).toArray());
        }
        const frame: RigidFrame = {
            translation: node.getWorldTranslation().map(n => n * 1000) as Vec3,
            rotation: node.getWorldRotation()
        };
        const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
        for (let i=0; i<positions.length; i++) {
            const axis = i % 3 as 0 | 1 | 2;
            min[axis] = Math.min(min[axis], positions[i]!);
            max[axis] = Math.max(max[axis], positions[i]!);
        }
        return { id, frame, positions, bounds: { min, max }, name: String(node.getExtras().partName), definitionId: String(node.getExtras().definitionId) };
    });
}

export async function checkStudGeometry(glb: Uint8Array) {
    const pieces = await readWorldMeshes(glb);
    const stud = pieces.find(p => p.id === TARGET)!;
    const pin = pieces.find(p => p.id === PIN)!;
    const xs = (positions: number[]) => positions.filter((_, i) => i % 3 === 0);
    // Towards the exposed pin end (-X). Leave 4 mm of visible air past the pin tip.
    const travel = Math.max(...xs(stud.positions)) - Math.min(...xs(pin.positions)) + 4;
    if (!(travel > 5 && travel < 6)) throw new Error('Light stud axial fit changed');
    const direction: Vec3 = [-1, 0, 0];
    const removal = translatePath(direction, origin, travel, 0.25);
    const insertion = translatePath([1, 0, 0], removal.at(-1)!.frame, travel, 0.25);
    // Continuous clearance of the mating pair. The shoulder touches the stud at
    // the installed end only. Between shoulder and tip, the pin must fit inside
    // the actual polygonal bore throughout the stroke, not just at its endpoints.
    const [seat, cy, cz] = pin.frame.translation;
    const tip = Math.min(...xs(pin.positions));
    const tol = 1e-5; // mm, roundoff of the serialized seat plane
    if (Math.max(...xs(stud.positions)) > seat + tol) throw new Error('Stud crosses pin shoulder');
    let radius = 0;
    for (let i = 0; i < pin.positions.length; i += 9) {
        const tri = pin.positions.slice(i, i + 9);
        if (Math.min(...xs(tri)) >= seat - tol) continue;
        for (let j = 0; j < 9; j += 3) radius = Math.max(radius, Math.hypot(tri[j+1]! - cy, tri[j+2]! - cz));
    }
    let bore = Infinity;
    for (let i = 0; i < stud.positions.length; i += 9) {
        const tri = stud.positions.slice(i, i + 9);
        if (Math.max(...xs(tri)) < tip - tol) continue; // floor moves away from the tip
        const [a,b,c] = [0,3,6].map(j => new Vector3(0, tri[j+1]! - cy, tri[j+2]! - cz));
        const triangle = new Triangle(a!, b!, c!);
        // Cylindrical wall triangles project to line segments.
        const points = [a!, b!, c!];
        for (let j=0; j<3; j++) {
            const p = points[j]!, delta = points[(j+1)%3]!.clone().sub(p);
            const t = Math.max(0, Math.min(1, -p.dot(delta)/(delta.lengthSq() || 1)));
            bore = Math.min(bore, p.clone().addScaledVector(delta,t).length());
        }
        if (triangle.getArea() > 1e-12 && triangle.containsPoint(new Vector3())) bore = 0;
    }
    if (!Number.isFinite(bore) || radius === 0 || radius - bore > 0.06) {
        throw new Error(`Interference exceeds the light stud's modeled friction-fit allowance: ${radius} / ${bore} mm`);
    }
    for (const other of pieces.filter(p => p !== stud)) {
        if (other === pin) continue; // analytically bounded above for both directions
        const obstacle = buildObstacle(other, origin);
        for (const [phase, path] of [['removal', removal], ['insertion', insertion]] as const) {
            const hit = clearanceAlongPath(stud, path, obstacle);
            if (hit.status !== 'clear') throw new Error(`${phase} ${other.id}: ${JSON.stringify(hit)}`);
        }
    }
    return { travel, radialClearance: bore - radius, pieces: pieces.map(({ positions: _, ...piece }) => piece) };
}
