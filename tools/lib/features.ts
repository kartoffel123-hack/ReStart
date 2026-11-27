/**
 * Candidate interface features per part definition (implementation plan §3C step 1).
 *
 * Moves are generated from geometry, so this is the layer that decides what geometry the
 * generator is allowed to talk about. It reads the pinned AP203 snapshot's own surface
 * entities — cylindrical axes first, because a Technic pin, axle, bush, beam hole and hub all
 * present as cylinders — and reports them in the part's own frame with the STEP entity label
 * they came from, so every later claim ("this pin slides out along its axis") can be traced to
 * a face in the supplied CAD. Nothing here decides which motion is admissible; that is the
 * next package, and it must cite these IDs.
 *
 * Build-side only: this reads the STEP source, which never ships in the web bundle.
 */
import { argsOf, entityOf, entitiesOfType, refAt, type StepEntity, type StepIndex, type StepValue } from './step-file.js';
import { STEP_SHA256, type AssemblyTree, type Placement, type Vec3 } from './step-tree.js';

export type SurfaceKind = 'cylinder' | 'plane' | 'toroid' | 'cone' | 'bounded' | 'bspline' | 'other';

const SURFACE_KINDS: Readonly<Record<string, SurfaceKind>> = {
    CYLINDRICAL_SURFACE: 'cylinder',
    PLANE: 'plane',
    TOROIDAL_SURFACE: 'toroid',
    CONICAL_SURFACE: 'cone',
    BOUNDED_SURFACE: 'bounded',
    B_SPLINE_SURFACE: 'bspline',
    B_SPLINE_SURFACE_WITH_KNOTS: 'bspline'
};

export type CylindricalFeature = Readonly<{
    /** STEP entity label, e.g. `#112`, so a review can point at the face it means. */
    sourceEntityId: string;
    radiusMm: number;
    /** A point on the axis, in the definition's own frame, millimetres. */
    originMm: Vec3;
    /** Unit axis direction in the definition's own frame. */
    axis: Vec3;
}>;

export type TravelAxis = Readonly<{
    /** Canonicalised so `+a` and `-a` are one axis. */
    axis: Vec3;
    /** A cylinder has no inherent sense: both ends are offered, never one chosen silently. */
    opposite: Vec3;
    cylinderCount: number;
    maxRadiusMm: number;
}>;

export type DefinitionFeatures = Readonly<{
    /** Definition identity from the assembly tree, e.g. `pd:4817`. */
    definitionId: string;
    name: string;
    brepEntityId: string;
    surfaceCount: number;
    surfaceCounts: Readonly<Record<SurfaceKind, number>>;
    cylinders: readonly CylindricalFeature[];
    travelAxes: readonly TravelAxis[];
}>;

export type FeatureDiagnosticCode =
    | 'missing-shape-representation'
    | 'definition-without-brep'
    | 'unreachable-surface-entity'
    | 'degenerate-cylinder-axis'
    | 'non-positive-radius'
    | 'surface-shared-between-definitions';

export type FeatureDiagnostic = Readonly<{
    code: FeatureDiagnosticCode;
    message: string;
    entityId?: number;
    definitionId?: string;
}>;

export type FeatureTable = Readonly<{
    /** `STEP_SHA256`; the table is only valid for the revision it was read from. */
    sourceRevision: string;
    definitions: readonly DefinitionFeatures[];
    diagnostics: readonly FeatureDiagnostic[];
}>;

function numberAt(entity: StepEntity | undefined, position: number): number | undefined {
    const value = argsOf(entity)[position] as StepValue | undefined;
    return typeof value === 'number' ? value : undefined;
}

function pointOf(index: StepIndex, id: number | undefined): Vec3 | undefined {
    const entity = entityOf(index, id);
    if (entity === undefined || entity.type !== 'CARTESIAN_POINT') return undefined;
    const coords = argsOf(entity)[1];
    const list = Array.isArray(coords) ? coords : [coords];
    const read = (position: number): number => {
        const value = list[position] as StepValue | undefined;
        return typeof value === 'number' ? value : 0;
    };
    return [read(0), read(1), read(2)];
}

