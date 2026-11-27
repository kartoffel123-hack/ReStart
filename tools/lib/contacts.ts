/**
 * Confirming a mating interface by face contact (plan 02 §3C step 4, ticket 5 · V02).
 *
 * `tools/lib/interfaces.ts` pairs cylindrical faces that are coaxial and matched in radius, and
 * says so plainly: on this snapshot that is 8,102 candidates for a 70-piece assembly, because
 * two empty bores on one line satisfy the rule as well as a joint does. This file decides which
 * of them are joints by asking the only witness that cannot be fooled by an untrimmed surface —
 * do the triangles of these two faces actually touch?
 *
 * The answer also gives what the surface geometry cannot. A `CYLINDRICAL_SURFACE` is infinite;
 * the triangles know where the material stops. The axial span over which the two faces are in
 * contact is the engagement, and the engagement is what a release stroke has to overcome.
 *
 * Tolerances are stated, not implied: 0.1 mm is the plan's initial pose tolerance and decides
 * joint-or-not, and 0.05 mm decides whether a triangle belongs to the cylindrical face at all,
 * which is looser than the 0.12 mm tessellation deflection needs because a chord's endpoints sit
 * on the surface while its middle does not.
 *
 * Touching is necessary but not sufficient. Two bores on one line and two axles end to end on
 * one line both have surfaces that meet at the same radius, and on this snapshot they are 78 % of
 * the candidates. A joint needs one face whose material lies outside the cylinder — a bore — and
 * one whose material lies inside it — a shaft. Which side the material is on is read from the
 * winding of the face's own triangles, so no extra input is consulted.
 */
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { TessellatedMesh } from './step-meshes.js';
import type { MatingInterface, WorldFace } from './interfaces.js';
import type { Vec3 } from './step-tree.js';

/**
 * One piece's surface in assembly coordinates.
 *
 * `positions` are shared vertices and `indices` reference them, exactly as the tessellator and
 * {@link TessellatedMesh} deliver them. Which triangles belong to a face is a question about
 * topology, so it can only be answered through the indices: reading `positions` three vertices
 * at a time groups arbitrary neighbours into shapes that are not triangles of the piece.
 */
export type WorldMesh = Readonly<{
    occurrenceId: string;
    /** Millimetres, assembly coordinates. Flat xyz triplets, shared between triangles. */
    positions: readonly number[];
    /** Vertex indices, flat triplets. */
    indices: readonly number[];
}>;

/** Adapt a tessellated mesh plus the occurrence that claimed it. */
export function worldMesh(occurrenceId: string, mesh: TessellatedMesh): WorldMesh {
    return { occurrenceId, positions: mesh.positions, indices: mesh.triangles };
}

export type ContactOptions = Readonly<{
    /** Distance at or under which the two faces are a joint. Default 0.1 mm. */
    toleranceMm?: number;
    /** How far a vertex may leave the cylinder and still belong to that face. Default 0.05 mm. */
    surfaceToleranceMm?: number;
    /**
     * Engagement below this is not evidence of a joint, because the tessellation cannot resolve
     * contact that fine. Defaults to the 0.12 mm linear deflection the mesh was built at.
     */
    engagementFloorMm?: number;
}>;

export type ConfirmedInterface = Readonly<{
    source: MatingInterface;
    /** Closest approach of the two faces' triangles, millimetres. */
    contactMm: number;
    /** Axial span over which they are in contact: how much of the two pieces runs together. */
    engagementMm: number;
    /** Contact extent along the release axis, as [near, far] projections in millimetres. */
    contactSpanMm: readonly [number, number];
    /**
     * The holder's own full extent along the axis, in the same interface frame as `contactSpanMm`.
     *
     * This is not the grip. A shaft seated 2 mm into a bore that runs to 18 mm contacts over 2 mm
     * and must travel 18 mm to pass the far mouth, so the stroke a mechanic is told to pull is
     * sized from this span and not from `contactSpanMm`.
     */
    holderSpanMm: readonly [number, number];
    /** The shaft's own triangles that lie inside the gripped span, for the reviewer's count. */
    grippedTriangles: number;
    /** Material side of each face, kept so a reviewer can see the joint's shape. */
    maleSide: MaterialSide;
    femaleSide: MaterialSide;
}>;

