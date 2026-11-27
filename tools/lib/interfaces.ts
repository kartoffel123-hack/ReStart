/**
 * Classified mating interfaces (plan 02 §3C step 4, ticket 5 · V02).
 *
 * A piece leaves along the axis its interfaces define, and only the contact region of a
 * classified interface may touch (§3C step 4). So before any move can be generated, the
 * assembly has to say which pairs of pieces are actually fitted together and along what line.
 * A coaxial pair of cylindrical faces whose radii match within the pose tolerance is the
 * evidence: both faces name the STEP entity they came from, so a reviewer can open the CAD and
 * disagree.
 *
 * These are candidates, and the measurement says why that word matters. On the pinned snapshot
 * the 70 pieces carry 2,312 cylindrical faces, and 8,102 cross-occurrence pairs of them are
 * coaxial within 0.1 mm and matched in radius within 0.1 mm — more joints than a 70-piece
 * helicopter has. Two empty bores on one line satisfy the rule, and so does a beam resting
 * against a beam whose holes happen to line up. Nothing downstream may read this list as the
 * graph: a candidate has to be confirmed by its two faces actually touching, which needs the
 * tessellated triangles belonging to each face. That confirmation is the next work package.
 *
 * The pairing kernel here is deliberately pure — it takes world-space faces, not the CAD — so
 * the counterexamples (parallel-but-offset axes, two holes in the same piece, radii that do not
 * fit) are testable without the 6.9 MB snapshot, and the snapshot test asserts the witnesses.
 *
 * What is *not* here: engagement depth. A STEP `CYLINDRICAL_SURFACE` carries an infinite
 * surface; the trim that makes it a 7 mm hole lives in the face's boundary, which the feature
 * table does not read yet. Guessing engagement from bounding boxes would put a fabricated
 * stroke into a mechanic's manual, so it is recorded as open in `data/review/interface-features.md`
 * instead, and the release stroke is derived from the moving piece's own bounds.
 */
import type { ConnectionKind } from '../../src/domain/schema.js';
// `Vec3` here is the read-only build-side tuple from the STEP layer; the domain's own mutable
// tuple is built later, when the generator serialises a model.
import type { AssemblyTree, Vec3 } from './step-tree.js';
import { featureInWorld, type FeatureTable } from './features.js';

/** One cylindrical face, placed in assembly coordinates. */
export type WorldFace = Readonly<{
    occurrenceId: string;
    /** The piece's CAD name, used only to name the candidate class. */
    occurrenceName: string;
    definitionId: string;
    /** STEP entity label, e.g. `#4276`, so the face can be re-opened. */
    sourceEntityId: string;
    radiusMm: number;
    origin: Vec3;
    /** Unit vector. */
    axis: Vec3;
}>;

export type MatingInterface = Readonly<{
    /** Deterministic: the same pair of faces always yields the same id. */
    id: string;
    a: WorldFace;
    b: WorldFace;
    /** The smaller cylinder: what travels through the other. */
    male: WorldFace;
    female: WorldFace;
    kind: ConnectionKind;
    /** Canonical axis: the male's own direction, so a rebuild cannot flip it. */
    axis: Vec3;
    origin: Vec3;
    /** |ra − rb|: 0.05 mm is LEGO's line-to-line fit, and 0.1 mm is the pose tolerance. */
    radialGapMm: number;
    /** Perpendicular distance between the two axis lines, for the reviewer's benefit. */
    axisOffsetMm: number;
    /** A cylinder has no inherent sense, so both directions are offered. */
    releaseDirections: readonly [Vec3, Vec3];
}>;

export type InterfaceOptions = Readonly<{
    /** Largest radius difference still called a fit. Defaults to the 0.1 mm pose tolerance. */
    fitToleranceMm?: number;
    /** Largest axis-line offset still called coaxial. */
    axisToleranceMm?: number;
}>;

export type CandidateInterfaceReport = Readonly<{
    sourceRevision: string;
    fitToleranceMm: number;
    axisToleranceMm: number;
    facesConsidered: number;
    /** Coaxial, radius-matched pairs — candidates, not confirmed joints. See the header. */
    candidates: readonly MatingInterface[];
    /** How many candidate interfaces landed in each class, for the review queue. */
    kindCounts: Readonly<Record<string, number>>;
}>;

const FIT_TOLERANCE_MM = 0.1;
/** The same 0.1 mm the plan sets as the initial pose tolerance (plan 02 §3A). */
const AXIS_TOLERANCE_MM = 0.1;

/** Negation that cannot leave a negative zero in a serialised dataset. */
function flip(axis: Vec3): Vec3 {
    return [
        axis[0] === 0 ? 0 : -axis[0],
        axis[1] === 0 ? 0 : -axis[1],
        axis[2] === 0 ? 0 : -axis[2]
    ];
}

function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

/**
 * Parallel within `angularTol` as a cosine margin, and the axis lines within `axisTol` of each
 * other. Anti-parallel counts: a hole read end-to-end runs the other way from the axle through
 * it, and that is the same interface, not a second one.
 */
