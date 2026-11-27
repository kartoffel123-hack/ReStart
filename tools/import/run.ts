/**
 * `npm run model:import` (plan 02 §1, §3A). Reads the pinned STEP snapshot, expands it into
 * the 70 physical pieces, tessellates them, proves which mesh belongs to which piece, and
 * writes the geometry package plus a report into the staging directory.
 *
 * Staging, not `public/models/30465/`: that directory holds the *published* dataset, which is
 * only promoted by `model:verify` once all 70 repairs replay (plan 02 §6). Intermediates stay
 * out of the web bundle.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildImportPackage } from './build-package.js';

const STEP_PATH =
    'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';
const STAGING = '.tmp/import';

async function main(): Promise<void> {
    const started = Date.now();
    const { report, glb } = await buildImportPackage(STEP_PATH);
    const directory = resolve(STAGING);
    mkdirSync(directory, { recursive: true });

    const glbName = `geometry-${report.glb.sha256.slice(0, 16)}.glb`;
    writeFileSync(resolve(directory, glbName), glb);
    writeFileSync(resolve(directory, 'import-report.json'), `${JSON.stringify(report, null, 2)}\n`);

    const row = (label: string, value: string): void => console.log(`  ${label.padEnd(24)} ${value}`);
    console.log(`imported ${STEP_PATH}`);
    row('source sha256', report.source.sha256);
    row('occurrences', `${report.tree.occurrences} pieces from ${report.tree.usageCount} usages`);
    row('definitions', `${report.tree.assemblyDefinitionCount} assembly, ${report.tree.leafDefinitionCount} leaf`);
    row(
        'tessellation',
        `${report.tessellation.meshes} meshes, ${report.tessellation.meshBearingNodes}/${report.tessellation.nodes} nodes carry geometry, ${report.tessellation.meshReferences} references`
    );
    row('triangles', `${report.tessellation.triangles} (diagnostic only — RV-001 / RI-01)`);
    row(
        'identity crosswalk',
        `${report.crosswalk.matched}/${report.tree.occurrences} matched, lowest score ${report.crosswalk.lowestScore.toFixed(4)}, smallest margin ${report.crosswalk.smallestMargin.toFixed(4)}`
    );
    row('glb', `${report.glb.bytes} bytes, ${report.glb.instances} pickable instances, sha256 ${report.glb.sha256.slice(0, 16)}`);
    console.log(`wrote ${STAGING}/${glbName} and ${STAGING}/import-report.json in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    console.log(`not published: public/models/30465/ is promoted by model:verify (plan 02 §6)`);
}

await main();
