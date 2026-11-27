/**
 * Ticket 1 · V01 · build-side tessellation (plan 02 §3A.3).
 *
 * Runs `occt-import-js` once over the pinned STEP bytes. This is the only place the CAD
 * kernel is loaded: never in a test's hot loop and never in the browser bundle.
 *
 * Measured on the pinned revision with `occt-import-js@0.0.23` and Node 24.22.3:
 * 70 meshes, 39 hierarchy nodes of which 37 carry meshes, 70 mesh references, and about
 * 3.3 s. Mesh vertex coordinates already include the installed placement and are in mm.
 * The triangle count for these options is 48,874 — see
 * `data/review/tessellation-baseline.md` for why the plan's 111,646 is not asserted.
 */
import { createRequire } from 'node:module';

export type TessellationOptions = Readonly<{
    linearDeflectionType: 'absolute';
    linearDeflection: number;
    angularDeflection: number;
}>;

/** The settings the plan measured. `linearDeflectionType` is accepted but ignored by 0.0.23. */
export const TESSERATION_OPTIONS: TessellationOptions = {
    linearDeflectionType: 'absolute',
    linearDeflection: 0.12,
    angularDeflection: 0.4
};

export type TessellatedMesh = Readonly<{
    name: string;
    /** Millimetres, already transformed into assembly coordinates. Flat xyz triplets. */
    positions: readonly number[];
    /** Flat xyz triplets, same length as {@link positions} when the kernel supplied them. */
    normals: readonly number[] | null;
    /** Vertex indices, flat triplets. */
    triangles: readonly number[];
    /** RGB in 0..1 when the source carried a colour. */
    color: readonly number[] | null;
}>;

export type TessellatedNode = Readonly<{
    name: string;
    /** Indices into {@link Tessellation.meshes}. */
    meshes: readonly number[];
    children: readonly TessellatedNode[];
}>;

export type Tessellation = Readonly<{
    meshes: readonly TessellatedMesh[];
    root: TessellatedNode;
    /** Every hierarchy node, including the root. */
    nodeCount: number;
    /** Nodes that carry at least one mesh. Stage 1 alone carries four. */
    meshBearingNodeCount: number;
    triangleCount: number;
    options: TessellationOptions;
}>;

type OcctMesh = Readonly<{
    name?: string;
    color?: number[];
    attributes?: { position?: { array?: number[] }; normal?: { array?: number[] } };
    index?: { array?: number[] };
}>;

type OcctNode = Readonly<{ name?: string; meshes?: number[]; children?: OcctNode[] }>;

type OcctModule = Readonly<{
    ReadStepFile: (bytes: Uint8Array, options: unknown) => { success: boolean; root?: OcctNode; meshes?: OcctMesh[] };
}>;

/**
 * Load the Emscripten module. It ships as CommonJS UMD, so it is required rather than
 * imported; the returned promise resolves once the WASM runtime is initialised.
 */
async function loadOcct(): Promise<OcctModule> {
    const require = createRequire(import.meta.url);
    const initialise = require('occt-import-js') as (moduleArg?: Record<string, unknown>) => Promise<OcctModule>;
    return initialise();
}

function toMesh(mesh: OcctMesh): TessellatedMesh {
    const positions = mesh.attributes?.position?.array;
    if (!positions || positions.length === 0 || positions.length % 3 !== 0) {
        throw new Error(`tessellated mesh ${JSON.stringify(mesh.name)} has no usable positions`);
    }
    const triangles = mesh.index?.array;
    if (!triangles || triangles.length === 0 || triangles.length % 3 !== 0) {
        throw new Error(`tessellated mesh ${JSON.stringify(mesh.name)} has no usable triangles`);
    }
    const normals = mesh.attributes?.normal?.array;
    return {
        name: mesh.name ?? '',
        positions: Array.from(positions),
        normals: normals && normals.length === positions.length ? Array.from(normals) : null,
        triangles: Array.from(triangles),
        color: mesh.color && mesh.color.length === 3 ? Array.from(mesh.color) : null
    };
}

function countNodes(node: TessellatedNode): Readonly<{ nodes: number; meshBearing: number }> {
    let nodes = 1;
    let meshBearing = node.meshes.length > 0 ? 1 : 0;
    for (const child of node.children) {
        const inner = countNodes(child);
        nodes += inner.nodes;
        meshBearing += inner.meshBearing;
    }
    return { nodes, meshBearing };
}

function convertNode(node: OcctNode, meshes: readonly TessellatedMesh[]): TessellatedNode {
    return {
        name: node.name ?? '',
        meshes: (node.meshes ?? []).map((index) => {
            if (!Number.isInteger(index) || index < 0 || index >= meshes.length) {
                throw new Error(`node ${JSON.stringify(node.name)} references mesh index ${index} outside the mesh array`);
            }
            return index;
        }),
        children: (node.children ?? []).map((child) => convertNode(child, meshes))
    };
}

/** Tessellate once. Throws rather than returning a partial result. */
export async function tessellateStep(
    bytes: Uint8Array,
    options: TessellationOptions = TESSERATION_OPTIONS
): Promise<Tessellation> {
    const occt = await loadOcct();
    const result = occt.ReadStepFile(bytes, options);
    if (!result.success) {
        throw new Error('occt-import-js reported an unsuccessful import');
    }
    if (!result.root || !result.meshes) {
        throw new Error('occt-import-js returned no hierarchy');
    }
    const meshes = result.meshes.map(toMesh);
    const root = convertNode(result.root, meshes);
    const { nodes, meshBearing } = countNodes(root);
    let triangles = 0;
    for (const mesh of meshes) triangles += mesh.triangles.length / 3;
    return {
        meshes,
        root,
        nodeCount: nodes,
        meshBearingNodeCount: meshBearing,
        triangleCount: triangles,
        options
    };
}

/** Every mesh index reachable from the hierarchy, in hierarchy order, without duplicates. */
export function reachableMeshes(root: TessellatedNode): number[] {
    const seen = new Set<number>();
    const walk = (node: TessellatedNode): void => {
        for (const index of node.meshes) seen.add(index);
        for (const child of node.children) walk(child);
    };
    walk(root);
    return [...seen].sort((a, b) => a - b);
}
