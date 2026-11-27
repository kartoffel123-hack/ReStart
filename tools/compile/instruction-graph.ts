/** Build the fixed review graph; it is deliberately not a catalog of approved motions. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { extractCandidateBlockers, type MotionCandidateSummary } from '../../src/domain/dependency-tree.js';
import { assemblyModelSchema } from '../../src/domain/schema.js';
import { connectionDofCatalogSchema } from '../../src/domain/dof.js';

const pilot = 'public/models/30465/pilot/';
const read = (name: string) => JSON.parse(readFileSync(pilot + name, 'utf8'));
const model = assemblyModelSchema.parse(read('graph.json'));
const candidates: MotionCandidateSummary[] = read('motion-candidates.json');
const dof = connectionDofCatalogSchema.parse(read('connection-dof.json'));
const sheet = 'assets/lego-helicopter-30465-1.snapshot.9/Instructions - Lego Helicopter 30465.png';
const pieces = model.occurrences.filter(o => o.kind === 'piece');
const connections = new Map(model.connections.map(c => [c.id, c]));

// Paths identify sets of occurrences in the panel, not an order among repeated parts.
// A trailing slash expands all descendants. The multi-panel tail build is split by leaf.
const panels: [number[], string, string][] = [
    [[1], '1/', 'Pin and 3-long axle in the first corner beam.'],
    [[2], '2/ 3', '6-long axle and angle beam inset; small bush on the exposed end.'],
    [[3], '4/ 5', 'Second 6-long axle, cross block and long pin; add bush.'],
    [[4,5], '6 7 8 9 10', '5-long and 7-long beams with pin attachments; tail-shaft supports at the ends.'],
    [[6], '11/ 12', '9-long shaft carries a gear and bush; fit the far gear after passing the shaft through the supports.'],
    [[7], '13/', 'Paired 3-long axles held by two short beams.'],
    [[8], '14/ 15', '3-long axle through the nose with a small bush on either side.'],
    [[9], '16', 'First curved nose beam fitted to projecting axles.'],
    [[10], '17/', 'Build cross block, axles, bushes and short links as an inset before mounting.'],
    [[11], '18', 'Fit the first 4-long link across the projecting ends.'],
    [[12], '19/ 20', 'Main shaft, transverse axle, joint and bush inset; gear engaged on insertion.'],
    [[13], '21 22', 'After turning the model, fit bush and bevel gear to the exposed main shaft.'],
    [[14], '23 24 25', 'Opposite corner beam retained at the projecting axle ends by two bushes.'],
    [[15], '26 27', 'Fit the second curved nose beam and opposite 4-long link.'],
    [[16], '28/42 28/43 28/44', 'Short axle joins the fairing and tail cross block.'],
    [[17], '28/45 28/46', 'Two friction pins enter the fairing.'],
    [[18], '28/47/ 28/48', 'Rotor, shaft and half bevel gear inset; bush on the far side of the cross block.'],
    [[19], '', 'Mate the assembled tail to the long beam on both pins.'],
    [[20], '29/ 30 31 32/', 'Paired skid mounts, including two pin-and-block insets.'],
    [[21], '33/ 34 35', 'Two 6-long skid axles and the red light on its stud pin.'],
    [[22], '36 37', 'Two main blades on opposite ends of the transverse rotor axle.']
];
const full = (path: string) => '30465/' + path.split('/').filter(Boolean).map(n => `NAUO${n}`).join('/');
const targets: Record<string, { name: string; parent: string | null; stages: number[]; options: string[]; modeledOperationIds: string[] }> = {};
for (const [stages, paths] of panels) {
    for (const path of paths.split(' ').filter(Boolean)) {
        const id = full(path);
        const matches = pieces.filter(p => path.endsWith('/') ? p.id.startsWith(id + '/') : p.id === id);
        if (!matches.length) throw Error(`Unmatched instruction reference: ${path}`);
        for (const p of matches) {
            if (targets[p.id]) throw Error(`Repeated panel assignment: ${p.id}`);
            targets[p.id] = { name: p.definitionName, parent: p.parent, stages, options: [],
                modeledOperationIds: model.operations.filter(op => op.phase === 'remove' && op.members.includes(p.id)).map(op => op.id) };
        }
    }
}
type Move = { id: string; members: string[]; direction: readonly number[]; requiresClear: string[];
    releases: string[]; note?: string; stages?: number[]; proposedStrokeMm?: number; evidence?: Record<string, string> };
const moves: Record<string, Move> = {};
function add(move: Move) {
    if (moves[move.id]) throw Error(`Duplicate move: ${move.id}`);
    const members = new Set(move.members);
    for (const id of [...members, ...move.requiresClear]) if (!targets[id]) throw Error(`Unknown piece: ${id}`);
    for (const id of members) targets[id]!.options.push(move.id);
    moves[move.id] = move;
}
function crossing(members: string[]) {
    const set = new Set(members);
    return model.connections.filter(c => set.has(c.a) !== set.has(c.b)).map(c => c.id);
}
for (const candidate of candidates) {
    const target = targets[candidate.piece]!;
    const blockers = extractCandidateBlockers(candidate, connections, dof.connections, target.name);
    add({ id: candidate.id, members: [candidate.piece], direction: candidate.axis,
        proposedStrokeMm: candidate.proposedStrokeMm, releases: crossing([candidate.piece]),
        requiresClear: blockers.map(b => b.obstacleId), evidence: Object.fromEntries(blockers.map(b => [b.obstacleId, b.label])) });
}
function group(id: string, stages: number[], paths: string[], clear: string[], direction: readonly number[], note: string) {
    const members = paths.map(full);
    add({ id, stages, members, direction, requiresClear: clear.map(full), releases: crossing(members), note });
}
group('sheet:6:withdraw-drive-shaft', [5,6], ['11/70','11/71','11/72'], ['12'], [0,0,1],
    'Reverse the shaft inset: release the tail-end gear and draw the shaft toward the nose with its near gear and bush. Nose-frame and drivetrain clearance in the finished model are untested.');
group('sheet:8:withdraw-nose-axle', [8,9,15], ['14/64','14/65'], ['15','16'], [-1,0,0],
    'Clear the opposite retaining bush and the curved beam on the exit side. Carry the inset bush on the axle; check access to the opposite bush behind its beam.');
group('sheet:8:withdraw-nose-axle-opposite', [8,9,15], ['14/64','15'], ['14/65','26'], [1,0,0],
    'Mirrored option: carry the other bush, clearing the first bush and the curved beam on this exit side.');
group('sheet:18:withdraw-rotor-stack', [18], ['28/47/50', '28/47/49', '28/47/51'], ['28/48'], [1,0,0],
    'Pull toward the rotor with gear and rotor on the shaft. Separate the selected member on the bench. See step-18/side.png and step-18/axial.png.');
const tailAndLight = pieces.filter(p => p.id.startsWith(full('28') + '/') || p.id.startsWith(full('33') + '/')).map(p => p.id);
add({ id: 'sheet:19:lift-tail-with-light', stages: [17,18,19,21], members: tailAndLight, requiresClear: [],
    direction: [0,-1,0], releases: crossing(tailAndLight), note: 'Withdraw both pins from the beam together; keep the light and rotor on the tail. Gear disengagement and sweep need checking. Further separation is needed for any individual target.' });
for (const [carried, cleared] of [['36','37'], ['37','36']] as const) {
    const bladeExit = candidates.find(c => c.piece === full(carried) && c.exitAssessment?.length === 0);
    if (!bladeExit) throw Error(`Missing outward blade direction: ${carried}`);
    group(`sheet:22:carry-${carried}`, [12,22], ['19/53',carried], [cleared], bladeExit.axis,
        'Clear the opposite blade; withdraw the axle toward the blade still attached. Separate the two on the bench.');
}
if (pieces.length !== Object.keys(targets).length || Object.values(targets).some(t => !t.options.length)) throw Error('Incomplete occurrence coverage');
const hashFile = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const graph = {
    status: 'Candidate disassembly graph; no new moves approved or physically verified.',
    semantics: 'For a target choose ONE option. For that move ALL requiresClear pieces must clear its path (not necessarily be removed). releases lists installed CAD connections crossing the moving set, not prerequisites. Group moves do not free individual members. An empty prerequisite list does not prove access. Tool, supports, sufficient travel, return and bench separation need review.',
    source: { sheet, sheetSha256: hashFile(sheet), stepSha256: model.source.stepSha256, pilotGraphRevision: model.graphRevision,
        pilotInputs: Object.fromEntries(['graph.json','motion-candidates.json','connection-dof.json'].map(name => [name,hashFile(pilot + name)])) },
    coordinates: 'Installed assembly frame; unit direction vectors and stroke in mm.',
    panels: panels.map(([stages,,observation]) => ({ stages, observation })),
    targets, moves,
    modeledRemovals: Object.fromEntries(model.operations.filter(op => op.phase === 'remove').map(op => [op.id, {
        label: op.label, members: op.members, direction: op.direction, strokeMm: op.strokeMm,
        tool: op.toolId, requires: op.requires, from: op.from, to: op.to, releases: op.releasesConnectionIds,
        returnOperationId: op.returnOperationId, evidence: op.evidence
    }])),
    connections: model.connections.map(({id,a,b,kind}) => ({id,a,b,kind}))
};
writeFileSync('data/review/instruction-graph.json', JSON.stringify(graph, null, 2) + '\n');
console.log(`${pieces.length} targets, ${Object.keys(moves).length} candidate moves, ${connections.size} connections.`);