function coaxial(a: WorldFace, b: WorldFace, axisToleranceMm: number): number | null {
    const alignment = Math.abs(dot(a.axis, b.axis));
    if (alignment < 1 - 1e-6) return null;
    const delta: Vec3 = [b.origin[0] - a.origin[0], b.origin[1] - a.origin[1], b.origin[2] - a.origin[2]];
    const perpendicular = cross(delta, a.axis);
    const offset = Math.hypot(perpendicular[0], perpendicular[1], perpendicular[2]);
    return offset <= axisToleranceMm ? offset : null;
}

/**
 * The candidate class, named from the male piece's own CAD name. This is a *candidate*: the
 * workbook's connection classes and a reviewer decide the final kind, and anything the name
 * does not place arrives as `other` rather than as a guess.
 */
export function candidateKind(maleName: string, femaleName: string): ConnectionKind {
    const name = `${maleName} ${femaleName}`.toLowerCase();
    if (name.includes('axle')) return 'axle-bore';
    if (name.includes('pin')) return 'pin-hole';
    if (name.includes('tube') || name.includes('stud')) return 'stud-tube';
    if (name.includes('gear') || name.includes('tooth')) return 'gear-mesh';
    if (name.includes('bush') || name.includes('friction')) return 'friction';
    return 'other';
}

/**
 * Every coaxial, radius-matched pair of cylindrical faces belonging to two different
 * occurrences. Faces of one piece against each other are excluded: a beam's two holes are not
 * connected to each other, and treating them as a joint would invent a blocker nothing has.
 */
export function pairInterfaces(
    faces: readonly WorldFace[],
    options: InterfaceOptions = {}
): readonly MatingInterface[] {
    const fitToleranceMm = options.fitToleranceMm ?? FIT_TOLERANCE_MM;
    const axisToleranceMm = options.axisToleranceMm ?? AXIS_TOLERANCE_MM;
    const found: MatingInterface[] = [];

    for (let i = 0; i < faces.length; i += 1) {
        const first = faces[i];
        if (first === undefined) continue;
        for (let j = i + 1; j < faces.length; j += 1) {
            const other = faces[j];
            if (other === undefined) continue;
            if (first.occurrenceId === other.occurrenceId) continue;
            const radialGapMm = Math.abs(first.radiusMm - other.radiusMm);
            if (radialGapMm > fitToleranceMm) continue;
            const axisOffsetMm = coaxial(first, other, axisToleranceMm);
            if (axisOffsetMm === null) continue;

            const [male, female] =
                first.radiusMm <= other.radiusMm ? [first, other] : [other, first];
            const [left, right] =
                first.occurrenceId < other.occurrenceId ||
                (first.occurrenceId === other.occurrenceId && first.sourceEntityId < other.sourceEntityId)
                    ? [first, other]
                    : [other, first];
            const axis = male.axis;
            found.push({
                id: `mi:${left.occurrenceId}:${left.sourceEntityId}:${right.occurrenceId}:${right.sourceEntityId}`,
                a: left,
                b: right,
                male,
                female,
                kind: candidateKind(male.occurrenceName, female.occurrenceName),
                axis,
                origin: male.origin,
                radialGapMm,
                axisOffsetMm,
                releaseDirections: [axis, flip(axis)]
            });
        }
    }

    return found.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Place every cylindrical face of every occurrence where the assembly says it is. */
export function worldFaces(table: FeatureTable, tree: AssemblyTree): readonly WorldFace[] {
    const byDefinition = new Map(table.definitions.map((entry) => [entry.definitionId, entry]));
    const faces: WorldFace[] = [];
    for (const occurrence of tree.occurrences) {
        const definition = byDefinition.get(occurrence.definitionId);
        if (definition === undefined) continue;
        for (const feature of definition.cylinders) {
            const placed = featureInWorld(feature, occurrence.worldPlacement);
            faces.push({
                occurrenceId: occurrence.id,
                occurrenceName: occurrence.name,
                definitionId: occurrence.definitionId,
                sourceEntityId: feature.sourceEntityId,
                radiusMm: placed.radiusMm,
                origin: placed.origin,
                axis: placed.axis
            });
        }
    }
    return faces;
}

export function extractCandidateInterfaces(
    table: FeatureTable,
    tree: AssemblyTree,
    options: InterfaceOptions = {}
): CandidateInterfaceReport {
    const faces = worldFaces(table, tree);
    const interfaces = pairInterfaces(faces, options);
    const kindCounts: Record<string, number> = {};
    for (const entry of interfaces) {
        kindCounts[entry.kind] = (kindCounts[entry.kind] ?? 0) + 1;
    }
    return {
        sourceRevision: table.sourceRevision,
        fitToleranceMm: options.fitToleranceMm ?? FIT_TOLERANCE_MM,
        axisToleranceMm: options.axisToleranceMm ?? AXIS_TOLERANCE_MM,
        facesConsidered: faces.length,
        candidates: interfaces,
        kindCounts
    };
}
