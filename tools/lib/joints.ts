/**
 * One joint per piece pair per axis line (plan 02 §3C step 4 · ticket 5 · V02, RV-003b).
 *
 * `contacts.ts` confirms joints between *faces*, and a face is a tessellator's convenience
 * rather than a fact about the kit: a long bore is modelled as several cylindrical faces and a
 * stepped pin has one per step. On the pinned snapshot 1,632 confirmed face pairs describe 84
 * connections. A graph built from the face count would tell a mechanic to free the same fit
 * several times, and a stroke taken from one face would stop inside the wall it was meant to
 * clear.
 *
 * So this collapses face pairs onto the thing the move generator is allowed to reason about:
 * one piece pair, one axis line, one release direction, and the region along that line where
 * the two pieces actually grip (§3C step 4: "Permit only the contact region and release
 * direction established for that interface").
 *
 * Two measurements are kept separate on purpose, because they answer different questions:
 *
 * - `bands` are the *disjoint* grip intervals, so a grip reported twice by two faces is counted
 *   once, and a pin gripped by a bush and again by a beam with air between stays two bands.
 * - `spanMm` is the bounding region those bands occupy. It is where the pieces interfere, and
 *   it is deliberately not called a grip: nothing binds in the air between two bands.
 *
 * Every face pair folded into a joint is kept with its STEP entity ids, so a reviewer can walk
 * from a connection back to the CAD that produced it and disagree with a specific face.
 *
 * Determinism: the input is ordered by interface id before anything is grouped, the aggregate
 * frame of a line is derived from geometry rather than from whichever face arrived first, and
 * every list is sorted. Shuffling the input cannot move a joint, a band or an id.
 */
import type { ConnectionKind } from '../../src/domain/schema.js';
import type { Vec3 } from './step-tree.js';
import type { ConfirmedInterface } from './contacts.js';

/** The same coaxiality the candidates were admitted on. */
const AXIS_TOLERANCE_MM = 0.1;
/** Faces of one wall abut exactly; anything further apart than this is a real gap between grips. */
const BAND_GAP_MM = 0.05;
/** Two directions this far from parallel are different lines, however close their origins. */
const PARALLEL_EPSILON = 1e-6;

export type JointOptions = Readonly<{
    /** Largest perpendicular distance still called the same axis line. */
    axisToleranceMm?: number;
    /** Two bands this close are one grip. */
    bandGapMm?: number;
}>;

/** A grip interval along the joint's axis, in millimetres, measured from the joint's origin. */
export type Band = readonly [number, number];

export type Joint = Readonly<{
    /** Stable label: the two pieces and the ordinal of this line between them. */
    id: string;
    /** The two ends, sorted, because a connection has no direction of its own. */
    pieces: readonly [string, string];
    /** The kind carried by the widest grip on this line; `radii` says when the fit is stepped. */
    kind: ConnectionKind;
    /** Canonical axis: unit, and the first significant component positive, so `+a` is `-a`. */
    axis: Vec3;
    /** The point of the line closest to the assembly origin, so the frame is not a face's accident. */
    origin: Vec3;
    releaseDirections: readonly [Vec3, Vec3];
    /** Bounding region of the grip along the axis. Not a grip: air between bands is inside it. */
    spanMm: readonly [number, number];
    /** Disjoint grip intervals, ordered, so no grip is counted twice. */
    bands: readonly Band[];
    /**
     * The holders' own extent along the line, which reaches past the grip: a piece sitting in this
     * joint has to pass out of these mouths, so the release stroke is sized from here rather than
     * from `bands`. A grip of 2 mm inside a hole of 18 mm is the difference between a stroke that
     * works and one that leaves the piece held.
     */
    holderSpanMm: readonly [number, number];
    /** The bands summed: how much of the two pieces actually runs together. */
    engagementMm: number;
    /** The loosest face-pair gap folded in, so a reviewer sees the worst evidence. */
    contactMm: number;
    /** The largest axis offset folded into this line, which is the tolerance this merge used. */
    axisOffsetMm: number;
    /** Distinct diameters on this line. More than one is a stepped fit, and a review signal. */
    radii: readonly Readonly<{ maleMm: number; femaleMm: number }>[];
    /** Which end was the inner one for each face pair. More than one entry means the roles flip. */
    roles: readonly Readonly<{ maleOccurrenceId: string; femaleOccurrenceId: string }>[];
    /** Every face pair folded in, with the STEP entities behind it. */
    faces: readonly Readonly<{ id: string; maleEntityId: string; femaleEntityId: string }>[];
}>;

export type JointReport = Readonly<{
    axisToleranceMm: number;
    bandGapMm: number;
    /** The face-pair joints that were folded up. */
    facePairJoints: number;
    joints: readonly Joint[];
    /** Piece pairs whose lines could not be separated within the tolerance, for the review queue. */
    ambiguous: readonly Readonly<{ pieces: readonly [string, string]; lines: number }>[];
}>;

