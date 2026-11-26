/**
 * Ticket 1 · V01 · occurrence identity and installed poses (plan 02 §3A.1–2, plan 03 §4 V01).
 *
 * Expands the STEP usage structure into physical occurrences. Two placements of one
 * definition are two occurrences with two IDs and two world poses, which is the property
 * the whole dataset rests on: every later ID, route and evidence record is keyed by it.
 *
 * Measured facts about this snapshot (SHA-256 `STEP_SHA256`), re-verified by
 * `tests/data/identity.test.ts`:
 *
 * - 81 `NEXT_ASSEMBLY_USAGE_OCCURRENCE`, 44 `PRODUCT_DEFINITION` (13 of them used as a
 *   parent, so 13 assembly definitions including the root and 31 leaf definitions), and
 *   expanding reused definitions along every path yields exactly 70 leaf occurrences.
 * - Each usage resolves through `PRODUCT_DEFINITION_SHAPE` → `CONTEXT_DEPENDENT_SHAPE_
 *   REPRESENTATION` → a **complex** `SHAPE_REPRESENTATION_RELATIONSHIP`, which supplies the
 *   parent and child representation plus one `ITEM_DEFINED_TRANSFORMATION`. Its two
 *   `AXIS2_PLACEMENT_3D` frames give the child-to-parent pose as
 *   `parent placement × inverse(child placement)`, composed with the parent's world pose.
 * - A leaf definition's geometry is not reachable from its own representation by the usual
 *   placement chain: all 31 leaf B-reps share one identity placement. The unique join is
 *   the **representation context** — each leaf representation context is shared by exactly
 *   one `ADVANCED_BREP_SHAPE_REPRESENTATION`. Matching on the placement would be ambiguous
 *   31 ways, so it is deliberately not used.
 *
 * Pure: the caller supplies the source text; no filesystem, no CAD kernel, no clock.
 */
import {
    argsOf,
    entitiesOfType,
    entityOf,
    refAt,
    refsIn,
    stringAt,
    type StepEntity,
    type StepIndex
} from './step-file.js';

/** SHA-256 of the supplied STEP snapshot. Part of every emitted dataset identity. */
export const STEP_SHA256 = 'e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588';

/** Prefix for every occurrence ID, e.g. `30465/NAUO1/NAUO79`. */
export const MODEL_ID = '30465';

export type Vec3 = readonly [number, number, number];

export type Placement = Readonly<{
    /** Millimetres. */
    translation: Vec3;
    xAxis: Vec3;
    yAxis: Vec3;
    zAxis: Vec3;
    /** `+1` right-handed, `-1` mirrored, `0` when the source axes were degenerate. */
    handedness: number;
}>;

export type Occurrence = Readonly<{
    /** Usage-ID path from the root, e.g. `30465/NAUO1/NAUO79`. */
    id: string;
    /** Usage IDs without the model prefix, root first. */
    usageIds: readonly string[];
    /** ID of the enclosing occurrence, or the model ID at the top level. */
    parentId: string;
    /** Definition identity, stable for one source revision, e.g. `pd:4817`. */
    definitionId: string;
    /** CAD product name from `PRODUCT`, e.g. `Axle - 30465_3 - Long`. */
    name: string;
    /** STEP entity ids behind this occurrence, for evidence traceability. */
    source: Readonly<{ usage: number; productDefinition: number; representation: number }>;
    /** Pose of the part frame inside its parent occurrence's frame. */
    localPlacement: Placement;
    /** Pose of the part frame in assembly coordinates. */
    worldPlacement: Placement;
    /** Axis-aligned bounds of the definition's topological vertices, in the part frame. */
    localBounds: Readonly<{ min: Vec3; max: Vec3; centre: Vec3 }>;
    /** {@link localBounds} transformed into assembly coordinates. */
    boundsMin: Vec3;
    boundsMax: Vec3;
    boundsCentre: Vec3;
    /** `+1` when the world frame is right-handed; catches a flipped or degenerate frame. */
    handedness: number;
    /** Topological vertex points used for the bounds, so a witness can name its source. */
    vertexCount: number;
}>;

