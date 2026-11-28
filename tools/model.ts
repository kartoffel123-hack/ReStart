import { parseArgs } from 'node:util';

const [action,...args]=process.argv.slice(2);
const {values,positionals}=parseArgs({args,allowPositionals:true,options:{dataset:{type:'string',default:'30465'},profile:{type:'string'}}});
if(values.dataset==='4000041') {
    if(positionals.length || (values.profile!==undefined && (action!=='verify' || !['demo','bench'].includes(values.profile)))) throw new Error('Unsupported CT model arguments');
    if(action==='import') await (await import('./ct/import.js')).importScanner();
    else if(action==='compile') await (await import('./ct/compile.js')).compileScanner();
    else if(action==='verify' && values.profile) {
        const {evidence}=await (await import('./ct/verify.js')).verifyScanner();
        if(values.profile==='bench' && !evidence.physicallyVerified) throw new Error('Cutover withheld: reviewed, uncoached CT trial with a matching spare required');
    }
    else if(action==='stage') await (await import('./ct/verify.js')).serveScannerCandidate();
    else throw new Error('CT has a demo verifier only; use --profile demo');
} else if(values.dataset==='30465' && values.profile===undefined) {
    process.argv.splice(2,Infinity,...positionals);
    if(action==='import') await import('./import/run.js');
    else if(action==='compile') await import('./compile/run.js');
    else if(action==='verify') await import('./verify/run.js');
    else throw new Error('Unsupported helicopter model command');
} else throw new Error('Unknown dataset or profile');
