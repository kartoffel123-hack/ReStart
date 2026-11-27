import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { stageAssembly } from './stage.js';

const root = '.staging/30465';
const patchFile = process.argv[2];
const dir = await stageAssembly(root,patchFile ? JSON.parse(await readFile(patchFile,'utf8')) : undefined);
const manifest = JSON.parse(await readFile(`${dir}/manifest.json`,'utf8'));
const pointer = `${root}/candidate-${process.pid}.tmp`;
await writeFile(pointer,basename(dir));
await rename(pointer,`${root}/candidate`);
console.log(`Staged ${manifest.coverage.solved}/${manifest.coverage.targets} modeled candidates at ${dir}; ${manifest.coverage.unresolved.length} missing routes. Nothing promoted.`);