/** A subassembly node. Kept apart from physical pieces: a module can move as a unit. */
export type ModuleNode = Readonly<{
    id: string;
    usageIds: readonly string[];
    definitionId: string;
    name: string;
    worldPlacement: Placement;
    childCount: number;
}>;

export type TreeDiagnosticCode =
    | 'cyclic-definition-reference'
    | 'missing-usage-name'
    | 'unresolved-usage-transformation'
    | 'degenerate-placement-frame'
    | 'mirrored-placement-frame'
    | 'missing-definition-geometry'
    | 'ambiguous-definition-geometry'
    | 'multiple-root-definitions'
    | 'unparsable-source-record';

export type TreeDiagnostic = Readonly<{
    code: TreeDiagnosticCode;
    message: string;
    usageId?: string;
    entityId?: number;
}>;

export type AssemblyTree = Readonly<{
    modelId: string;
    /** `STEP_SHA256`; a source change must produce a new revision, not stale review data. */
    sourceRevision: string;
    usageCount: number;
    assemblyDefinitionCount: number;
    leafDefinitionCount: number;
    roots: readonly string[];
    /** The 70 physical pieces. */
    occurrences: readonly Occurrence[];
    /** Subassembly nodes, root excluded. */
    modules: readonly ModuleNode[];
    diagnostics: readonly TreeDiagnostic[];
}>;

type Rotation = Readonly<{ x: Vec3; y: Vec3; z: Vec3 }>;

const IDENTITY_ROTATION: Rotation = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const ORIGIN: Vec3 = [0, 0, 0];

export const IDENTITY_PLACEMENT: Placement = {
    translation: ORIGIN,
    xAxis: IDENTITY_ROTATION.x,
    yAxis: IDENTITY_ROTATION.y,
    zAxis: IDENTITY_ROTATION.z,
    handedness: 1
};

function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** A STEP argument that must be exactly three finite numbers. */
function readVector(values: unknown): Vec3 | null {
    if (!Array.isArray(values) || values.length !== 3) return null;
    const [x, y, z] = values as unknown[];
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return [x, y, z];
}

function normalise(vector: Vec3 | null): Vec3 | null {
    if (!vector) return null;
    const [x, y, z] = vector;
    const length = Math.hypot(x, y, z);
    if (length < 1e-12) return null;
    return [x / length, y / length, z / length];
}

/** Apply a rotation whose columns are the frame axes. */
function rotate(rotation: Rotation, vector: Vec3): Vec3 {
    return [
        rotation.x[0] * vector[0] + rotation.y[0] * vector[1] + rotation.z[0] * vector[2],
        rotation.x[1] * vector[0] + rotation.y[1] * vector[1] + rotation.z[1] * vector[2],
        rotation.x[2] * vector[0] + rotation.y[2] * vector[1] + rotation.z[2] * vector[2]
    ];
}

/** Apply the inverse of a rotation, i.e. project onto each axis column. */
function rotateInverse(rotation: Rotation, vector: Vec3): Vec3 {
    return [dot(rotation.x, vector), dot(rotation.y, vector), dot(rotation.z, vector)];
}

function multiplyRotation(outer: Rotation, inner: Rotation): Rotation {
    return {
        x: rotate(outer, inner.x),
        y: rotate(outer, inner.y),
        z: rotate(outer, inner.z)
    };
}

/** `outer ∘ inner`: a point in inner's child frame lands in outer's parent frame. */
function compose(outer: Placement, inner: Placement): Placement {
    const outerRotation: Rotation = { x: outer.xAxis, y: outer.yAxis, z: outer.zAxis };
    const innerRotation: Rotation = { x: inner.xAxis, y: inner.yAxis, z: inner.zAxis };
    const rotation = multiplyRotation(outerRotation, innerRotation);
    return {
        translation: add(outer.translation, rotate(outerRotation, inner.translation)),
        xAxis: rotation.x,
        yAxis: rotation.y,
        zAxis: rotation.z,
        handedness: outer.handedness * inner.handedness
    };
}

