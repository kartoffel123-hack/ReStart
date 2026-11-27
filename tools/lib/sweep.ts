/**
 * Swept-volume clearance (plan 02 §3C step 3, ticket 5 · V02/V10).
 *
 * The automatic graph is only as honest as this file. A stroke reported clear that really
 * hits a neighbour deletes a step from a mechanic's manual; a stroke reported blocked that
 * really passes tells them to strip healthy parts off an assembly that needed nothing of the
 * kind — which is the opposite of the product's promise. So the fixtures in
 * `tests/geometry/sweep.test.ts` are hand-worked boxes, and the two ways this goes wrong are
 * handled on purpose:
 *
 * - Sampling alone misses a thin obstruction that fits between two frames, so every interval
 *   whose conservative swept box overlaps the neighbour is re-tested at `minStepMm`.
 * - A refinement that finds nothing is a clear interval, not a review item: Technic beams are
 *   concave, and their holes sit inside an AABB the mover legitimately passes through. Only a
 *   path too coarse to refine at all is reported as `ambiguous`, because there "we could not
 *   tell" is the truth and §3C step 2 is the fix — the generator adds intermediate frames.
 *
 * Units are millimetres throughout and nothing is rescaled here, which is what makes a
 * millimetre/metre mix appear as an absurd gap instead of a plausible clearance. An obstacle's
 * triangles are baked into assembly coordinates once, so a query is just the mover's own world
 * matrix; a doubled parent placement therefore moves the obstacle and changes the verdict.
 */
import { Box3, BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Box, RigidFrame, Vec3 } from '../../src/domain/schema.js';

/** Non-indexed triangles, millimetres, in the piece's own part frame. */
export type TriangleSoup = Readonly<{ id: string; positions: readonly number[] }>;

/** One placement along a stroke: how far the piece has travelled, and where it then sits. */
export type PathFrame = Readonly<{ atMm: number; frame: RigidFrame }>;

/** A neighbour with its acceleration structure built once and reused across strokes. */
export type Obstacle = Readonly<{
    id: string;
    /** Conservative AABB in assembly coordinates, for the broad phase. */
    bounds: Box;
    triangleCount: number;
    geometry: BufferGeometry;
    tree: MeshBVH;
}>;

export type ClearanceOptions = Readonly<{
    /** Only measure a surface gap for samples that come this close (default 10 mm). */
    nearBandMm?: number;
    /** Resolution of the interval refinement (default 0.01 mm). */
    minStepMm?: number;
    /** Refinements beyond this many placements are not attempted; the verdict is `ambiguous`. */
    maxRefineSteps?: number;
}>;

export type ClearanceVerdict = Readonly<{
    obstacleId: string;
    /** `ambiguous` means the conservative volume says contact, the fine test says no. */
    status: 'clear' | 'collision' | 'ambiguous';
    /** Travel at first contact; 0 when the piece starts seated against the neighbour. */
    atMm: number;
    /** Smallest surface gap seen, or null when nothing came inside the near band. */
    minGapMm: number | null;
    /** Whether a frame or an interval refinement produced the verdict. */
    basis: 'sampled' | 'interval' | 'none';
}>;

const NEAR_BAND_MM = 10;
const MIN_STEP_MM = 0.01;
/** ~200 mm of travel at the refinement resolution; past this the path is simply too coarse. */
const MAX_REFINE_STEPS = 20_000;
/** Two boxes that only touch share a face; that is not an interval worth refining. */
const BOX_EPSILON = 1e-6;

const ASSEMBLY_TO_ASSEMBLY = new Matrix4();
const IDENTITY_ROTATION = new Quaternion(0, 0, 0, 1);
const UNIT_SCALE = new Vector3(1, 1, 1);

function matrixOf(frame: RigidFrame): Matrix4 {
    return new Matrix4().compose(
        new Vector3(frame.translation[0], frame.translation[1], frame.translation[2]),
        new Quaternion(frame.rotation[0], frame.rotation[1], frame.rotation[2], frame.rotation[3]),
        UNIT_SCALE
    );
}

function geometryOf(positions: readonly number[]): BufferGeometry {
    const geometry = new BufferGeometry();
    // Copied, because the caller's array is read-only evidence and three keeps what it is given.
    geometry.setAttribute('position', new Float32BufferAttribute(Array.from(positions), 3));
    geometry.computeBoundingBox();
    return geometry;
}

function bake(positions: readonly number[], matrix: Matrix4): number[] {
    const out: number[] = [];
    const point = new Vector3();
    for (let index = 0; index + 2 < positions.length; index += 3) {
        const x = positions[index];
        const y = positions[index + 1];
        const z = positions[index + 2];
        if (x === undefined || y === undefined || z === undefined) break;
        point.set(x, y, z).applyMatrix4(matrix);
        out.push(point.x, point.y, point.z);
    }
    return out;
}