/** Which side of the cylindrical face the piece's material lies on. */
export type MaterialSide = 'shaft' | 'void' | 'unknown';

/**
 * `shaft` when the material is inside the cylinder (a pin, an axle, a bush outer surface),
 * `void` when it is outside (a bore, a hole).
 *
 * The sign comes from the winding of the triangles that make up the face: their geometry normals
 * point out of the material, so averaged over the face they point away from the axis for a shaft
 * and towards it for a bore. Averaging is what makes this safe against an occasional flipped
 * triangle, and a face whose mean is near zero is reported as `unknown` rather than guessed.
 */
export function materialSide(
    faceTrianglesOnFace: readonly number[],
    face: WorldFace,
    ambiguousLimit = 0.1
): MaterialSide {
    let total = 0;
    let triangles = 0;
    for (let index = 0; index + 8 < faceTrianglesOnFace.length; index += 9) {
        const ax = faceTrianglesOnFace[index] as number;
        const ay = faceTrianglesOnFace[index + 1] as number;
        const az = faceTrianglesOnFace[index + 2] as number;
        const ux = (faceTrianglesOnFace[index + 3] as number) - ax;
        const uy = (faceTrianglesOnFace[index + 4] as number) - ay;
        const uz = (faceTrianglesOnFace[index + 5] as number) - az;
        const vx = (faceTrianglesOnFace[index + 6] as number) - ax;
        const vy = (faceTrianglesOnFace[index + 7] as number) - ay;
        const vz = (faceTrianglesOnFace[index + 8] as number) - az;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const mx = (ax + faceTrianglesOnFace[index + 3]! + faceTrianglesOnFace[index + 6]!) / 3 - face.origin[0];
        const my = (ay + faceTrianglesOnFace[index + 4]! + faceTrianglesOnFace[index + 7]!) / 3 - face.origin[1];
        const mz = (az + faceTrianglesOnFace[index + 5]! + faceTrianglesOnFace[index + 8]!) / 3 - face.origin[2];
        const along = mx * face.axis[0] + my * face.axis[1] + mz * face.axis[2];
        const rx = mx - along * face.axis[0];
        const ry = my - along * face.axis[1];
        const rz = mz - along * face.axis[2];
        const length = Math.hypot(rx, ry, rz);
        if (length < 1e-9) continue;
        total += (nx * rx + ny * ry + nz * rz) / length;
        triangles += 1;
    }
    if (triangles === 0) return 'unknown';
    const mean = total / triangles;
    if (Math.abs(mean) <= ambiguousLimit) return 'unknown';
    return mean > 0 ? 'shaft' : 'void';
}

export type RejectedInterface = Readonly<{
    source: MatingInterface;
    /** Closest approach, or null when nothing could be measured. */
    contactMm: number | null;
    reason:
        | 'apart'
        | 'face-without-triangles'
        /** Both faces hold their material on the same side: two bores, or two shafts, on one line. */
        | 'same-side'
        /** A face whose material side could not be read, which is a review item rather than a guess. */
        | 'side-unknown'
        /** The faces overlap by less than the mesh can resolve, so the grip is not evidence. */
        | 'below-resolution';
}>;

export type ConfirmationReport = Readonly<{
    toleranceMm: number;
    surfaceToleranceMm: number;
    engagementFloorMm: number;
    candidates: number;
    confirmed: readonly ConfirmedInterface[];
    rejected: readonly RejectedInterface[];
}>;