function invert(placement: Placement): Placement {
    const rotation: Rotation = { x: placement.xAxis, y: placement.yAxis, z: placement.zAxis };
    const inverseRotation: Rotation = {
        x: [rotation.x[0], rotation.y[0], rotation.z[0]],
        y: [rotation.x[1], rotation.y[1], rotation.z[1]],
        z: [rotation.x[2], rotation.y[2], rotation.z[2]]
    };
    return {
        translation: rotateInverse(rotation, [-placement.translation[0], -placement.translation[1], -placement.translation[2]]),
        xAxis: inverseRotation.x,
        yAxis: inverseRotation.y,
        zAxis: inverseRotation.z,
        handedness: placement.handedness
    };
}

function determinant(rotation: Rotation): number {
    return dot(cross(rotation.x, rotation.y), rotation.z);
}

const FRAME_TOLERANCE = 1e-6;

type ReadFrame = Readonly<
    | { ok: true; placement: Placement }
    | { ok: false; reason: 'degenerate' | 'mirrored' }
>;

/**
 * Read an `AXIS2_PLACEMENT_3D` as a rigid frame. The source supplies the axis (Z) and a
 * reference direction (X); Y is derived as Z × X.
 *
 * A mirrored source frame is rejected rather than carried, because two mirrored frames
 * compose into a right-handed one: propagating `-1` upward would let a pair of bad frames
 * cancel and report a healthy occurrence.
 */
function readPlacement(index: StepIndex, entityId: number | undefined): ReadFrame {
    const entity = entityOf(index, entityId);
    if (!entity || !entity.types.includes('AXIS2_PLACEMENT_3D')) return { ok: false, reason: 'degenerate' };
    const translation = readVector(argsOf(entityOf(index, refAt(entity, 1)))[1]);
    if (!translation) return { ok: false, reason: 'degenerate' };
    const axis = normalise(readVector(argsOf(entityOf(index, refAt(entity, 2)))[1]));
    if (!axis) return { ok: false, reason: 'degenerate' };

    // The reference direction need not be perpendicular to the axis: remove its axial
    // component first, otherwise a slightly skewed export tilts the whole subtree.
    const raw = readVector(argsOf(entityOf(index, refAt(entity, 3)))[1]);
    if (!raw) return { ok: false, reason: 'degenerate' };
    const axial = dot(raw, axis);
    const orthogonal: Vec3 = [
        raw[0] - axial * axis[0],
        raw[1] - axial * axis[1],
        raw[2] - axial * axis[2]
    ];
    const x = normalise(orthogonal);
    if (!x) return { ok: false, reason: 'degenerate' };
    const y = cross(axis, x);
    const rotation: Rotation = { x, y, z: axis };
    const det = determinant(rotation);
    if (Math.abs(Math.abs(det) - 1) > FRAME_TOLERANCE) return { ok: false, reason: 'degenerate' };
    if (det < 0) return { ok: false, reason: 'mirrored' };
    return { ok: true, placement: { translation, xAxis: x, yAxis: y, zAxis: axis, handedness: 1 } };
}

/** Names come from `PRODUCT`, reached through the definition's formation. */
function definitionName(index: StepIndex, productDefinition: StepEntity): string {
    const formation = entityOf(index, refAt(productDefinition, 2));
    const product = entityOf(index, refAt(formation, 2));
    return stringAt(product, 0) ?? `unnamed-definition-${productDefinition.id}`;
}

