import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Document, NodeIO } from '@gltf-transform/core';
import { Color, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { z } from 'zod';
import { inspectAssemblyGlb } from '../lib/glb.js';

export const ctStage = '.staging/4000041';
export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export const inventorySchema = z.object({sourceSha256:z.literal('b94332a64f28fe2bcd4dfead7ab195398885cedb85dca7b1f0c5997975a3aef2'),
    pieces:z.array(z.object({id:z.string(),ref:z.string(),group:z.string(),name:z.string(),colorName:z.string(),rgb:z.string().regex(/^#[0-9a-f]{6}$/i)})).length(566)});

export async function assertSurfaceCoverage(stepSha256:string,references:string[]) {
    const fidelity=z.object({stepSha256:z.literal(stepSha256),definitions:z.record(z.string(),z.object({outsideSamples:z.number().int().nonnegative()}))})
        .parse(JSON.parse(await readFile('.tmp/ct/surface-fidelity.json','utf8')));
    const bad=references.filter(ref=>fidelity.definitions[ref]?.outsideSamples!==0);
    if(bad.length) throw new Error(`Missing CT surface landmarks: ${bad.join(', ')}`);
}

/** Use the meshes independently reopened from Fusion, not the pre-conversion STL library. */
export async function importScanner() {
    const root='.tmp/ct';
    const inventory=inventorySchema.parse(JSON.parse(await readFile(`${root}/source.json`,'utf8')));
    const crosswalk=z.object({sha256:z.string(),meshesExported:z.literal(true),
        records:z.record(z.string(),z.object({ref:z.string(),world:z.array(z.array(z.number()).length(4)).length(4)})),
        definitions:z.record(z.string(),z.object({file:z.string().regex(/^definition-\d+\.stl$/),meshSha256:z.string().regex(/^[a-f0-9]{64}$/).optional()}))
    }).parse(JSON.parse(await readFile(`${root}/fusion-4000041.crosswalk.json`,'utf8')));
    if(sha256(await readFile(`${root}/fusion-4000041.step`))!==crosswalk.sha256) throw new Error('Reopen the changed Fusion export before importing');
    await assertSurfaceCoverage(crosswalk.sha256,Object.keys(crosswalk.definitions));
    const patterns=z.record(z.string(),z.object({file:z.string().regex(/^pattern-\d+\.png$/),bounds:z.tuple([z.number(),z.number(),z.number(),z.number()])}))
        .parse(JSON.parse(await readFile(`${root}/patterns/index.json`,'utf8')));
    const doc=new Document(); const buffer=doc.createBuffer(); const scene=doc.createScene('4000041');
    const definitions=new Map<string,ReturnType<Document['createPrimitive']>>();
    for (const [ref,entry] of Object.entries(crosswalk.definitions)) {
        const bytes=await readFile(`${root}/step-meshes/${entry.file}`);
        if(entry.meshSha256 && sha256(bytes)!==entry.meshSha256) throw new Error(`Tessellation hash mismatch: ${ref}`);
        const soup=new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
        const pattern=Object.entries(patterns).find(([key])=>key.startsWith(`${ref}:`))?.[1];
        if(pattern) {
            const [left,bottom,right,top]=pattern.bounds,points=soup.getAttribute('position');
            const uvs=new Float32Array(points.count*2);
            for(let i=0;i<points.count;i+=3) {
                if([i,i+1,i+2].some(j=>Math.abs(points.getY(j))>.01)) continue;
                for(let j=i;j<i+3;j++) {
                    uvs[2*j]=(2.5+255*(points.getX(j)-left)/(right-left))/260;
                    uvs[2*j+1]=(2.5+255*(points.getZ(j)-bottom)/(top-bottom))/260;
                }
            }
            soup.setAttribute('uv',new Float32BufferAttribute(uvs,2));
        }
        soup.scale(.001,.001,.001);
        // Each STEP face is planar. Let glTF render its geometric normal;
        // sharing positions across edges avoids repeating vertices and normals.
        soup.deleteAttribute('normal');
        const mesh=mergeVertices(soup,1e-8),indices=mesh.getIndex()!;
        const indexArray=mesh.getAttribute('position').count>65535 ? new Uint32Array(indices.array) : new Uint16Array(indices.array);
        const primitive=doc.createPrimitive().setIndices(doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(indexArray));
        primitive.setAttribute('POSITION',doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(mesh.getAttribute('position').array)));
        if(pattern) primitive.setAttribute('TEXCOORD_0',doc.createAccessor().setBuffer(buffer).setType('VEC2').setArray(new Float32Array(mesh.getAttribute('uv').array)));
        definitions.set(ref,primitive);
    }
    const variants=new Map<string,ReturnType<Document['createMesh']>>();
    const seen=new Set<string>();
    for(const piece of inventory.pieces) {
        const witness=crosswalk.records[piece.id];
        if(!witness || witness.ref!==piece.ref || seen.has(piece.id)) throw new Error(`Invalid crosswalk for ${piece.id}`);
        seen.add(piece.id);
        const key=`${piece.ref}:${piece.rgb}`;
        let mesh=variants.get(key);
        if(!mesh) {
            const rgb=new Color(piece.rgb);
            const material=doc.createMaterial(piece.colorName).setBaseColorFactor([rgb.r,rgb.g,rgb.b,1]).setMetallicFactor(0).setRoughnessFactor(.6);
            const art=patterns[key];
            if(art) {
                const texture=doc.createTexture(piece.name).setImage(await readFile(`${root}/patterns/${art.file}`)).setMimeType('image/png');
                material.setBaseColorFactor([1,1,1,1]).setBaseColorTexture(texture);
            }
            mesh=doc.createMesh(key).addPrimitive(definitions.get(piece.ref)!.clone().setMaterial(material));
            variants.set(key,mesh);
        }
        const matrix=new Matrix4().fromArray(witness.world.flat()).transpose();
        const position=new Vector3(), rotation=new Quaternion(), scale=new Vector3(); matrix.decompose(position,rotation,scale);
        scene.addChild(doc.createNode(piece.id).setExtras({instanceId:piece.id,partName:piece.name,definitionId:piece.ref})
            .setTranslation(position.multiplyScalar(.001).toArray()).setRotation(rotation.toArray()).setMesh(mesh));
    }
    if(Object.keys(crosswalk.records).length!==seen.size) throw new Error('STEP contains an unlisted part');
    doc.getRoot().setDefaultScene(scene);
    const glb=await new NodeIO().writeBinary(doc);
    const report=await inspectAssemblyGlb(glb);
    if(report.problems.length || report.instances.length!==seen.size || report.instances.some(p=>!seen.has(p.instanceId))) throw new Error(`GLB identity check failed: ${report.problems.join('; ')}`);
    await mkdir(ctStage,{recursive:true});
    const geometry=`geometry-${sha256(glb)}.glb`;
    await writeFile(`${ctStage}/${geometry}`,glb);
    await writeFile(`${ctStage}/import.json`,JSON.stringify({inventory,stepSha256:crosswalk.sha256,geometry,triangles:report.instances.reduce((n,p)=>n+p.triangleCount,0)}));
    console.log(`CT import: ${seen.size}/${inventory.pieces.length} pickable STEP placements; ${definitions.size} reusable definitions; ${glb.length} GLB bytes; ${geometry}`);
}