function radialDistance(face: WorldFace, x: number, y: number, z: number): number {
    const dx = x - face.origin[0];
    const dy = y - face.origin[1];
    const dz = z - face.origin[2];
    const along = dx * face.axis[0] + dy * face.axis[1] + dz * face.axis[2];
    const radial = Math.hypot(dx - along * face.axis[0], dy - along * face.axis[1], dz - along * face.axis[2]);
    return Math.abs(radial - face.radiusMm);
}

function axialProjection(face: WorldFace, x: number, y: number, z: number): number {
    return (
        (x - face.origin[0]) * face.axis[0] +
        (y - face.origin[1]) * face.axis[1] +
        (z - face.origin[2]) * face.axis[2]
    );
}

/**
 * The triangles of this piece that lie on that cylindrical face, as expanded coordinates.
 *
 * A triangle counts only when all three of its vertices sit within `surfaceToleranceMm` of the
 * cylinder, so the flat ends of a bore and the fillet of a shoulder stay out of the measurement.
 */
export function faceTriangles(
    mesh: WorldMesh,
    face: WorldFace,
    surfaceToleranceMm: number
): readonly number[] {
    const out: number[] = [];
    const { positions, indices } = mesh;
    for (let corner = 0; corner + 2 < indices.length; corner += 3) {
        const triangle: number[] = [];
        let onFace = true;
        for (let slot = 0; slot < 3; slot += 1) {
            const vertex = indices[corner + slot] as number;
            const x = positions[vertex * 3] as number;
            const y = positions[vertex * 3 + 1] as number;
            const z = positions[vertex * 3 + 2] as number;
            if (radialDistance(face, x, y, z) > surfaceToleranceMm) {
                onFace = false;
                break;
            }
            triangle.push(x, y, z);
        }
        if (onFace) out.push(...triangle);
    }
    return out;
}

function geometryOf(positions: readonly number[]): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(Array.from(positions), 3));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
}

/**
 * Closest approach between two faces' triangles, millimetres, or null when either has none.
 *
 * Measured from each vertex of one face to the other face's triangulated surface, both ways.
 * `MeshBVH.closestPointToGeometry` is deliberately not used: measured against this snapshot it
 * returns the global closest approach no matter which triangle is handed to it — a triangle whose
 * centroid sits 7.74 mm from the other face came back at 0.03 mm — while the point query on the
 * same triangle reports the 7.74 mm truth. A vertex-to-surface query is the one this dataset
 * answers correctly, and it is the conservative direction: it can overstate a gap, never hide one.
 */
function surfaceGap(
    a: readonly number[],
    b: readonly number[],
    cache: Map<string, MeshBVH>,
    key: string
): number | null {
    if (a.length === 0 || b.length === 0) return null;
    let tree = cache.get(key);
    if (tree === undefined) {
        tree = new MeshBVH(geometryOf(b));
        cache.set(key, tree);
    }
    let closest = Number.POSITIVE_INFINITY;
    for (let index = 0; index + 2 < a.length; index += 3) {
        const found = tree.closestPointToPoint(new Vector3(a[index] as number, a[index + 1] as number, a[index + 2] as number));
        if (found === null) continue;
        if (found.distance < closest) closest = found.distance;
        if (closest === 0) break;
    }
    return Number.isFinite(closest) ? closest : null;
}

/** The span a face's own triangles cover along its axis: where the material actually stops. */
function axialExtent(face: WorldFace, triangles: readonly number[]): readonly [number, number] | null {
    let near = Number.POSITIVE_INFINITY;
    let far = Number.NEGATIVE_INFINITY;
    for (let index = 0; index + 2 < triangles.length; index += 3) {
        const projection = axialProjection(
            face,
            triangles[index] as number,
            triangles[index + 1] as number,
            triangles[index + 2] as number
        );
        near = Math.min(near, projection);
        far = Math.max(far, projection);
    }
    return Number.isFinite(near) && Number.isFinite(far) ? [near, far] : null;
}

