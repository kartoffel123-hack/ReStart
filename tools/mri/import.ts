import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { parseMriStep } from './step-tessellation.js';

const SOURCE = 'assets/LEGO_MRI.step';
const SOURCE_SHA256 = '88740a3882f24ad03e9182fb8c29aca74fe7b3cc15445c45856adfa515b6f63d';
const OUTPUT = 'public/models/lego-mri';

const source = new Uint8Array(readFileSync(resolve(SOURCE)));
const sourceSha256 = createHash('sha256').update(source).digest('hex');
if (sourceSha256 !== SOURCE_SHA256) {
    throw new Error(`MRI STEP source hash mismatch: got ${sourceSha256}, expected ${SOURCE_SHA256}`);
}
const surface = parseMriStep(new TextDecoder().decode(source));
const positions = new Float32Array(surface.positionsMm.length);
for (let i = 0; i < positions.length; i++) positions[i] = surface.positionsMm[i]! / 1000;

// Generate smooth normals from the indexed triangles for a lit browser preview.
const normals = new Float32Array(positions.length);
for (let i = 0; i < surface.indices.length; i += 3) {
    const a = surface.indices[i]! * 3, b = surface.indices[i + 1]! * 3, c = surface.indices[i + 2]! * 3;
    const abx = positions[b]! - positions[a]!, aby = positions[b + 1]! - positions[a + 1]!, abz = positions[b + 2]! - positions[a + 2]!;
    const acx = positions[c]! - positions[a]!, acy = positions[c + 1]! - positions[a + 1]!, acz = positions[c + 2]! - positions[a + 2]!;
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const vertex of [a, b, c]) {
        normals[vertex] = normals[vertex]! + nx;
        normals[vertex + 1] = normals[vertex + 1]! + ny;
        normals[vertex + 2] = normals[vertex + 2]! + nz;
    }
}
for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!);
    if (length > 0) {
        normals[i] = normals[i]! / length;
        normals[i + 1] = normals[i + 1]! / length;
        normals[i + 2] = normals[i + 2]! / length;
    }
}

const document = new Document();
const buffer = document.createBuffer('lego-mri');
const material = document.createMaterial('MRI neutral').setBaseColorFactor([0.53, 0.58, 0.59, 1]).setDoubleSided(true);
const primitive = document.createPrimitive()
    .setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer))
    .setAttribute('NORMAL', document.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer))
    .setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint32Array(surface.indices)).setBuffer(buffer))
    .setMaterial(material);
const mesh = document.createMesh('LEGO MRI tessellated solid').addPrimitive(primitive);
const scene = document.createScene('LEGO MRI');
scene.addChild(document.createNode('LEGO MRI').setMesh(mesh).setExtras({
    source: SOURCE, sourceSha256, units: 'metres', sourceUnits: 'millimetres', geometryOnly: true
}));
document.getRoot().setDefaultScene(scene);
const glb = await new NodeIO().writeBinary(document);
const reopened = await new NodeIO().readBinary(glb);
const primitives = reopened.getRoot().listMeshes().flatMap((item) => item.listPrimitives());
if (primitives.length !== 1) throw new Error(`expected one GLB primitive after reload, found ${primitives.length}`);
const positionsCheck = primitives[0]!.getAttribute('POSITION');
const indicesCheck = primitives[0]!.getIndices();
if (positionsCheck?.getCount() !== surface.positionsMm.length / 3 ||
    (indicesCheck?.getArray()?.length ?? 0) / 3 !== surface.triangleCount) {
    throw new Error('reloaded GLB vertex or triangle count does not match the source STEP');
}
const geometrySha256 = createHash('sha256').update(glb).digest('hex');
mkdirSync(resolve(OUTPUT), { recursive: true });
const geometry = `geometry-${geometrySha256}.glb`;
writeFileSync(resolve(OUTPUT, geometry), glb);
writeFileSync(resolve(OUTPUT, 'manifest.json'), `${JSON.stringify({
    schema: 'restart.geometry-preview/1',
    model: 'LEGO MRI',
    source: SOURCE,
    sourceSha256,
    geometry,
    geometrySha256,
    units: 'metres',
    triangles: surface.triangleCount,
    vertices: surface.positionsMm.length / 3,
    boundsMm: surface.boundsMm,
    note: 'Geometry preview only. This STEP contains no component assembly or repair evidence.'
}, null, 2)}\n`);
console.log(`Converted ${SOURCE}`);
console.log(`  Source SHA-256: ${sourceSha256}`);
console.log(`  Surface: ${surface.positionsMm.length / 3} vertices, ${surface.triangleCount} triangles`);
console.log(`  Bounds (mm): ${JSON.stringify(surface.boundsMm)}`);
console.log(`  GLB: ${resolve(OUTPUT, geometry)} (${glb.byteLength} bytes, SHA-256 ${geometrySha256})`);
