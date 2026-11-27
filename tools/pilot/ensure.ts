import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Only the development pilot is generated locally. A promoted release is
 * compiled once and consumed as immutable assets on the static host. */
const root='public/models/30465';
const channel=JSON.parse(await readFile(`${root}/channel.json`,'utf8'));
if(channel.stage==='pilot') {
    const hash=createHash('sha256');
    for(const folder of ['tools/pilot','tools/compile','tools/lib','tools/import','tools/verify','src/domain','data/review']) {
        for(const name of (await readdir(folder)).sort().filter(n=>/\.(ts|json)$/.test(n))) {
            hash.update(join(folder,name));hash.update(await readFile(join(folder,name)));
        }
    }
    hash.update(await readFile('package-lock.json'));
    const key=hash.digest('hex');
    const valid=await Promise.all([readFile('.tmp/pilot-builder','utf8').catch(()=>''),access(`${root}/pilot/index.json`).then(()=>true,()=>false)]);
    if(valid[0]!==key || !valid[1]) {
        await import('./run.js');
        await mkdir('.tmp',{recursive:true});await writeFile('.tmp/pilot-builder',key);
    }
}