function asBox(box: Box3 | null): Box {
    const empty = new Box3(new Vector3(), new Vector3());
    const source = box ?? empty;
    return {
        min: [source.min.x, source.min.y, source.min.z],
        max: [source.max.x, source.max.y, source.max.z]
    };
}

/** Place a neighbour where the assembly says it is and index it for repeated queries. */
export function buildObstacle(triangles: TriangleSoup, frame: RigidFrame): Obstacle {
    const positions = bake(triangles.positions, matrixOf(frame));
    const geometry = geometryOf(positions);
    return {
        id: triangles.id,
        bounds: asBox(geometry.boundingBox),
        triangleCount: positions.length / 9,
        geometry,
        tree: new MeshBVH(geometry)
    };
}

type PreparedMover = Readonly<{ geometry: BufferGeometry; local: Box3 }>;

/** A stroke is tested against ~8 neighbours, so the mover's geometry is built once per piece. */
const PREPARED = new WeakMap<object, PreparedMover>();

function prepare(triangles: TriangleSoup): PreparedMover {
    const cached = PREPARED.get(triangles);
    if (cached !== undefined) return cached;
    const geometry = geometryOf(triangles.positions);
    const prepared: PreparedMover = {
        geometry,
        local: geometry.boundingBox ?? new Box3(new Vector3(), new Vector3())
    };
    PREPARED.set(triangles, prepared);
    return prepared;
}

/**
 * The AABB a box sweeps between two placements. For a translation this is exact per axis: the
 * swept extent is the two endpoints' extents joined. A rotation bulges outside that, so a
 * turning stroke has to arrive with intermediate frames, which is what §3C step 2 requires of
 * the generator.
 */
function sweptBox(local: Box3, from: Matrix4, to: Matrix4): Box3 {
    const first = new Box3().copy(local).applyMatrix4(from);
    const second = new Box3().copy(local).applyMatrix4(to);
    return first.union(second);
}

function overlapsStrictly(a: Box3, b: Box3): boolean {
    return (
        a.min.x < b.max.x - BOX_EPSILON && a.max.x > b.min.x + BOX_EPSILON &&
        a.min.y < b.max.y - BOX_EPSILON && a.max.y > b.min.y + BOX_EPSILON &&
        a.min.z < b.max.z - BOX_EPSILON && a.max.z > b.min.z + BOX_EPSILON
    );
}

function gapBetween(a: Box3, b: Box3): number {
    const dx = Math.max(b.min.x - a.max.x, a.min.x - b.max.x, 0);
    const dy = Math.max(b.min.y - a.max.y, a.min.y - b.max.y, 0);
    const dz = Math.max(b.min.z - a.max.z, a.min.z - b.max.z, 0);
    return Math.hypot(dx, dy, dz);
}

/** Straight-line frames along `axis`, the last one at exactly `strokeMm`. */
export function translatePath(
    axis: readonly [number, number, number],
    from: RigidFrame,
    strokeMm: number,
    stepMm: number
): PathFrame[] {
    const length = Math.hypot(axis[0], axis[1], axis[2]);
    if (length === 0) throw new Error('a travel axis needs a non-zero direction');
    if (!(strokeMm > 0)) throw new Error(`a stroke has to travel somewhere, got ${strokeMm} mm`);
    if (!(stepMm > 0)) throw new Error(`the sample step has to be positive, got ${stepMm} mm`);
    const unit: Vec3 = [axis[0] / length, axis[1] / length, axis[2] / length];
    const steps = Math.max(1, Math.ceil(strokeMm / stepMm));
    const frames: PathFrame[] = [];
    for (let step = 0; step <= steps; step += 1) {
        const atMm = (strokeMm * step) / steps;
        frames.push({
            atMm,
            frame: {
                translation: [
                    from.translation[0] + unit[0] * atMm,
                    from.translation[1] + unit[1] * atMm,
                    from.translation[2] + unit[2] * atMm
                ],
                rotation: [from.rotation[0], from.rotation[1], from.rotation[2], from.rotation[3]]
            }
        });
    }
    return frames;
}

function frameBetween(a: RigidFrame, b: RigidFrame, t: number): RigidFrame {
    const start = new Quaternion(a.rotation[0], a.rotation[1], a.rotation[2], a.rotation[3]);
    const end = new Quaternion(b.rotation[0], b.rotation[1], b.rotation[2], b.rotation[3]);
    const spin = start.slerp(end, t).normalize();
    return {
        translation: [
            a.translation[0] + (b.translation[0] - a.translation[0]) * t,
            a.translation[1] + (b.translation[1] - a.translation[1]) * t,
            a.translation[2] + (b.translation[2] - a.translation[2]) * t
        ],
        rotation: [spin.x, spin.y, spin.z, spin.w]
    };
}