function directionOf(index: StepIndex, id: number | undefined): Vec3 | undefined {
    const entity = entityOf(index, id);
    if (entity === undefined || entity.type !== 'DIRECTION') return undefined;
    const coords = argsOf(entity)[1];
    const list = Array.isArray(coords) ? coords : [coords];
    const read = (position: number): number => {
        const value = list[position] as StepValue | undefined;
        return typeof value === 'number' ? value : 0;
    };
    return [read(0), read(1), read(2)];
}

const length = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);

function unit(v: Vec3): Vec3 {
    const magnitude = length(v);
    return [v[0] / magnitude, v[1] / magnitude, v[2] / magnitude];
}

/** Fold an axis to a canonical sense so opposite directions group together. */
function canonicalAxis(v: Vec3): Vec3 {
    const u = unit(v);
    const [x, y, z] = u;
    const lead = Math.abs(x!) >= Math.abs(y!) && Math.abs(x!) >= Math.abs(z!) ? x! : Math.abs(y!) >= Math.abs(z!) ? y! : z!;
    if (lead < 0) return [-x!, -y!, -z!];
    if (lead === 0) return u;
    return u;
}

const nearlyParallel = (a: Vec3, b: Vec3): boolean =>
    Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) > 0.9999;

const EMPTY_COUNTS: Readonly<Record<SurfaceKind, number>> = Object.freeze({
    cylinder: 0,
    plane: 0,
    toroid: 0,
    cone: 0,
    bounded: 0,
    bspline: 0,
    other: 0
});

/** The reference list at an argument position, whether the file wrote a list or one value. */
function refsAt(entity: StepEntity | undefined, position: number): number[] {
    if (entity === undefined) return [];
    const value = argsOf(entity)[position] as StepValue | undefined;
    if (Array.isArray(value)) {
        return value.flatMap((item) => (typeof item === 'object' && item !== null && 'ref' in item ? [(item as { ref: number }).ref] : []));
    }
    if (typeof value === 'object' && value !== null && 'ref' in value) return [(value as { ref: number }).ref];
    return [];
}

/** Faces of one manifold solid brep, as the surface entities those faces are bounded by. */
function surfacesOfBrep(index: StepIndex, brepId: number): { ids: number[]; missing: number[] } {
    const ids: number[] = [];
    const missing: number[] = [];
    const brep = entityOf(index, brepId);
    for (const itemId of refsAt(brep, 1)) {
        const item = entityOf(index, itemId);
        if (item === undefined || item.type !== 'MANIFOLD_SOLID_BREP') continue;
        for (const shellId of refsAt(item, 1)) {
            for (const faceId of refsAt(entityOf(index, shellId), 1)) {
                const surfaceId = refAt(entityOf(index, faceId), 2);
                if (surfaceId === undefined) {
                    missing.push(faceId);
                    continue;
                }
                ids.push(surfaceId);
            }
        }
    }
    return { ids, missing };
}

/**
 * PRODUCT_DEFINITION -> its shape representation, following the links the file itself states.
 *
 * `SHAPE_DEFINITION_REPRESENTATION` joins a `PRODUCT_DEFINITION_SHAPE` to a representation, and
 * that shape names the product definition it shapes. Keying on the definition — not on the
 * shape — is what matches the assembly tree, whose definition identity is `pd:<this id>`. The
 * usage-level shapes in the same file point at `NEXT_ASSEMBLY_USAGE_OCCURRENCE` instead and
 * would resolve to nothing.
 */
function representationsByDefinition(index: StepIndex): Map<number, number> {
    const links = new Map<number, number>();
    for (const link of entitiesOfType(index, 'SHAPE_DEFINITION_REPRESENTATION')) {
        const shape = entityOf(index, refAt(link, 0));
        const definition = shape === undefined ? undefined : refAt(shape, 2);
        const representation = refAt(link, 1);
        if (definition === undefined || representation === undefined) continue;
        links.set(definition, representation);
    }
    return links;
}

