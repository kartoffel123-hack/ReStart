import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { checkSite } from './site.js';
import { checkScannerSite } from '../ct/site.js';
import { scannerEvidence } from '../ct/evidence.js';
import { z } from 'zod';

const channel=JSON.parse(await readFile('public/models/30465/channel.json','utf8'));
if(!/^(pilot|releases\/[0-9a-f]{64})\/$/.test(channel.path)) throw new Error('Unknown dataset channel');
const count=await checkSite(`public/models/30465/${channel.path}`);
if(channel.stage==='release' && count!==70) throw new Error('Incomplete release');
console.log(`Static ${channel.stage} package intact: ${count} single-target manuals.`);
const selected=z.object({id:z.enum(['30465','4000041'])}).parse(JSON.parse(await readFile('src/app/default-dataset.json','utf8')));
if(selected.id==='4000041' || existsSync('public/models/4000041/channel.json')) {
    const ct=await checkScannerSite('public/models/4000041');
    if(selected.id==='4000041') {
        const evidence=await Promise.all(ct.repairs.map(job=>scannerEvidence(job,true)));
        if(!evidence.every(e=>e.reviewed) || !evidence.some(e=>e.physicallyVerified)) throw new Error('CT default requires reviewed manuals and a linked uncoached spare replacement');
        const trial=z.object({url:z.url().startsWith('https://'),browserVersion:z.string().min(1),osVersion:z.string().min(1),repairComplete:z.literal(true)});
        const records=z.object({generation:z.literal(ct.generation),windowsEdge:trial,macSafari:trial,rollbackPassed:z.literal(true)}).parse(JSON.parse(await readFile('data/review/4000041/web-acceptance.json','utf8')));
        if(records.windowsEdge.url!==records.macSafari.url) throw new Error('CT browser trials refer to different URLs');
    }
}
