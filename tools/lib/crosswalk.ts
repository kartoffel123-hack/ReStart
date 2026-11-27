/**
 * Ticket 1 · V01 · identity crosswalk (plan 02 §3A.4, plan 03 §4 V01).
 *
 * The hierarchy says there are 70 pieces and the tessellator says there are 70 meshes, but
 * neither statement alone proves that *this* mesh is *that* piece. This module decides it
 * from geometry: transform each definition's topological vertex points into assembly
 * coordinates, round to 0.01 mm, and score them against the unique vertex keys of every
 * same-name tessellated mesh.
 *
 * A curved surface tessellates to more points than the B-rep has vertices, so a score of
 * 1.0 is not expected; the plan measured a lowest winning fraction of 0.9912 on this
 * revision. What must hold is a single clear winner: score ≥ 0.95 and a margin over the
 * best same-name runner-up ≥ 0.25. Anything else is reported as an issue naming the
 * candidates, because a guessed mapping would silently attach the wrong geometry to a
 * repair route.
 */
import type { Occurrence, Vec3 } from './step-tree.js';
import { worldVertices } from './step-tree.js';
import type { TessellatedMesh } from './step-meshes.js';

/** Rounding step for a vertex key. Plan §3A.4. */
export const VERTEX_KEY_TOLERANCE_MM = 0.01;
export const MIN_MATCH_SCORE = 0.95;
export const MIN_MATCH_MARGIN = 0.25;

/** One vertex, quantised so two sources agree without floating-point comparison. */
export function vertexKey(point: Vec3): string {
    return point.map((value) => Math.round(value / VERTEX_KEY_TOLERANCE_MM)).join(',');
}

export function vertexKeys(points: Iterable<Vec3>): Set<string> {
    const keys = new Set<string>();
    for (const point of points) keys.add(vertexKey(point));
    return keys;
}

/** Unique vertex keys of one tessellated mesh, in assembly millimetres. */
export function meshVertexKeys(mesh: TessellatedMesh): Set<string> {
    const keys = new Set<string>();
    const positions = mesh.positions;
    for (let offset = 0; offset + 2 < positions.length; offset += 3) {
        keys.add(
            [
                Math.round((positions[offset] as number) / VERTEX_KEY_TOLERANCE_MM),
                Math.round((positions[offset + 1] as number) / VERTEX_KEY_TOLERANCE_MM),
                Math.round((positions[offset + 2] as number) / VERTEX_KEY_TOLERANCE_MM)
            ].join(',')
        );
    }
    return keys;
}

/** matched unique STEP keys / unique selected STEP keys. */
export function matchScore(stepKeys: ReadonlySet<string>, meshKeys: ReadonlySet<string>): number {
    if (stepKeys.size === 0) return 0;
    let matched = 0;
    for (const key of stepKeys) {
        if (meshKeys.has(key)) matched += 1;
    }
    return matched / stepKeys.size;
}

export type Candidate = Readonly<{ meshIndex: number; name: string; score: number }>;

export type CrosswalkEntry = Readonly<{
    occurrenceId: string;
    meshIndex: number;
    score: number;
    /** Best score among the other same-name candidates, 0 when there were none. */
    runnerUpScore: number;
    margin: number;
    stepVertices: number;
    meshVertices: number;
}>;

export type CrosswalkIssueCode =
    | 'no-same-name-mesh'
    | 'low-match-score'
    | 'ambiguous-match'
    | 'contended-mesh'
    | 'unmatched-mesh';

export type CrosswalkIssue = Readonly<{
    code: CrosswalkIssueCode;
    message: string;
    occurrenceId?: string;
    meshIndex?: number;
    candidates: readonly Candidate[];
}>;

export type Crosswalk = Readonly<{
    /** Occurrence ID → mesh index, one-to-one. */
    byOccurrence: ReadonlyMap<string, CrosswalkEntry>;
    entries: readonly CrosswalkEntry[];
    issues: readonly CrosswalkIssue[];
    /** Meshes that no occurrence claimed. */
    unusedMeshes: readonly number[];
}>;

function sortedCandidates(scores: readonly Candidate[]): readonly Candidate[] {
    return [...scores].sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.meshIndex - b.meshIndex
    );
}

/**
 * Match every occurrence to exactly one mesh.
 *
 * Candidate meshes are restricted to the same CAD name, as the plan specifies; a piece of a
 * repeated definition is then separated from its siblings purely by where its vertices land.
 */
