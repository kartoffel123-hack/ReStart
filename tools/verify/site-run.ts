import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { checkSite } from './site.js';
import { checkScannerSite } from '../ct/site.js';

const channel=JSON.parse(await readFile('public/models/30465/channel.json','utf8'));
if(!/^(pilot|releases\/[0-9a-f]{64})\/$/.test(channel.path)) throw new Error('Unknown dataset channel');
const count=await checkSite(`public/models/30465/${channel.path}`);
if(channel.stage==='release' && count!==70) throw new Error('Incomplete release');
console.log(`Static ${channel.stage} package intact: ${count} single-target manuals.`);
if(existsSync('public/models/4000041/channel.json')) await checkScannerSite('public/models/4000041');