function dot(a: readonly number[], b: readonly number[]): number {
    return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

function minus(a: readonly number[], b: readonly number[]): Vec3 {
    return [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
}

/** Fold a direction to a canonical sense, so a cylinder wound either way is the same axis. */
function canonicalAxis(axis: readonly number[]): Vec3 {
    const length = Math.hypot(axis[0]!, axis[1]!, axis[2]!);
    const unit: Vec3 = length < 1e-12 ? [0, 0, 1] : [axis[0]! / length, axis[1]! / length, axis[2]! / length];
    // `+ 0` folds -0 to +0: negating a zero yields a negative zero that is numerically equal but
    // distinguishes itself in a deep comparison, so the same axis would read as two.
    const flip = (value: number): number => -value + 0;
    for (const component of unit) {
        if (Math.abs(component) > 1e-9) {
            return component > 0 ? unit : ([flip(unit[0]), flip(unit[1]), flip(unit[2])] as Vec3);
        }
    }
    return [unit[0] + 0, unit[1] + 0, unit[2] + 0] as Vec3;
}

/** The point of the line through `point` with direction `axis` that is closest to the origin. */
function canonicalOrigin(axis: Vec3, point: readonly number[]): Vec3 {
    const along = dot(point, axis);
    return [point[0]! - along * axis[0]!, point[1]! - along * axis[1]!, point[2]! - along * axis[2]!];
}

/** Perpendicular distance between two parallel lines; infinite when they are not parallel. */
function lineDistance(
    a: Readonly<{ axis: Vec3; origin: Vec3 }>,
    b: Readonly<{ axis: Vec3; origin: Vec3 }>
): number {
    if (Math.abs(Math.abs(dot(a.axis, b.axis)) - 1) > PARALLEL_EPSILON) return Number.POSITIVE_INFINITY;
    const d = minus(b.origin, a.origin);
    const cross: [number, number, number] = [
        a.axis[1]! * d[2]! - a.axis[2]! * d[1]!,
        a.axis[2]! * d[0]! - a.axis[0]! * d[2]!,
        a.axis[0]! * d[1]! - a.axis[1]! * d[0]!
    ];
    return Math.hypot(cross[0], cross[1], cross[2]);
}

/**
 * Carry a span expressed along `sourceAxis` from `sourceOrigin` into the line's frame.
 *
 * A confirmed span is measured along the interface axis from the interface origin, and that is
 * the male *face's* own record — a different point on the same line for every face. Without this
 * the bands of one wall would be laid end to end from three different zeros.
 */
function spanInLineFrame(
    span: readonly [number, number],
    sourceAxis: readonly number[],
    sourceOrigin: readonly number[],
    line: Readonly<{ axis: Vec3; origin: Vec3 }>
): Band {
    const offset = dot(minus(sourceOrigin, line.origin), line.axis);
    const sense = dot(sourceAxis, line.axis);
    const first = offset + sense * span[0]!;
    const second = offset + sense * span[1]!;
    return first <= second ? [first, second] : [second, first];
}

/** Lay intervals end to end, joining any two that meet or overlap within `gapMm`. */
function mergeBands(intervals: readonly Band[], gapMm: number): Band[] {
    const sorted = [...intervals].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
    const merged: [number, number][] = [];
    for (const interval of sorted) {
        const previous = merged[merged.length - 1];
        if (previous !== undefined && interval[0]! <= previous[1]! + gapMm) {
            previous[1] = Math.max(previous[1]!, interval[1]!);
        } else {
            merged.push([interval[0]!, interval[1]!]);
        }
    }
    return merged;
}

function sortedUnique<T>(items: readonly T[], key: (item: T) => string, order: (a: T, b: T) => number): T[] {
    const seen = new Map<string, T>();
    for (const item of items) {
        if (!seen.has(key(item))) seen.set(key(item), item);
    }
    return [...seen.values()].sort(order);
}

type Line = {
    axis: Vec3;
    origin: Vec3;
    members: ConfirmedInterface[];
    maxOffsetMm: number;
};

function pieceKey(joint: ConfirmedInterface): string {
    return [joint.source.male.occurrenceId, joint.source.female.occurrenceId].sort().join('\u0000');
}

/** Fold confirmed face pairs into one joint per piece pair per axis line. */
export function aggregateJoints(
    confirmed: readonly ConfirmedInterface[],
    options: JointOptions = {}
): JointReport {
    const axisToleranceMm = options.axisToleranceMm ?? AXIS_TOLERANCE_MM;
    const bandGapMm = options.bandGapMm ?? BAND_GAP_MM;
    const ordered = [...confirmed].sort((a, b) => (a.source.id < b.source.id ? -1 : a.source.id > b.source.id ? 1 : 0));

    const byPieces = new Map<string, ConfirmedInterface[]>();
    for (const joint of ordered) {
        const key = pieceKey(joint);
        const bucket = byPieces.get(key);
        if (bucket === undefined) byPieces.set(key, [joint]);
        else bucket.push(joint);
    }

    const joints: Joint[] = [];
    const ambiguous: { pieces: readonly [string, string]; lines: number }[] = [];

    for (const [key, members] of byPieces) {
        const pieces = key.split('\u0000').sort() as [string, string];
        const lines: Line[] = [];
        for (const member of members) {
            const probe = {
                axis: canonicalAxis(member.source.axis),
                origin: canonicalOrigin(canonicalAxis(member.source.axis), member.source.origin)
            };
            let best: { line: Line; distance: number } | undefined;
            for (const line of lines) {
                const distance = lineDistance(line, probe);
                if (distance <= axisToleranceMm && (best === undefined || distance < best.distance)) {
                    best = { line, distance };
                }
            }
            if (best === undefined) {
                lines.push({ ...probe, members: [member], maxOffsetMm: 0 });
            } else {
                best.line.members.push(member);
                best.line.maxOffsetMm = Math.max(best.line.maxOffsetMm, best.distance);
            }
        }

        // Ordinal by where the grip starts, so the ids do not depend on which line was found first.
        const measured = lines.map((line) => {
            const inLine = (span: readonly [number, number], member: ConfirmedInterface): Band =>
                spanInLineFrame(span, member.source.axis, member.source.origin, line);
            const bands = mergeBands(
                line.members.map((member) => inLine(member.contactSpanMm, member)),
                bandGapMm
            );
            const holders = line.members.map((member) => inLine(member.holderSpanMm, member));
            const holderSpanMm: [number, number] = [
                Math.min(...holders.map((holder) => holder[0]!)),
                Math.max(...holders.map((holder) => holder[1]!))
            ];
            const span: [number, number] = [
                Math.min(...bands.map((band) => band[0]!)),
                Math.max(...bands.map((band) => band[1]!))
            ];
            return { line, bands, span, holderSpanMm };
        });
        measured.sort((a, b) => a.span[0]! - b.span[0]! || a.span[1]! - b.span[1]!);
        if (measured.length > 1) ambiguous.push({ pieces, lines: measured.length });

        measured.forEach(({ line, bands, span, holderSpanMm }, index) => {
            const engagementMm = bands.reduce((total, band) => total + (band[1]! - band[0]!), 0);
            // The dominant fit decides the kind, because that is the one the stroke must overcome.
            const dominant = [...line.members].sort(
                (a, b) => b.engagementMm - a.engagementMm || (a.source.id < b.source.id ? -1 : 1)
            )[0]!;
            joints.push({
                id: `jnt:${pieces[0]}:${pieces[1]}:${index}`,
                pieces,
                kind: dominant.source.kind,
                axis: line.axis,
                origin: line.origin,
                releaseDirections: [line.axis, [-line.axis[0], -line.axis[1], -line.axis[2]] as Vec3],
                spanMm: span,
                bands,
                holderSpanMm,
                engagementMm: engagementMm,
                contactMm: line.members.reduce((max, member) => Math.max(max, member.contactMm), 0),
                axisOffsetMm: line.maxOffsetMm,
                radii: sortedUnique(
                    line.members.map((member) => ({
                        maleMm: member.source.male.radiusMm,
                        femaleMm: member.source.female.radiusMm
                    })),
                    (entry) => `${entry.maleMm}/${entry.femaleMm}`,
                    (a, b) => a.maleMm - b.maleMm || a.femaleMm - b.femaleMm
                ),
                roles: sortedUnique(
                    line.members.map((member) => ({
                        maleOccurrenceId: member.source.male.occurrenceId,
                        femaleOccurrenceId: member.source.female.occurrenceId
                    })),
                    (entry) => `${entry.maleOccurrenceId}>${entry.femaleOccurrenceId}`,
                    (a, b) => (a.maleOccurrenceId < b.maleOccurrenceId ? -1 : a.maleOccurrenceId > b.maleOccurrenceId ? 1 : 0)
                ),
                faces: sortedUnique(
                    line.members.map((member) => ({
                        id: member.source.id,
                        maleEntityId: member.source.male.sourceEntityId,
                        femaleEntityId: member.source.female.sourceEntityId
                    })),
                    (entry) => entry.id,
                    (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
                )
            });
        });
    }

    return {
        axisToleranceMm,
        bandGapMm,
        facePairJoints: confirmed.length,
        joints: joints.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
        ambiguous: ambiguous.sort((a, b) => (a.pieces[0] < b.pieces[0] ? -1 : 1))
    };
}
