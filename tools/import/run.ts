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
    row(
        'interface features',
        `${report.features.cylinders} cylinders over ${report.features.definitions} definitions, ` +
            `${report.features.travelAxes} candidate travel axes`
    );
    row(
        'mating interfaces',
        `${report.interfaces.candidates} candidates from ${report.interfaces.faces} placed faces ` +
            `(coaxial ≤ ${report.interfaces.axisToleranceMm} mm, radius match ≤ ${report.interfaces.fitToleranceMm} mm) — ` +
            `candidates only`
    );
    const confirmed = report.interfaces.confirmed;
    const rejectedByReason = Object.entries(confirmed.rejectedByReason)
        .map(([reason, count]) => `${reason} ${count}`)
        .join(', ');
    row(
        'confirmed joints',
        `${confirmed.joints} face-pair joints over ${confirmed.piecePairs} piece pairs, ` +
            `grip ${confirmed.engagementMinMm.toFixed(2)}–${confirmed.engagementMaxMm.toFixed(2)} mm, ` +
            `contact ≤ ${confirmed.contactMaxMm.toFixed(4)} mm; rejected ${rejectedByReason}` +
            (confirmed.withoutJoint.length > 0
                ? `; ${confirmed.withoutJoint.length} occurrence(s) without a joint`
                : '')
    );
    row('glb', `${report.glb.bytes} bytes, ${report.glb.instances} pickable instances, sha256 ${report.glb.sha256.slice(0, 16)}`);
    row(
        'type catalog',
        `${report.sources.types} types, quantity ${report.sources.quantityTotal} (sheet declares ${report.sources.declaredTotal}), all traced to occurrences`
    );
    row(
        'bill of materials',
        `${report.sources.bomRows} rows, ${report.sources.positionalAgreement} positionally aligned, ${report.sources.uniqueRows} unique / ${report.sources.ambiguousRows} ambiguous row links`
    );
    row('timing lookup', `${report.sources.timingRows} connection rows, ${report.sources.timingCrossChecks} cross-check issues`);
    for (const notice of report.sources.notices) row('notice', notice);
    console.log(`wrote ${STAGING}/${glbName} and ${STAGING}/import-report.json in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    console.log(`not published: public/models/30465/ is promoted by model:verify (plan 02 §6)`);
}

await main();