/**
 * Definition shape representation -> the B-rep that carries its faces.
 *
 * The definition's own `SHAPE_REPRESENTATION` holds nothing but its placement; the topology
 * hangs off a separate `ADVANCED_BREP_SHAPE_REPRESENTATION`, and the file says which belongs to
 * which in a `SHAPE_REPRESENTATION_RELATIONSHIP` whose third argument is the shape
 * representation and fourth the B-rep. The other relationships of the same type join usage
 * transforms and are skipped by that argument test rather than by a count.
 */
function brepsByShapeRepresentation(index: StepIndex): Map<number, number> {
    const breps = new Set<number>(entitiesOfType(index, 'ADVANCED_BREP_SHAPE_REPRESENTATION').map((entity) => entity.id));
    const links = new Map<number, number>();
    for (const relation of entitiesOfType(index, 'SHAPE_REPRESENTATION_RELATIONSHIP')) {
        const parent = refAt(relation, 2);
        const child = refAt(relation, 3);
        if (parent === undefined || child === undefined) continue;
        if (!breps.has(child)) continue;
        links.set(parent, child);
    }
    return links;
}

/** PRODUCT_DEFINITION -> the B-rep holding that definition's faces. */
function brepsByDefinition(index: StepIndex): Map<number, number> {
    const shapeReps = representationsByDefinition(index);
    const breps = brepsByShapeRepresentation(index);
    const byDefinition = new Map<number, number>();
    for (const [definition, shapeRepresentation] of shapeReps) {
        const brep = breps.get(shapeRepresentation);
        if (brep !== undefined) byDefinition.set(definition, brep);
    }
    return byDefinition;
}

function cylinderOf(
    index: StepIndex,
    entity: StepEntity,
    definitionId: string,
    diagnostics: FeatureDiagnostic[]
): CylindricalFeature | undefined {
    const radius = numberAt(entity, 2);
    if (radius === undefined || !(radius > 0)) {
        diagnostics.push({
            code: 'non-positive-radius',
            message: `${entity.id} has no positive radius`,
            entityId: entity.id,
            definitionId
        });
        return undefined;
    }
    const placement = entityOf(index, refAt(entity, 1));
    const origin = pointOf(index, refAt(placement, 1));
    const axis = directionOf(index, refAt(placement, 2));
    if (origin === undefined || axis === undefined || length(axis) < 1e-12) {
        diagnostics.push({
            code: 'degenerate-cylinder-axis',
            message: `${entity.id} has no usable axis placement`,
            entityId: entity.id,
            definitionId
        });
        return undefined;
    }
    return { sourceEntityId: `#${entity.id}`, radiusMm: radius, originMm: origin, axis: unit(axis) };
}

function travelAxesOf(cylinders: readonly CylindricalFeature[]): TravelAxis[] {
    const grouped: { axis: Vec3; cylinderCount: number; maxRadiusMm: number }[] = [];
    for (const cylinder of cylinders) {
        const axis = canonicalAxis(cylinder.axis);
        const match = grouped.find((entry) => nearlyParallel(entry.axis, axis));
        if (match === undefined) grouped.push({ axis, cylinderCount: 1, maxRadiusMm: cylinder.radiusMm });
        else {
            match.cylinderCount += 1;
            match.maxRadiusMm = Math.max(match.maxRadiusMm, cylinder.radiusMm);
        }
    }
    return grouped
        .sort(
            (a, b) =>
                b.cylinderCount - a.cylinderCount ||
                a.axis[0] - b.axis[0] ||
                a.axis[1] - b.axis[1] ||
                a.axis[2] - b.axis[2]
        )
        .map((entry) =>
            Object.freeze({
                axis: entry.axis,
                opposite: [-entry.axis[0], -entry.axis[1], -entry.axis[2]] as Vec3,
                cylinderCount: entry.cylinderCount,
                maxRadiusMm: entry.maxRadiusMm
            })
        );
}

/**
 * Read the candidate feature table for every leaf definition of the tree.
 *
 * Definitions are visited in tree order and their features sorted, so two runs over the same
 * source produce byte-identical output: the generated moves have to be reproducible from the
 * dataset revision alone.
 */
