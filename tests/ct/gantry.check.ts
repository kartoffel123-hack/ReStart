import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ctStage } from '../../tools/ct/import.js';
import { gantryMeasurements } from '../../tools/ct/gantry-brick.js';

test('the first cap blocks the brick and the other blocks the separator',async()=>{
    const {geometry}=JSON.parse(await readFile(join(ctStage,'import.json'),'utf8'));
    const path=join(ctStage,geometry);
    const measurements=await gantryMeasurements(path);
    assert.equal(measurements.initialBlockers.brick?.blocker,'4000041/L208');
    assert.equal(measurements.initialBlockers.tool?.blocker,'4000041/L254');
    assert.ok(measurements.initialBlockers.brick!.depthMm>12 && measurements.initialBlockers.tool!.depthMm>8);
    // Both endpoints can be named in the graph even when the parked units
    // physically overlap. Moving the brick into the first cap's tray must fail.
    const mutated=`import json,sys\nfrom pathlib import Path\nfrom tools.ct.gantry_clearance import verify\nr=json.loads(Path('data/review/4000041/gantry-brick.json').read_text());r['brickTrayZ']=150\ntry: verify(Path(sys.argv[1]),r)\nexcept ValueError as e: print(e)\n`;
    const python=process.env.CT_CAD_PYTHON??(process.platform==='win32'?'.tmp/ct-cad-env/Scripts/python.exe':'.tmp/ct-cad-env/bin/python');
    assert.match(execFileSync(python,['-B','-c',mutated,path],{encoding:'utf8'}),/brick: bench transfer 2 .* overlaps 4000041\//);
});
