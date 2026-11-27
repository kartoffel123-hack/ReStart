import { readFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyStage } from '../compile/stage.js';
import type { ImportPackage } from '../import/build-package.js';
import type { inspectExits } from '../compile/exposed.js';
import type { partialStrokes } from '../compile/partial-strokes.js';
import type { moduleSurvey } from '../compile/modules.js';

const root='.staging/30465',generation=(await readFile(join(root,'candidate'),'utf8')).trim();
if(!/^[0-9a-f]{64}$/.test(generation))throw new Error('Invalid candidate pointer');
const dir=join(root,generation),result=await verifyStage(dir);
const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
const json=async<T>(key:string):Promise<T>=>JSON.parse(await readFile(join(dir,manifest.files[key]),'utf8'));
const inventory=await json<ImportPackage['catalog']>('inventory'),survey=await json<Awaited<ReturnType<typeof inspectExits>>>('exitSurvey');
const partial=await json<ReturnType<typeof partialStrokes>>('partial'),modules=await json<Awaited<ReturnType<typeof moduleSurvey>>>('modules');
const lines=[`# Mechanical review queue`,`Generation: \`${generation}\`. Measurements below are generated from the pinned model. A blank review is not an approval.`,
    '','## Target queue','','| Occurrence | Part | Current status | First item to inspect |','|---|---|---|---|'];
for(const row of result.rows){
    const piece=inventory.pieces.find(p=>p.id===row.target)!;
    const best=survey.filter(o=>o.piece===row.target).sort((a,b)=>a.obstructions.length-b.obstructions.length || a.travel-b.travel)[0];
    const first=row.status==='pending-review' ? `Check stop, hand/tool access and restoration against procedure \`${row.fingerprint}\`.` : !best ? 'No single-axis option cleared the transverse joints; inspect group or compound access.' :
        best.obstructions.length ? `Inspect \`${best.id}\`, ${best.travel.toFixed(2)} mm. Unresolved contacts: ${best.obstructions.join(', ')}.` : 'Straight exit has no remaining triangle collision; inspect support and connections left behind.';
    lines.push(`| ${piece.id} | ${piece.name} | ${row.status} | ${first} |`);
}
lines.push('','## Partial-stroke candidates','',...partial.map(p=>`- ${p.shaft}: ${p.strokeMm.toFixed(2)} mm to clear ${p.clearTarget}. Residual axial spans: ${p.support.map(s=>`${s.sleeve} ${s.residualMm.toFixed(2)} mm`).join(', ')}. Identify the visible stop and confirm support.`));
if(!partial.length)lines.push('No supported partial stop is established by this survey.');
lines.push('','## Intact-group candidates','',...modules.map(m=>`- ${m.name} (${m.id}): ${m.members.length} members, ${m.internal.length} internal fits, ${m.external.length} external fits, ${m.options.length} proposed strokes. Check membership and actual bench handling.`));
await writeFile(join(root,'mechanical-review.md'),lines.join('\n')+'\n');
console.log(`Wrote ${result.rows.length} target rows, ${partial.length} partial-stroke candidates and ${modules.length} group candidates to ${root}/mechanical-review.md`);