export function buildCrosswalk(
    occurrences: readonly Occurrence[],
    meshes: readonly TessellatedMesh[]
): Crosswalk {
    const meshKeys = meshes.map((mesh) => meshVertexKeys(mesh));
    const byName = new Map<string, number[]>();
    meshes.forEach((mesh, index) => {
        const bucket = byName.get(mesh.name);
        if (bucket) bucket.push(index);
        else byName.set(mesh.name, [index]);
    });

    type Scored = Readonly<{ occurrence: Occurrence; ranked: readonly Candidate[]; stepVertices: number }>;
    const scored: Scored[] = [];
    const issues: CrosswalkIssue[] = [];

    for (const occurrence of occurrences) {
        const stepKeys = vertexKeys(worldVertices(occurrence));
        const sameName = byName.get(occurrence.name) ?? [];
        const ranked = sortedCandidates(
            sameName.map((index) => ({
                meshIndex: index,
                name: occurrence.name,
                score: matchScore(stepKeys, meshKeys[index] as Set<string>)
            }))
        );
        if (ranked.length === 0) {
            issues.push({
                code: 'no-same-name-mesh',
                message: `${occurrence.id} (${occurrence.name}) has no tessellated mesh with the same CAD name`,
                occurrenceId: occurrence.id,
                candidates: []
            });
            continue;
        }
        scored.push({ occurrence, ranked, stepVertices: stepKeys.size });
    }

    // Assign the clearest matches first, so an ambiguous piece cannot take the mesh that a
    // confidently matched piece needs and leave it contending.
    scored.sort((a, b) => {
        const first = (a.ranked[0] as Candidate).score;
        const second = (b.ranked[0] as Candidate).score;
        if (first !== second) return second - first;
        return a.occurrence.id < b.occurrence.id ? -1 : 1;
    });

    const byOccurrence = new Map<string, CrosswalkEntry>();
    const claimed = new Map<number, string>();

    for (const entry of scored) {
        const winner = entry.ranked[0] as Candidate;
        const runnerUp = entry.ranked[1]?.score ?? 0;
        const margin = winner.score - runnerUp;
        const meshVertices = (meshes[winner.meshIndex] as TessellatedMesh).positions.length / 3;

        if (winner.score < MIN_MATCH_SCORE) {
            issues.push({
                code: 'low-match-score',
                message: `${entry.occurrence.id} best vertex match is ${winner.score.toFixed(4)} for mesh #${winner.meshIndex}, below ${MIN_MATCH_SCORE}`,
                occurrenceId: entry.occurrence.id,
                meshIndex: winner.meshIndex,
                candidates: entry.ranked
            });
            continue;
        }
        if (margin < MIN_MATCH_MARGIN) {
            issues.push({
                code: 'ambiguous-match',
                message: `${entry.occurrence.id} winner ${winner.score.toFixed(4)} beats runner-up only by ${margin.toFixed(4)}, below ${MIN_MATCH_MARGIN}`,
                occurrenceId: entry.occurrence.id,
                meshIndex: winner.meshIndex,
                candidates: entry.ranked
            });
            continue;
        }
        const holder = claimed.get(winner.meshIndex);
        if (holder !== undefined) {
            issues.push({
                code: 'contended-mesh',
                message: `${entry.occurrence.id} and ${holder} both match mesh #${winner.meshIndex}`,
                occurrenceId: entry.occurrence.id,
                meshIndex: winner.meshIndex,
                candidates: entry.ranked
            });
            continue;
        }
        claimed.set(winner.meshIndex, entry.occurrence.id);
        byOccurrence.set(entry.occurrence.id, {
            occurrenceId: entry.occurrence.id,
            meshIndex: winner.meshIndex,
            score: winner.score,
            runnerUpScore: runnerUp,
            margin,
            stepVertices: entry.stepVertices,
            meshVertices
        });
    }

    const unusedMeshes: number[] = [];
    meshes.forEach((_mesh, index) => {
        if (!claimed.has(index)) {
            unusedMeshes.push(index);
            issues.push({
                code: 'unmatched-mesh',
                message: `mesh #${index} (${_mesh.name}) was not claimed by any occurrence`,
                meshIndex: index,
                candidates: []
            });
        }
    });

    const entries = [...byOccurrence.values()].sort((a, b) => (a.occurrenceId < b.occurrenceId ? -1 : 1));
    return { byOccurrence, entries, issues, unusedMeshes };
}