export function extractFeatureTable(index: StepIndex, tree: AssemblyTree): FeatureTable {
    const diagnostics: FeatureDiagnostic[] = [];
    const links = brepsByDefinition(index);
    const byDefinition = new Map<string, { name: string; brepId: number }>();
    const ownerOfSurface = new Map<number, string>();

    for (const occurrence of tree.occurrences) {
        const known = byDefinition.get(occurrence.definitionId);
        if (known !== undefined) continue;
        const representation = links.get(occurrence.source.productDefinition);
        if (representation === undefined) {
            diagnostics.push({
                code: 'missing-shape-representation',
                message: `${occurrence.definitionId} has no shape definition representation`,
                entityId: occurrence.source.productDefinition,
                definitionId: occurrence.definitionId
            });
            continue;
        }
        byDefinition.set(occurrence.definitionId, { name: occurrence.name, brepId: representation });
    }

    const definitions: DefinitionFeatures[] = [];
    for (const [definitionId, geometry] of [...byDefinition.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const { ids, missing } = surfacesOfBrep(index, geometry.brepId);
        for (const faceId of missing) {
            diagnostics.push({
                code: 'unreachable-surface-entity',
                message: `a face of #${geometry.brepId} names no surface`,
                entityId: faceId,
                definitionId
            });
        }
        const counts: Record<SurfaceKind, number> = { ...EMPTY_COUNTS };
        const cylinders: CylindricalFeature[] = [];
        const seen = new Set<number>();
        for (const surfaceId of ids) {
            if (seen.has(surfaceId)) continue;
            seen.add(surfaceId);
            const owner = ownerOfSurface.get(surfaceId);
            if (owner !== undefined && owner !== definitionId) {
                diagnostics.push({
                    code: 'surface-shared-between-definitions',
                    message: `#${surfaceId} is bounded by ${owner} and ${definitionId}`,
                    entityId: surfaceId,
                    definitionId
                });
                continue;
            }
            ownerOfSurface.set(surfaceId, definitionId);
            const entity = entityOf(index, surfaceId);
            const kind = SURFACE_KINDS[entity?.type ?? ''] ?? 'other';
            counts[kind] += 1;
            if (entity === undefined || entity.type !== 'CYLINDRICAL_SURFACE') continue;
            const feature = cylinderOf(index, entity, definitionId, diagnostics);
            if (feature !== undefined) cylinders.push(feature);
        }
        cylinders.sort((a, b) => Number(a.sourceEntityId.slice(1)) - Number(b.sourceEntityId.slice(1)));
        definitions.push(
            Object.freeze({
                definitionId,
                name: geometry.name,
                brepEntityId: `#${geometry.brepId}`,
                surfaceCount: seen.size,
                surfaceCounts: Object.freeze(counts),
                cylinders: Object.freeze(cylinders),
                travelAxes: Object.freeze(travelAxesOf(cylinders))
            })
        );
    }

    return Object.freeze({
        sourceRevision: tree.sourceRevision,
        definitions: Object.freeze(definitions),
        diagnostics: Object.freeze(diagnostics)
    });
}

/** Rotate and translate a feature into assembly coordinates. Radii are lengths, not vectors. */
export function featureInWorld(
    feature: CylindricalFeature,
    placement: Placement
): Readonly<{ radiusMm: number; origin: Vec3; axis: Vec3 }> {
    const rotate = (v: Vec3): Vec3 => [
        placement.xAxis[0] * v[0] + placement.yAxis[0] * v[1] + placement.zAxis[0] * v[2],
        placement.xAxis[1] * v[0] + placement.yAxis[1] * v[1] + placement.zAxis[1] * v[2],
        placement.xAxis[2] * v[0] + placement.yAxis[2] * v[1] + placement.zAxis[2] * v[2]
    ];
    const rotated = rotate(feature.originMm);
    const axis = rotate(feature.axis);
    const origin: Vec3 = [
        rotated[0] + placement.translation[0],
        rotated[1] + placement.translation[1],
        rotated[2] + placement.translation[2]
    ];
    return Object.freeze({
        radiusMm: feature.radiusMm,
        origin,
        axis: length(axis) < 1e-12 ? axis : unit(axis)
    });
}

export { STEP_SHA256 };
