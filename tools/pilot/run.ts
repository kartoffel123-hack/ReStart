import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildImportPackage } from '../import/build-package.js';
import { buildStudCandidate } from './stud-candidate.js';
import { measureCandidates } from '../compile/candidates.js';

const input = await buildImportPackage('assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP');
const {model,pilot,survey} = await buildStudCandidate(input);
const directory = 'public/models/30465/pilot';
await mkdir(directory, { recursive:true });
await writeFile(`${directory}/${pilot.geometry}`,input.glb);
await writeFile(`${directory}/graph.json`,JSON.stringify(model));
const candidates=await measureCandidates(input);
await writeFile(`${directory}/motion-candidates.json`,JSON.stringify(candidates.map(c=>({ ...c,
    exitAssessment:survey.find(o=>o.id===c.id)?.obstructions ?? null,
    absoluteUnits:'mm',sourceRevision:input.report.source.sha256
}))));
await writeFile(`${directory}/light-stud.json`,JSON.stringify({...pilot,inventory:input.catalog.inventory.flatMap(row=>row.occurrenceIds.map(id=>({
    id,name:row.stepName,elementId:row.elementId,designNo:row.designNo,color:row.color
})))}));
console.log(`Pilot: ${model.connections.length} generated connections; ${pilot.repair.procedureFingerprint}`);
const entry=async(name:string)=>({name,sha256:createHash('sha256').update(await readFile(`${directory}/${name}`)).digest('hex')});
await writeFile(`${directory}/index.tmp`,JSON.stringify({schema:'restart.pilot/1',revision:model.graphRevision,geometry:await entry(pilot.geometry),graph:await entry('graph.json'),candidates:await entry('motion-candidates.json'),manuals:await entry('light-stud.json')}));
await rename(`${directory}/index.tmp`,`${directory}/index.json`);
