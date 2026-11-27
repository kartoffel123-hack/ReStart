import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { critique } from './proposal.js';
import { verifyStage } from '../compile/stage.js';
import type { inspectExits } from '../compile/exposed.js';

const [target,input]=process.argv.slice(2);
if(!target || !input)throw new Error('Use model:propose -- <occurrence> <proposal.json | local-model>');
const root='.staging/30465',g=(await readFile(`${root}/candidate`,'utf8')).trim();
if(!/^[a-f0-9]{64}$/.test(g))throw new Error('Invalid generation');
const directory=`${root}/${g}`;
await verifyStage(directory);
const index=JSON.parse(await readFile(`${directory}/manifest.json`,'utf8'));
const survey=JSON.parse(await readFile(`${directory}/${index.files.exitSurvey}`,'utf8')) as Awaited<ReturnType<typeof inspectExits>>;
const options=survey.filter(o=>o.piece===target).map(({id,piece,travel,obstructions})=>({id,piece,travel,obstructions}));
if(!options.length)throw new Error('No independently simulated axial option for this target');
if(input!=='local-model') {
    const result=critique(target,JSON.parse(await readFile(input,'utf8')),options);
    console.log(JSON.stringify(result,null,2));if(result.status==='invalid')process.exitCode=1;
} else {
    const endpoint=new URL(process.env.MODEL_ENDPOINT ?? 'http://127.0.0.1:11434/v1/chat/completions');
    if(!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))throw new Error('Automatic retries require a local endpoint');
    const model=z.string().min(1).parse(process.env.MODEL_NAME),version=z.string().min(1).parse(process.env.MODEL_VERSION);
    const folder='.staging/proposals';await mkdir(folder,{recursive:true});
    const key=createHash('sha256').update(JSON.stringify([g,target,model,version])).digest('hex');
    const file=`${folder}/${key}.json`;
    type Trial={attempt:number;suggestion:unknown;result:ReturnType<typeof critique>};
    let trials:Trial[]=[];
    try{trials=JSON.parse(await readFile(file,'utf8')).trials;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    while(trials.length<3 && trials.at(-1)?.result.status!=='pending-review'){
        const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0,max_tokens:500,messages:[
            {role:'system',content:'Propose JSON {target,release:{optionId,travelMm,requiredClear:[IDs],stop},return:{optionId,travelMm,requiredClear:[IDs],stop},tool:"fingers"|"pusher",support}. Simulated numbers are in mm. Do not assert verification.'},
            {role:'user',content:JSON.stringify({target,options,previous:trials.at(-1)})}]})});
        if(!response.ok)throw new Error(`Local model HTTP ${response.status}`);
        const content=(await response.json()).choices[0].message.content;
        let suggestion:unknown;try{suggestion=JSON.parse(content);}catch{suggestion=String(content).slice(0,2000);}
        trials.push({attempt:trials.length+1,suggestion,result:critique(target,suggestion,options)});
        await writeFile(file,JSON.stringify({generation:g,target,model,version,trials},null,2));
    }
    console.log(`${trials.length}/3 attempts; ${trials.at(-1)?.result.status}. Checkpoint: ${file}`);
}
