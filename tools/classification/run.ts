import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { buildImportPackage } from '../import/build-package.js';
import { makeTrial,predictionsSchema,scoreTrial,truthSchema } from './trial.js';

const directory='.staging/classification';
const trial=makeTrial(await buildImportPackage('assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP'));
await mkdir(directory,{recursive:true});
const [mode='prepare',truthFile,predFile]=process.argv.slice(2);
if(mode==='prepare') {
    await writeFile(`${directory}/holdout-inputs.json`,JSON.stringify({revision:trial.revision,choices:trial.choices,interfaces:trial.holdout,instruction:'Select one Row_ID or abstain with null. Include a reason. Return one answer for every interface.'},null,2));
    await writeFile(`${directory}/development-examples.json`,JSON.stringify(trial.examples,null,2));
    console.log(`${trial.holdout.length} held-out interfaces; ${trial.examples.length} development interfaces. Independent labels and model responses required for scoring.`);
} else if(mode==='score' && truthFile && predFile) {
    const truth=truthSchema.parse(JSON.parse(await readFile(truthFile,'utf8')));
    const pred=predictionsSchema.parse(JSON.parse(await readFile(predFile,'utf8')));
    const result=scoreTrial(trial,truth,pred);
    await writeFile(`${directory}/score.json`,JSON.stringify(result,null,2));
    console.log(`${result.correct} correct, ${result.wrong} wrong, ${result.abstained} abstained / ${result.denominator}`);
} else if(mode==='run' && process.env.MODEL_ENDPOINT && process.env.MODEL_NAME && process.env.MODEL_VERSION) {
    // Explicit offline experiment only; the build and tests never call a model.
    const predictions=[];
    for(const iface of trial.holdout) {
        const response=await fetch(process.env.MODEL_ENDPOINT,{method:'POST',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',...(process.env.MODEL_API_KEY?{Authorization:`Bearer ${process.env.MODEL_API_KEY}`}:{})},
            body:JSON.stringify({model:process.env.MODEL_NAME,temperature:0,max_tokens:180,messages:[{role:'system',content:'Choose a Row_ID or abstain with null. Respond only with JSON {"rowId":string|null,"reason":string}. Choices: '+JSON.stringify(trial.choices)},
                {role:'user',content:JSON.stringify(iface)}]})});
        if(!response.ok) throw new Error(`Model HTTP ${response.status} for ${iface.id}`);
        const result=JSON.parse((await response.json()).choices[0].message.content);
        if(result.rowId!==null && !trial.choices.some(c=>c.rowId===result.rowId)) throw new Error(`${iface.id}: unknown class`);
        predictions.push({id:iface.id,rowId:result.rowId,reason:result.reason});
        await writeFile(`${directory}/predictions.json`,JSON.stringify(predictionsSchema.parse({model:process.env.MODEL_NAME,version:process.env.MODEL_VERSION,revision:trial.revision,answers:predictions}),null,2));
    }
} else throw new Error('Use prepare, run (configured MODEL_ENDPOINT, MODEL_NAME and MODEL_VERSION), or score <independent-labels.json> <model-responses.json>');
