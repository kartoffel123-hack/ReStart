import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { assemblyModelSchema,repairSchema } from '../../src/domain/schema.js';
import { procedureFingerprint } from '../../src/domain/fingerprint.js';
import { replay } from '../../src/domain/replay.js';

export async function checkSite(root:string) {
    const index=JSON.parse(await readFile(join(root,'index.json'),'utf8'));
    const contents=new Map<string,Buffer>();
    for(const kind of ['geometry','manuals','candidates','graph']) {
        const entry=index[kind];
        if(!entry || !/^[a-z0-9-]+\.(json|glb)$/.test(entry.name)) throw new Error(`Invalid site ${kind}`);
        const buffer=await readFile(join(root,entry.name));
        if(createHash('sha256').update(buffer).digest('hex')!==entry.sha256) throw new Error(`Site hash mismatch: ${kind}`);
        contents.set(kind,buffer);
    }
    const graph=assemblyModelSchema.parse(JSON.parse(contents.get('graph')!.toString()));
    const d=z.object({repair:repairSchema,alternatives:repairSchema.array(),jointRepair:repairSchema,geometry:z.string()}).parse(JSON.parse(contents.get('manuals')!.toString()));
    if(graph.graphRevision!==index.revision || d.geometry!==index.geometry.name || graph.source.datasetRevision!==index.geometry.sha256) throw new Error('Mixed site revision');
    for(const r of [d.repair,...d.alternatives,d.jointRepair]) {
        if(r.graphRevision!==graph.graphRevision || r.datasetRevision!==graph.source.datasetRevision || !replay(graph,r).ok || r.procedureFingerprint!==procedureFingerprint(graph,r.targetIds,r.operationIds,r.functionCheckId)) throw new Error(`Invalid site repair: ${r.targetIds}`);
    }
    return 1+d.alternatives.length;
}
