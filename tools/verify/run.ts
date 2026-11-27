import { readFile, writeFile } from 'node:fs/promises';
import { verifyStage } from '../compile/stage.js';

const root = '.staging/30465';
const generation = (await readFile(`${root}/candidate`,'utf8')).trim();
if (!/^[a-f0-9]{64}$/.test(generation)) throw new Error('Invalid candidate pointer');
const result = await verifyStage(`${root}/${generation}`);
await writeFile(`${root}/verification.json`,JSON.stringify(result,null,2));
const pending = result.rows.filter(r=>r.status==='pending-review').length;
console.log(`${result.rows.length} targets: ${pending} pending review, ${result.rows.filter(r=>r.status==='missing-motion').length} missing motions. See ${root}/verification.json`);
if (!result.releaseReady) process.exitCode = 1;
