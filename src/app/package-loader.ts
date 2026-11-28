import { z } from 'zod';
import { assemblyModelSchema } from '../domain/schema.js';
import { datasetManualSchema, pilotSchema, type PilotData } from './pilot-data.js';

const file=z.object({name:z.string().regex(/^[a-z0-9-]+\.(json|glb)$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)});
const entries=z.object({revision:z.string(),graph:file,manuals:file,candidates:file,geometry:file,dof:file.optional()});
const indexSchema=z.discriminatedUnion('schema',[
    entries.extend({schema:z.literal('restart.pilot/1')}),
    entries.extend({schema:z.literal('restart.dataset/2'),datasetId:z.string()})
]);

/** Verify exactly the generation selected by the small revalidated index. Do
 * not fetch a second copy of the GLB after verifying the first one's digest. */
export async function loadPackage(base:string,signal:AbortSignal) {
    const expectedId=base.split('/').filter(Boolean).at(-1);
    const channelResponse=await fetch(`${base}channel.json`,{signal,cache:'no-cache'});
    if(!channelResponse.ok) throw new Error(`Channel HTTP ${channelResponse.status}`);
    const channel=z.discriminatedUnion('stage',[
        z.object({schemaVersion:z.literal(1),stage:z.literal('pilot'),path:z.literal('pilot/')}),
        z.object({schemaVersion:z.literal(1),stage:z.literal('candidate'),path:z.string().regex(/^candidates\/[0-9a-f]{64}\/$/)}),
        z.object({schemaVersion:z.literal(1),stage:z.literal('release'),path:z.string().regex(/^releases\/[0-9a-f]{64}\/$/)})
    ]).parse(await channelResponse.json());
    base+=channel.path;
    const response=await fetch(`${base}index.json`,{signal,cache:'no-cache'});
    if(!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const indexBuffer=await response.arrayBuffer();
    if(channel.stage==='candidate' && channel.path.split('/')[1]!==await digest(indexBuffer)) throw new Error('Candidate index hash mismatch');
    const index=indexSchema.parse(JSON.parse(new TextDecoder().decode(indexBuffer)));
    if ((index.schema==='restart.pilot/1' ? '30465' : index.datasetId)!==expectedId) throw new Error('Wrong dataset index');
    const bytes=async(entry:z.infer<typeof file>)=>{
        const r=await fetch(base+entry.name,{signal});
        if(!r.ok) throw new Error(`${entry.name}: HTTP ${r.status}`);
        const b=await r.arrayBuffer();
        const hash=await digest(b);
        if(hash!==entry.sha256) throw new Error(`Asset hash mismatch: ${entry.name}`);
        return b;
    };
    const [graph,manuals,candidates,geometry]=await Promise.all([bytes(index.graph),bytes(index.manuals),bytes(index.candidates),bytes(index.geometry)]);
    const decode=(b:ArrayBuffer):unknown=>JSON.parse(new TextDecoder().decode(b));
    const model=assemblyModelSchema.parse(decode(graph));
    const pilot:PilotData=(index.schema==='restart.pilot/1' ? pilotSchema : datasetManualSchema).parse(decode(manuals));
    if(!model.occurrences.some(o=>o.parent===null && o.id===expectedId)) throw new Error('Wrong dataset graph');
    if(model.graphRevision!==index.revision || pilot.geometry!==index.geometry.name || model.source.datasetRevision!==index.geometry.sha256 ||
        [pilot.repair,...pilot.alternatives,...(pilot.jointRepair?[pilot.jointRepair]:[])].some(r=>r.graphRevision!==model.graphRevision || r.datasetRevision!==model.source.datasetRevision)) throw new Error('Mixed package revision');
    const dof=index.dof ? decode(await bytes(index.dof)) : undefined;
    return {model,pilot,stage:channel.stage,candidates:decode(candidates),dof,geometry:new Blob([geometry],{type:'model/gltf-binary'})};
}

async function digest(buffer:ArrayBuffer) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),n=>n.toString(16).padStart(2,'0')).join('');
}