const GEOMETRY_CONTAINER_TYPES = new Set([
    'MANIFOLD_SOLID_BREP',
    'BREP_WITH_VOIDS',
    'CLOSED_SHELL',
    'OPEN_SHELL',
    'SHELL_BASED_SURFACE_MODEL',
    'ADVANCED_FACE',
    'FACE_OUTER_BOUND',
    'FACE_INNER_BOUND',
    'FACE_BOUND',
    'OUTER_BOUND_CURVE',
    'BOUNDED_SURFACE',
    'EDGE_LOOP',
    'ORIENTED_EDGE',
    'EDGE_CURVE'
]);

/**
 * Unique topological `VERTEX_POINT` coordinates of one B-rep, in the part frame.
 *
 * Only topology containers are traversed, so a curve's own control points (`LINE` origins,
 * `CIRCLE` centres) never enter the set: the plan requires the topological vertices.
 */
function definitionVertices(index: StepIndex, brepShapeRepresentation: StepEntity): readonly Vec3[] {
    const items = argsOf(brepShapeRepresentation)[1];
    if (!Array.isArray(items)) return [];
    const seen = new Set<number>();
    const visited = new Set<number>();
    const queue: number[] = [];
    for (const item of items) {
        if (item !== null && typeof item === 'object' && 'ref' in item) queue.push(item.ref);
    }
    while (queue.length > 0) {
        const id = queue.shift() as number;
        if (visited.has(id)) continue;
        visited.add(id);
        const entity = entityOf(index, id);
        if (!entity) continue;
        if (entity.types.includes('AXIS2_PLACEMENT_3D')) continue;
        if (entity.types.includes('VERTEX_POINT')) {
            if (seen.has(id)) continue;
            seen.add(id);
            continue;
        }
        if (!entity.types.some((type) => GEOMETRY_CONTAINER_TYPES.has(type))) continue;
        for (const constituent of entity.constituents) {
            for (const reference of refsIn(constituent.args)) queue.push(reference);
        }
    }

    const points: Vec3[] = [];
    const usedCoordinates = new Set<string>();
    for (const vertexId of seen) {
        const point = entityOf(index, refAt(entityOf(index, vertexId), 1));
        const values = argsOf(point)[1];
        if (!Array.isArray(values)) continue;
        const coordinate = readVector(values);
        if (!coordinate) continue;
        const key = coordinate.map((value) => value.toFixed(6)).join(',');
        if (usedCoordinates.has(key)) continue;
        usedCoordinates.add(key);
        points.push(coordinate);
    }
    return points;
}

type Bounds = Readonly<{ min: Vec3; max: Vec3; centre: Vec3 }>;

function boundsOf(points: readonly Vec3[]): Bounds | null {
    if (points.length === 0) return null;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const point of points) {
        for (let axis = 0; axis < 3; axis += 1) {
            const value = point[axis] as number;
            if (value < (min[axis] as number)) min[axis] = value;
            if (value > (max[axis] as number)) max[axis] = value;
        }
    }
    return {
        min: [min[0] as number, min[1] as number, min[2] as number],
        max: [max[0] as number, max[1] as number, max[2] as number],
        centre: [
            ((min[0] as number) + (max[0] as number)) / 2,
            ((min[1] as number) + (max[1] as number)) / 2,
            ((min[2] as number) + (max[2] as number)) / 2
        ]
    };
}

/** Numeric-aware so `NAUO2` sorts before `NAUO10`; keeps expansion order reproducible. */
function compareUsageNames(a: string, b: string): number {
    const split = /(\d+)/.exec(a);
    const digits = split?.[1];
    const numeric = digits === undefined ? Number.NaN : Number(digits);
    const other = /(\d+)/.exec(b)?.[1];
    const otherNumeric = other === undefined ? Number.NaN : Number(other);
    if (Number.isFinite(numeric) && Number.isFinite(otherNumeric) && numeric !== otherNumeric) {
        return numeric - otherNumeric;
    }
    return a < b ? -1 : a > b ? 1 : 0;
}