/**
 * Carry a face's own axial extent into another face's frame.
 *
 * A STEP `CYLINDRICAL_SURFACE` stores an axis location of its own, so two faces that are
 * genuinely coaxial almost never measure along the line from the same point, and their axes may
 * point opposite ways. `MatingInterface.axis`/`.origin` are the male's own, so the interface
 * frame is the male's frame: the female extent has to be carried into it before anything is
 * intersected. Comparing the two as printed compares numbers taken from different origins, which
 * both rejects real joints and mis-measures the rest.
 */
function extentInFrame(
    span: readonly [number, number],
    from: WorldFace,
    into: WorldFace
): readonly [number, number] {
    const offset = axialProjection(
        into,
        from.origin[0] - into.origin[0] + into.origin[0],
        from.origin[1] - into.origin[1] + into.origin[1],
        from.origin[2] - into.origin[2] + into.origin[2]
    );
    const sense =
        from.axis[0] * into.axis[0] + from.axis[1] * into.axis[1] + from.axis[2] * into.axis[2];
    const first = offset + sense * span[0];
    const second = offset + sense * span[1];
    return first <= second ? [first, second] : [second, first];
}

/** How many of the shaft's own triangles sit inside the gripped span. */
function trianglesGripped(face: WorldFace, triangles: readonly number[], span: readonly [number, number]): number {
    let gripping = 0;
    for (let index = 0; index + 8 < triangles.length; index += 9) {
        const centroid = axialProjection(
            face,
            (triangles[index]! + triangles[index + 3]! + triangles[index + 6]!) / 3,
            (triangles[index + 1]! + triangles[index + 4]! + triangles[index + 7]!) / 3,
            (triangles[index + 2]! + triangles[index + 5]! + triangles[index + 8]!) / 3
        );
        if (centroid >= span[0] && centroid <= span[1]) gripping += 1;
    }
    return gripping;
}

/**
 * Confirm or reject every candidate. A candidate whose faces touch is a joint, and its
 * engagement is the axial span of the triangles that touch; one that does not is recorded with
 * the distance that rejected it, so a reviewer sees the near misses rather than inferring them
 * from an absence.
 *
 * A face appears in many candidates — 8,102 candidates share 2,312 placed faces — so each face's
 * triangles are collected once per piece and reused.
 */
