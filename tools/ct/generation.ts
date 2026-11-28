import { mkdir,mkdtemp,rename,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { readScannerGeneration } from './site.js';

/** A reader may still hold the previous channel. Never truncate its assets,
 * including on a retry that happens to produce exactly the same generation. */
export async function installCandidate(root:string,generation:string,populate:(dir:string)=>Promise<void>) {
    const parent=join(root,'candidates'); await mkdir(parent,{recursive:true});
    const directory=join(parent,generation);
    try { await readScannerGeneration(directory,generation); return; }
    catch(error) { if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error; }
    const temp=await mkdtemp(join(parent,'.incoming-'));
    try {
        await populate(temp);
        await readScannerGeneration(temp,generation);
        try { await rename(temp,directory); }
        catch(error) {
            if(!['ENOTEMPTY','EEXIST'].includes((error as NodeJS.ErrnoException).code??'')) throw error;
            await readScannerGeneration(directory,generation);
        }
    } finally { await rm(temp,{recursive:true,force:true}); }
}
