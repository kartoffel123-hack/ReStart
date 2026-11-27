import { z } from 'zod';
import { assemblyModelSchema } from '../domain/schema.js';
import { pilotSchema } from './pilot-data.js';

const file=z.object({name:z.string().regex(/^[a-z0-9-]+\.(json|glb)$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)});
const indexSchema=z.object({schema:z.literal('restart.pilot/1'),revision:z.string(),graph:file,manuals:file,candidates:file,geometry:file});

/** Verify exactly the generation selected by the small revalidated index. Do
 * not fetch a second copy of the GLB after verifying the first one's digest. */
export async function loadPackage(base:string,signal:AbortSignal) {
    const channelResponse=await fetch(`${base}channel.json`,{signal,cache:'no-cache'});
    if(!channelResponse.ok) throw new Error(`Channel HTTP ${channelResponse.status}`);
    const channel=z.discriminatedUnion('stage',[
        z.object({schemaVersion:z.literal(1),stage:z.literal('pilot'),path:z.literal('pilot/')}),
        z.object({schemaVersion:z.literal(1),stage:z.literal('release'),path:z.string().regex(/^releases\/[0-9a-f]{64}\/$/)})
    ]).parse(await channelResponse.json());
    base+=channel.path;
    const response=await fetch(`${base}index.json`,{signal,cache:'no-cache'});
    if(!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const index=indexSchema.parse(await response.json());
    const bytes=async(entry:z.infer<typeof file>)=>{
        const r=await fetch(base+entry.name,{signal});
        if(!r.ok) throw new Error(`${entry.name}: HTTP ${r.status}`);
        const b=await r.arrayBuffer();
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
        if(hash!==entry.sha256) throw new Error(`Asset hash mismatch: ${entry.name}`);
        return b;
    };
    const [graph,manuals,candidates,geometry]=await Promise.all([bytes(index.graph),bytes(index.manuals),bytes(index.candidates),bytes(index.geometry)]);
    const decode=(b:ArrayBuffer):unknown=>JSON.parse(new TextDecoder().decode(b));
    const model=assemblyModelSchema.parse(decode(graph)),pilot=pilotSchema.parse(decode(manuals));
    if(model.graphRevision!==index.revision || pilot.geometry!==index.geometry.name || model.source.datasetRevision!==index.geometry.sha256 ||
        [pilot.repair,...pilot.alternatives,pilot.jointRepair].some(r=>r.graphRevision!==model.graphRevision || r.datasetRevision!==model.source.datasetRevision)) throw new Error('Mixed package revision');
    return {model,pilot,stage:channel.stage,candidates:decode(candidates),geometry:new Blob([geometry],{type:'model/gltf-binary'})};
}