export function confirmInterfaces(
    candidates: readonly MatingInterface[],
    meshes: ReadonlyMap<string, WorldMesh>,
    options: ContactOptions = {}
): ConfirmationReport {
    const toleranceMm = options.toleranceMm ?? 0.1;
    const surfaceToleranceMm = options.surfaceToleranceMm ?? 0.05;
    const engagementFloorMm = options.engagementFloorMm ?? 0.12;
    const collected = new Map<string, readonly number[]>();
    const trianglesFor = (face: WorldFace): readonly number[] => {
        const key = `${face.occurrenceId}\u0000${face.sourceEntityId}`;
        const cached = collected.get(key);
        if (cached !== undefined) return cached;
        const mesh = meshes.get(face.occurrenceId);
        const found = mesh === undefined ? [] : faceTriangles(mesh, face, surfaceToleranceMm);
        collected.set(key, found);
        return found;
    };

    const extents = new Map<string, readonly [number, number] | null>();
    const extentFor = (face: WorldFace): readonly [number, number] | null => {
        const key = `${face.occurrenceId}\u0000${face.sourceEntityId}`;
        if (extents.has(key)) return extents.get(key) ?? null;
        const read = axialExtent(face, trianglesFor(face));
        extents.set(key, read);
        return read;
    };
    const sides = new Map<string, MaterialSide>();
    const sideFor = (face: WorldFace): MaterialSide => {
        const key = `${face.occurrenceId}\u0000${face.sourceEntityId}`;
        const cached = sides.get(key);
        if (cached !== undefined) return cached;
        const read = materialSide(trianglesFor(face), face);
        sides.set(key, read);
        return read;
    };
    /** One surface tree per face, reused across the candidates that share it. */
    const trees = new Map<string, MeshBVH>();

    const confirmed: ConfirmedInterface[] = [];
    const rejected: RejectedInterface[] = [];

    for (const candidate of candidates) {
        const maleFace = trianglesFor(candidate.male);
        const femaleFace = trianglesFor(candidate.female);
        if (maleFace.length === 0 || femaleFace.length === 0) {
            rejected.push({ source: candidate, contactMm: null, reason: 'face-without-triangles' });
            continue;
        }

        const maleSide = sideFor(candidate.male);
        const femaleSide = sideFor(candidate.female);
        if (maleSide === 'unknown' || femaleSide === 'unknown') {
            rejected.push({ source: candidate, contactMm: null, reason: 'side-unknown' });
            continue;
        }
        if (maleSide === femaleSide) {
            rejected.push({ source: candidate, contactMm: null, reason: 'same-side' });
            continue;
        }

        // Grip is overlap. A shaft and a bore on one line engage only over the length where their
        // own material runs together, so a 22.45 mm axle through a 7.85 mm hole engages 7.85 mm,
        // not 22.45 mm, and two faces that merely share an axis with nothing in common overlap by
        // nothing at all.
        //
        // Both spans are read in the male's frame, because that is the interface frame: the
        // female face's own extent is carried into it first. `contactSpanMm` is therefore a
        // distance along `candidate.axis` from `candidate.origin`, which is where a reviewer and
        // the move generator read it from.
        const maleSpan = extentFor(candidate.male);
        const femaleExtent = extentFor(candidate.female);
        const femaleSpan =
            femaleExtent === null ? null : extentInFrame(femaleExtent, candidate.female, candidate.male);
        if (maleSpan === null || femaleSpan === null) {
            rejected.push({ source: candidate, contactMm: null, reason: 'face-without-triangles' });
            continue;
        }
        const near = Math.max(maleSpan[0], femaleSpan[0]);
        const far = Math.min(maleSpan[1], femaleSpan[1]);
        if (far <= near) {
            rejected.push({ source: candidate, contactMm: far - near, reason: 'apart' });
            continue;
        }
        if (far - near < engagementFloorMm) {
            rejected.push({ source: candidate, contactMm: null, reason: 'below-resolution' });
            continue;
        }

        const maleKey = `${candidate.female.occurrenceId}\u0000${candidate.female.sourceEntityId}`;
        const femaleKey = `${candidate.male.occurrenceId}\u0000${candidate.male.sourceEntityId}`;
        const gapMale = surfaceGap(maleFace, femaleFace, trees, maleKey);
        const gapFemale = surfaceGap(femaleFace, maleFace, trees, femaleKey);
        const measured = [gapMale, gapFemale].filter((value): value is number => value !== null);
        if (measured.length === 0) {
            rejected.push({ source: candidate, contactMm: null, reason: 'face-without-triangles' });
            continue;
        }
        const contactMm = Math.min(...measured);
        if (contactMm > toleranceMm) {
            rejected.push({ source: candidate, contactMm, reason: 'apart' });
            continue;
        }

        const gripping = trianglesGripped(candidate.male, maleFace, [near, far]);
        confirmed.push({
            source: candidate,
            contactMm,
            engagementMm: Math.max(0, far - near),
            contactSpanMm: [near, far],
            holderSpanMm: femaleSpan,
            grippedTriangles: gripping,
            maleSide,
            femaleSide
        });
    }

    const order = (a: { source: MatingInterface }, b: { source: MatingInterface }): number =>
        a.source.id < b.source.id ? -1 : a.source.id > b.source.id ? 1 : 0;
    return {
        toleranceMm,
        surfaceToleranceMm,
        engagementFloorMm,
        candidates: candidates.length,
        confirmed: confirmed.sort(order),
        rejected: rejected.sort(order)
    };
}
