/**
 * Reader for the supplied MRI STEP's AP242 tessellated solid.
 *
 * This file is deliberately separate from the AP203 assembly importer: LEGO_MRI.step has
 * one indexed tessellated surface, not an occurrence tree or repair graph.
 */
export type MriSurface = Readonly<{
    positionsMm: Float32Array;
    indices: Uint32Array;
    triangleCount: number;
    boundsMm: Readonly<{ min: readonly [number, number, number]; max: readonly [number, number, number] }>;
}>;

function entity(source: string, type: string): string {
    const match = new RegExp(`#\\d+\\s*=\\s*${type}\\s*\\(([^]*?)\\);`, 'i').exec(source);
    if (!match?.[1]) throw new Error(`STEP has no ${type} entity`);
    return match[1];
}

function triples<T extends Float32Array | Uint32Array>(
    body: string,
    pattern: RegExp,
    output: T,
    convert: (a: string, b: string, c: string) => readonly [number, number, number]
): T {
    let offset = 0;
    for (const match of body.matchAll(pattern)) {
        const tuple = convert(match[1]!, match[2]!, match[3]!);
        output[offset++] = tuple[0];
        output[offset++] = tuple[1];
        output[offset++] = tuple[2];
    }
    if (offset !== output.length) throw new Error(`STEP tuple count changed while parsing (${offset / 3} of ${output.length / 3})`);
    return output;
}

/** Parse and validate the single millimetre-based indexed triangle surface in the pinned input. */
export function parseMriStep(source: string): MriSurface {
    if (!/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(source)) {
        throw new Error('MRI STEP does not declare millimetre length units');
    }

    const coordinates = entity(source, 'COORDINATES_LIST');
    const coordinateTriples = [...coordinates.matchAll(/\(\s*([-+]?\d+(?:\.\d*)?(?:[Ee][-+]?\d+)?)\s*,\s*([-+]?\d+(?:\.\d*)?(?:[Ee][-+]?\d+)?)\s*,\s*([-+]?\d+(?:\.\d*)?(?:[Ee][-+]?\d+)?)\s*\)/g)];
    if (coordinateTriples.length === 0) throw new Error('MRI STEP coordinate list is empty');
    const positionsMm = triples(
        coordinates,
        /\(\s*([-+]?\d+(?:\.\d*)?(?:[Ee][-+]?\d+)?)\s*,\s*([-+]?\d+(?:\.\d*)?(?:[Ee][-+]?\d+)?)\s*,\s*([-+]?\d+(?:\.\d*)?(?:[Ee][-+]?\d+)?)\s*\)/g,
        new Float32Array(coordinateTriples.length * 3),
        (x, y, z) => [Number(x), Number(y), Number(z)]
    );

    const face = entity(source, 'TRIANGULATED_FACE');
    const faceHeader = /^\s*'[^']*'\s*,\s*#(\d+)\s*,\s*(\d+)/i.exec(face);
    if (!faceHeader) throw new Error('MRI STEP triangulated face has an unsupported header');
    const declaredPoints = Number(faceHeader[2]);
    if (declaredPoints !== coordinateTriples.length) {
        throw new Error(`MRI STEP declares ${declaredPoints} points but supplies ${coordinateTriples.length}`);
    }
    const faceTriples = [...face.matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)];
    if (faceTriples.length === 0) throw new Error('MRI STEP triangulated face has no triangles');
    const indices = triples(
        face,
        /\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
        new Uint32Array(faceTriples.length * 3),
        (a, b, c) => [Number(a) - 1, Number(b) - 1, Number(c) - 1]
    );
    for (const index of indices) {
        if (index >= coordinateTriples.length) throw new Error(`MRI STEP triangle references missing point ${index + 1}`);
    }

    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positionsMm.length; i += 3) {
        for (let axis = 0; axis < 3; axis++) {
            const value = positionsMm[i + axis]!;
            min[axis] = Math.min(min[axis]!, value);
            max[axis] = Math.max(max[axis]!, value);
        }
    }
    return { positionsMm, indices, triangleCount: faceTriples.length, boundsMm: { min, max } };
}