type ResolvedUsage = Readonly<{
    entity: StepEntity;
    usageId: string;
    parentDefinition: number;
    childDefinition: number;
    /** Child-to-parent pose: parent placement × inverse(child placement). */
    childToParent: Placement;
    /** The usage's child representation, for evidence traceability. */
    representation: number;
}>;

/** `PRODUCT_DEFINITION_SHAPE` of a usage (its third argument is the NAUO, not a definition). */
function indexUsageShapes(index: StepIndex): Map<number, number> {
    const byUsage = new Map<number, number>();
    for (const shape of entitiesOfType(index, 'PRODUCT_DEFINITION_SHAPE')) {
        const definition = refAt(shape, 2);
        if (definition === undefined) continue;
        if (entityOf(index, definition)?.types.includes('NEXT_ASSEMBLY_USAGE_OCCURRENCE')) {
            byUsage.set(definition, shape.id);
        }
    }
    return byUsage;
}

function indexTransformations(index: StepIndex): Map<number, { parent: number; child: number }> {
    const byProductDefinitionShape = new Map<number, { parent: number; child: number }>();
    for (const relationship of entitiesOfType(index, 'CONTEXT_DEPENDENT_SHAPE_REPRESENTATION')) {
        const shapeRelationship = entityOf(index, refAt(relationship, 0));
        const productDefinitionShape = refAt(relationship, 1);
        if (!shapeRelationship || productDefinitionShape === undefined) continue;
        const transformationRef = shapeRelationship.constituents
            .find((constituent) => constituent.type === 'REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION')
            ?.args[0];
        const transformation = entityOf(
            index,
            transformationRef !== null && typeof transformationRef === 'object' && 'ref' in transformationRef
                ? transformationRef.ref
                : undefined
        );
        if (!transformation) continue;
        byProductDefinitionShape.set(productDefinitionShape, {
            parent: refAt(transformation, 2) as number,
            child: refAt(transformation, 3) as number
        });
    }
    return byProductDefinitionShape;
}

/** Leaf definition → its unique `ADVANCED_BREP_SHAPE_REPRESENTATION`, joined by context. */
function indexDefinitionGeometry(index: StepIndex): Map<number, StepEntity> {
    const byContext = new Map<number, StepEntity[]>();
    for (const brep of entitiesOfType(index, 'ADVANCED_BREP_SHAPE_REPRESENTATION')) {
        const context = refAt(brep, 2);
        if (context === undefined) continue;
        const bucket = byContext.get(context);
        if (bucket) bucket.push(brep);
        else byContext.set(context, [brep]);
    }

    const definitionShapes = entitiesOfType(index, 'PRODUCT_DEFINITION_SHAPE').filter(
        (shape) => entityOf(index, refAt(shape, 2))?.types.includes('PRODUCT_DEFINITION')
    );
    const shapesById = new Map(definitionShapes.map((shape) => [shape.id, shape] as const));

    const resolved = new Map<number, StepEntity>();
    for (const relationship of entitiesOfType(index, 'SHAPE_DEFINITION_REPRESENTATION')) {
        const shape = shapesById.get(refAt(relationship, 0) ?? -1);
        if (!shape) continue;
        const definition = refAt(shape, 2);
        const representation = entityOf(index, refAt(relationship, 1));
        if (definition === undefined || !representation) continue;
        if (representation.types.includes('ADVANCED_BREP_SHAPE_REPRESENTATION')) {
            resolved.set(definition, representation);
            continue;
        }
        const context = refAt(representation, 2);
        const candidates = context === undefined ? undefined : byContext.get(context);
        if (candidates && candidates.length === 1) {
            const brep = candidates[0] as StepEntity;
            resolved.set(definition, brep);
        }
    }
    return resolved;
}

/**
 * Expand the snapshot into occurrences. Nothing is inferred beyond the source: a usage
 * whose transformation cannot be resolved is reported, and its subtree is skipped, so a
 * silent geometry change surfaces as a coverage gap rather than a plausible wrong pose.
 */
