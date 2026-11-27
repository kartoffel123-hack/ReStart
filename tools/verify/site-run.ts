import { readFile } from 'node:fs/promises';
import { checkSite } from './site.js';

const channel=JSON.parse(await readFile('public/models/30465/channel.json','utf8'));
if(!/^(pilot|releases\/[0-9a-f]{64})\/$/.test(channel.path)) throw new Error('Unknown dataset channel');
const count=await checkSite(`public/models/30465/${channel.path}`);
if(channel.stage==='release' && count!==70) throw new Error('Incomplete release');
console.log(`Static ${channel.stage} package intact: ${count} single-target manuals.`);
