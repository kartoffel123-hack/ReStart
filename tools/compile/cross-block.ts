import type { AssemblyModel, Box, Operation, Vec3 } from '../../src/domain/schema.js';
import type { Joint } from '../lib/joints.js';

export const CROSS_BLOCK = '30465/NAUO17/NAUO56';
const shaft = '30465/NAUO19/NAUO52';
const X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0];

/** A reference route in assembly coordinates. Each row moves just one physical
 * occurrence; parking distances include space for the subsequent strokes. */
export function addCrossBlockRepair(model: AssemblyModel, bounds: ReadonlyMap<string, Box>, joints: readonly Joint[]) {
    const bladeAxle = '30465/NAUO19/NAUO53';
    const bladeFit = joints.find(j => j.pieces.includes(bladeAxle) && j.pieces.includes('30465/NAUO36'))!;
    const rotorAxis = bladeFit.axis.map(v => v * Math.sign(bladeFit.axis[0])) as Vec3;
    const strokes: [string, Vec3, number, string, string][] = [
        ['NAUO36', rotorAxis, 52, 'Hold the rotor hub and slide the highlighted blade outward along its axle.', 'Slide this blade back to the hub in its original orientation.'],
        ['NAUO37', rotorAxis, -25, 'Slide the opposite blade off the other end.', 'Refit the opposite blade against the hub.'],
        ['NAUO19/NAUO53', rotorAxis, 38, 'Draw the transverse blade axle out of the hub.', 'Centre the transverse axle in the hub with equal projections.'],
        ['NAUO19/NAUO54', Y, 28, 'Lift the rotor hub straight off the vertical shaft.', 'Press the hub down to the bush, aligning the blade axle bore as shown.'],
        ['NAUO19/NAUO55', Y, 18, 'Lift the upper bush off the vertical shaft.', 'Seat the upper bush against the top of the replacement block.'],
        ['NAUO19/NAUO52', Y, -23, 'Steady the lower gears and bush. Press the shaft down, then draw it from below without moving those parts.', 'Raise the shaft through the replacement block. Leave its lower tip about 1.4 mm below the bottom gear.'],
        ['NAUO27', X, 37, 'Slide the highlighted four-hole side link straight off both projecting axles.', 'Refit the side link to both axles and seat it against the short link.'],
        ['NAUO18', X, -28, 'Slide the opposite four-hole side link outward off both axles.', 'Refit the opposite side link to both axles.'],
        ['NAUO17/NAUO62', X, 24, 'Slide the highlighted short link outward off the axle with the central bore.', 'Seat the short link against the shoulder of the axle with the central bore.'],
        ['NAUO17/NAUO61', X, -16, 'Remove the short link on the opposite side.', 'Seat the opposite short link in its original orientation.'],
        ['NAUO17/NAUO59', Y, 22, 'Hold the friction pin in the block and lift the axle with the central bore off the pin.', 'Press the central bore of the axle onto the exposed pin up to its collar.'],
        ['NAUO17/NAUO58', Y, 12, 'Grip the exposed friction pin and pull it straight up out of the block.', 'Press the pin into the middle bore of the replacement until its collar seats.'],
        ['NAUO26', X, 35, 'Slide the highlighted curved nose beam outward off its axle ends.', 'Align the curved beam with both axle ends and press it back to its original depth.'],
        ['NAUO17/NAUO63', X, 24, 'Slide the exposed small bush off the short nose axle.', 'Slide the small bush back against the replacement block.'],
        ['NAUO17/NAUO56', X, 18, 'Hold the short nose axle in the opposite beam. Slide the cross block sideways off its exposed end.', 'Slide the replacement cross block onto the short axle, with its vertical bores aligned over the shaft and pin positions.']
    ];
    const pieces = model.occurrences.filter(p => p.kind === 'piece');
    const parked = new Map<string, string>();
    const route: string[] = [], returns: string[] = [];
    for (const [path, axis, distance, pull, seat] of strokes) {
        const id = `30465/${path}`, prefix = `cross-block:${path}`, free = `${prefix}/out`;
        const home = model.poses.find(p => p.occurrenceId === id && p.kind === 'installed')!;
        const delta = axis.map(v => v * distance) as Vec3;
        const away = { ...home.frame, translation: home.frame.translation.map((v, k) => v + delta[k]!) as Vec3 };
        const stop = id === shaft ? 'about 24.4 mm of shaft projects below the bottom gear; the upper end is below the cross block and still in the bevel gear'
            : `the piece is ${Math.abs(distance)} mm from its original seat at the highlighted parking position`;
        model.poses.push({id: free, occurrenceId: id, kind: id === shaft ? 'retracted' : 'detached', frame: away,
            curveFrame: 'assembly', travelMm: Math.abs(distance), stopLandmark: stop, ...(id === shaft ? {supportedBy:'30465/NAUO6'} : {})});
        const evidence = {tier:'generated' as const, source:`${model.source.stepSha256}:cross-block-v1`,
            note:'Single-member translations. Keyed axle tessellation allowance up to 0.048 mm; split pin tip radius modeled at 2.30 mm under compression, upper collar seat allowance 0.101 mm. Grip, force and stops await kit review.'};
        const requires: Operation['requires'] = pieces.filter(p => p.id !== id).map(p => ({id:`pose:${p.id}`,
            subject:{kind:'occurrence',id:p.id}, acceptable:[parked.get(p.id) ?? p.installedPoseId],role:'support',
            reason:'Keep this piece at its indicated position for the measured stroke.', evidence}));
        const contacts = model.connections.filter(c => (c.a === id || c.b === id) &&
            !parked.has(c.a === id ? c.b : c.a));
        const released = contacts.filter(c => id !== shaft || c.a === CROSS_BLOCK || c.b === CROSS_BLOCK).map(c => c.id);
        const allowedContacts = contacts.map(c => {
            const pair = [c.a,c.b];
            const pin = pair.includes('30465/NAUO17/NAUO58');
            const keyed = pair.includes('30465/NAUO17/NAUO59');
            return {a:c.a,b:c.b,region:c.id,evidence, ...(pin ? {fitModel:'cross-block-split-pin' as const} : keyed ? {fitModel:'cross-block-keyed-axle' as const} : {})};
        });
        const box = bounds.get(id)!;
        const sweep = {min:box.min.map((v,k) => v + Math.min(0,delta[k]!)) as Vec3, max:box.max.map((v,k) => v + Math.max(0,delta[k]!)) as Vec3};
        const phases = id === CROSS_BLOCK ? ['remove','replace','restore'] as const : ['remove','restore'] as const;
        for (const phase of phases) {
            const op = `${prefix}/${phase}`, restoring = phase === 'restore', exchanging = phase === 'replace';
            const from = phase === 'remove' ? home.id : free, to = restoring ? home.id : free;
            const label = (restoring ? seat : exchanging ? 'Set the damaged three-long cross block aside. Turn the matching spare' : pull).replace(/\.$/, '');
            const travel = exchanging ? 0 : Math.abs(distance);
            model.motions.push({id:op,members:[id],curveFrame:'assembly',toolId:'fingers',sweep,toleranceMm:0.12,evidence,allowedContacts,
                frames:[{atMm:0,frame:from === free ? away : home.frame},{atMm:travel,frame:to === free ? away : home.frame}]});
            model.operations.push({id:op,members:[id],phase,label,motionId:op,toolId:'fingers',requires,evidence,
                from:[{occurrenceId:id,poseId:from}],to:[{occurrenceId:id,poseId:to}],wholeAssembly:false,
                direction:axis.map(v => exchanging ? 0 : v * Math.sign(distance) * (restoring ? -1 : 1)) as Vec3,
                directionLabel:label,strokeMm:travel,stopLandmark:restoring ? 'the piece matches its original seated depth and orientation' : exchanging ? 'its three bores match the orientation of the removed block' : stop,
                releasesConnectionIds:phase === 'remove' ? released : [], establishesConnectionIds:restoring ? released : [],isReturn:restoring,
                ...(phase === 'remove' ? {returnOperationId:`${prefix}/restore`} : exchanging ? {fitsReplacementOf:id} : {})});
            if (restoring) returns.push(op); else route.push(op);
        }
        parked.set(id,free);
    }
    const check = 'cross-block-fit';
    model.functionChecks.push({id:check,subjectUnitIds:[],instruction:'Check that the cross block is seated, then turn the main rotor gently by hand.',
        expectedBehaviour:'the block to stay seated, the lower gears to stay aligned and the tail rotor to turn without binding'});
    return {check, route:[...route,...returns.reverse()]};
}