export function buildAssemblyTree(index: StepIndex): AssemblyTree {
    const diagnostics: TreeDiagnostic[] = [];
    // A record the index could not parse is a source-revision change, not a detail: surface
    // it here so an importer cannot quietly publish a package with a hole in it.
    for (const diagnostic of index.diagnostics) {
        diagnostics.push({
            code: 'unparsable-source-record',
            message: `${diagnostic.code}: ${diagnostic.message}`,
            ...(diagnostic.entityId === undefined ? {} : { entityId: diagnostic.entityId })
        });
    }
    const definitions = new Map<number, StepEntity>();
    for (const definition of entitiesOfType(index, 'PRODUCT_DEFINITION')) {
        definitions.set(definition.id, definition);
    }

    const usageShapes = indexUsageShapes(index);
    const transformations = indexTransformations(index);
    const geometry = indexDefinitionGeometry(index);

    const childrenByParent = new Map<number, StepEntity[]>();
    const childDefinitions = new Set<number>();
    const usages = entitiesOfType(index, 'NEXT_ASSEMBLY_USAGE_OCCURRENCE');
    for (const usage of usages) {
        const parent = refAt(usage, 3);
        const child = refAt(usage, 4);
        if (parent === undefined || child === undefined) continue;
        const bucket = childrenByParent.get(parent);
        if (bucket) bucket.push(usage);
        else childrenByParent.set(parent, [usage]);
        childDefinitions.add(child);
    }

    const roots = [...definitions.values()].filter((definition) => !childDefinitions.has(definition.id));
    if (roots.length !== 1) {
        diagnostics.push({
            code: 'multiple-root-definitions',
            message: `Expected exactly one root definition, found ${roots.length}`
        });
    }

    const assemblyDefinitions = new Set(childrenByParent.keys());
    const leafDefinitions = [...definitions.values()].filter((definition) => !childrenByParent.has(definition.id));

    const occurrences: Occurrence[] = [];
    const modules: ModuleNode[] = [];

    const resolveUsage = (usage: StepEntity): ResolvedUsage | null => {
        const usageId = stringAt(usage, 0)?.trim();
        if (!usageId) {
            diagnostics.push({ code: 'missing-usage-name', message: `Usage #${usage.id} has no name`, entityId: usage.id });
            return null;
        }
        const shape = usageShapes.get(usage.id);
        const frames = shape === undefined ? undefined : transformations.get(shape);
        if (!frames) {
            diagnostics.push({
                code: 'unresolved-usage-transformation',
                message: `Usage ${usageId} (#${usage.id}) has no resolvable ITEM_DEFINED_TRANSFORMATION`,
                usageId,
                entityId: usage.id
            });
            return null;
        }
        const parentFrame = readPlacement(index, frames.parent);
        const childFrame = readPlacement(index, frames.child);
        if (!parentFrame.ok || !childFrame.ok) {
            const reason =
                parentFrame.ok === false ? parentFrame.reason : childFrame.ok === false ? childFrame.reason : 'degenerate';
            diagnostics.push({
                code: reason === 'mirrored' ? 'mirrored-placement-frame' : 'degenerate-placement-frame',
                message: `Usage ${usageId} (#${usage.id}) has an unusable placement frame (${reason})`,
                usageId,
                entityId: usage.id
            });
            return null;
        }
        const parentPlacement = parentFrame.placement;
        const childPlacement = childFrame.placement;
        return {
            entity: usage,
            usageId,
            parentDefinition: refAt(usage, 3) as number,
            childDefinition: refAt(usage, 4) as number,
            childToParent: compose(parentPlacement, invert(childPlacement)),
            representation: shape ?? -1
        };
    };

    const resolvedByUsage = new Map<number, ResolvedUsage>();
    for (const usage of usages) {
        const resolved = resolveUsage(usage);
        if (resolved) resolvedByUsage.set(usage.id, resolved);
    }

    const expand = (definitionId: number, prefixId: string, worldPlacement: Placement, path: readonly number[]): void => {
        const children = childrenByParent.get(definitionId);
        if (!children) return;
        const ordered = [...children].sort((a, b) =>
            compareUsageNames(stringAt(a, 0)?.trim() ?? '', stringAt(b, 0)?.trim() ?? '')
        );
        for (const child of ordered) {
            const resolved = resolvedByUsage.get(child.id);
            if (!resolved) continue;
            if (path.includes(resolved.childDefinition)) {
                diagnostics.push({
                    code: 'cyclic-definition-reference',
                    message: `Usage ${resolved.usageId} re-enters definition pd:${resolved.childDefinition} on its own path`,
                    usageId: resolved.usageId,
                    entityId: child.id
                });
                continue;
            }
            const id = `${prefixId}/${resolved.usageId}`;
            const installed = compose(worldPlacement, resolved.childToParent);
            const usageIds = id.slice(MODEL_ID.length + 1).split('/');
            const name = definitionName(index, definitions.get(resolved.childDefinition) as StepEntity);
            if (childrenByParent.has(resolved.childDefinition)) {
                modules.push({
                    id,
                    usageIds,
                    definitionId: `pd:${resolved.childDefinition}`,
                    name,
                    worldPlacement: installed,
                    childCount: (childrenByParent.get(resolved.childDefinition) as StepEntity[]).length
                });
                expand(resolved.childDefinition, id, installed, [...path, resolved.childDefinition]);
                continue;
            }

            const brep = geometry.get(resolved.childDefinition);
            const vertices = brep ? definitionVertices(index, brep) : [];
            const localBounds = boundsOf(vertices);
            if (!brep || !localBounds) {
                diagnostics.push({
                    code: 'missing-definition-geometry',
                    message: `Definition pd:${resolved.childDefinition} (${name}) of ${id} has no resolvable B-rep vertices`,
                    usageId: resolved.usageId,
                    entityId: resolved.childDefinition
                });
                continue;
            }
            const rotation: Rotation = {
                x: installed.xAxis,
                y: installed.yAxis,
                z: installed.zAxis
            };
            const toWorld = (point: Vec3): Vec3 => add(installed.translation, rotate(rotation, point));
            occurrences.push({
                id,
                usageIds,
                parentId: prefixId,
                definitionId: `pd:${resolved.childDefinition}`,
                name,
                source: {
                    usage: child.id,
                    productDefinition: resolved.childDefinition,
                    representation: resolved.representation
                },
                localPlacement: resolved.childToParent,
                worldPlacement: installed,
                localBounds,
                boundsMin: toWorld(localBounds.min),
                boundsMax: toWorld(localBounds.max),
                boundsCentre: toWorld(localBounds.centre),
                handedness: installed.handedness,
                vertexCount: vertices.length
            });
        }
    };

    const root = roots[0];
    if (root) {
        expand(root.id, MODEL_ID, IDENTITY_PLACEMENT, [root.id]);
    }

    occurrences.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    modules.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const mirrored = occurrences.filter((occurrence) => occurrence.handedness !== 1);
    if (mirrored.length > 0) {
        diagnostics.push({
            code: 'degenerate-placement-frame',
            message: `${mirrored.length} occurrence(s) resolved to a non right-handed frame, first: ${mirrored[0]?.id}`
        });
    }

    return {
        modelId: MODEL_ID,
        sourceRevision: STEP_SHA256,
        usageCount: usages.length,
        assemblyDefinitionCount: assemblyDefinitions.size,
        leafDefinitionCount: leafDefinitions.length,
        roots: roots.map(() => MODEL_ID),
        occurrences,
        modules,
        diagnostics
    };
}

/** The ambiguous-geometry code is reported by {@link indexDefinitionGeometry} callers. */
export const AMBIGUOUS_GEOMETRY_CODE: TreeDiagnosticCode = 'ambiguous-definition-geometry';