/** The conservative swept volume a motion needs in its `sweep` field. */
export function sweptBounds(mover: TriangleSoup, path: readonly PathFrame[]): Box {
    const first = path[0];
    if (first === undefined) throw new Error('a stroke needs at least one frame');
    const local = prepare(mover).local;
    const swept = new Box3().copy(local).applyMatrix4(matrixOf(first.frame));
    for (const entry of path) {
        swept.union(new Box3().copy(local).applyMatrix4(matrixOf(entry.frame)));
    }
    return asBox(swept);
}

/**
 * Does this stroke hit that neighbour? Frames are tested exactly; an interval whose
 * conservative box overlaps the neighbour is refined to `minStepMm` before anything is called
 * clear, and a refinement that still finds nothing is reported as `ambiguous`.
 */
export function clearanceAlongPath(
    mover: TriangleSoup,
    path: readonly PathFrame[],
    obstacle: Obstacle,
    options: ClearanceOptions = {}
): ClearanceVerdict {
    if (path.length === 0) throw new Error('a clearance query needs at least one frame');
    const nearBandMm = options.nearBandMm ?? NEAR_BAND_MM;
    const minStepMm = options.minStepMm ?? MIN_STEP_MM;
    const maxRefineSteps = options.maxRefineSteps ?? MAX_REFINE_STEPS;
    const prepared = prepare(mover);
    const neighbour = obstacle.geometry.boundingBox ?? new Box3(new Vector3(), new Vector3());
    const matrices = path.map((entry) => matrixOf(entry.frame));

    const verdict = (
        status: ClearanceVerdict['status'],
        atMm: number,
        basis: ClearanceVerdict['basis'],
        minGapMm: number | null
    ): ClearanceVerdict => ({ obstacleId: obstacle.id, status, atMm, minGapMm, basis });

    let minGapMm: number | null = null;
    const measureGap = (placed: Matrix4): void => {
        const moved = new Box3().copy(prepared.local).applyMatrix4(placed);
        if (gapBetween(moved, neighbour) > nearBandMm) return;
        const closest = obstacle.tree.closestPointToGeometry(
            prepared.geometry,
            placed,
            undefined,
            undefined,
            0,
            nearBandMm + 1
        );
        const distance = closest === null ? null : closest.distance;
        if (distance !== null && (minGapMm === null || distance < minGapMm)) minGapMm = distance;
    };

    const contact = (placed: Matrix4): boolean =>
        obstacle.tree.intersectsGeometry(prepared.geometry, placed);

    for (let index = 0; index < path.length - 1; index += 1) {
        const current = path[index];
        const next = path[index + 1];
        const from = matrices[index];
        const to = matrices[index + 1];
        if (current === undefined || next === undefined || from === undefined || to === undefined) {
            continue;
        }
        if (contact(from)) return verdict('collision', current.atMm, 'sampled', minGapMm);
        measureGap(from);
        const between = sweptBox(prepared.local, from, to);
        if (!overlapsStrictly(between, neighbour)) continue;
        if (!obstacle.tree.intersectsBox(between, ASSEMBLY_TO_ASSEMBLY)) continue;
        // The conservative volume says the piece crosses this neighbour's space between the
        // two frames. Refine before believing it, and report the first contact rather than the
        // first frame that happens to land inside. A refinement that comes back empty is a
        // clear interval: the neighbour's bounds are bigger than the material inside them.
        const start = current.atMm;
        const span = next.atMm - start;
        const steps = Math.max(1, Math.ceil(span / minStepMm));
        if (steps > maxRefineSteps) {
            return verdict('ambiguous', start + span / 2, 'interval', minGapMm);
        }
        for (let step = 1; step <= steps; step += 1) {
            const t = step / steps;
            if (obstacle.tree.intersectsGeometry(
                prepared.geometry,
                matrixOf(frameBetween(current.frame, next.frame, t))
            )) {
                return verdict('collision', start + span * t, 'sampled', minGapMm);
            }
        }
    }

    const lastFrame = path[path.length - 1];
    const lastMatrix = matrices[matrices.length - 1];
    if (lastFrame !== undefined && lastMatrix !== undefined) {
        if (contact(lastMatrix)) return verdict('collision', lastFrame.atMm, 'sampled', minGapMm);
        measureGap(lastMatrix);
    }
    return verdict('clear', 0, 'none', minGapMm);
}
