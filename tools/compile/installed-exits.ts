import type { AssemblyModel, Box, Vec3, Operation, Pose } from '../../src/domain/schema.js';
import type { ImportPackage } from '../import/build-package.js';
import { inspectExits } from './exposed.js';
import { PIN,TARGET } from '../pilot/geometry.js';
import { verifyTranslationJob } from '../verify/route-geometry.js';

/** Connectivity is a necessary support screen, not a force calculation. Avoid
 * offering a pull that leaves another unit disconnected from the assembly. */
export function leavesOneAssembly(catalog:ImportPackage['catalog'],...removed:string[]) {
    const ids=catalog.pieces.filter(p=>!removed.includes(p.id)).map(p=>p.id);
    const seen=new Set([ids[0]!]);
    const joints=catalog.joints.filter(j=>!j.pieces.some(p=>removed.includes(p)));
    let count=0;
    while(count!==seen.size){count=seen.size;for(const j of joints) if(j.pieces.some(p=>seen.has(p))) j.pieces.forEach(p=>seen.add(p));}
    return seen.size===ids.length;
}

export async function addInstalledExits(input:ImportPackage,model:AssemblyModel,bounds:ReadonlyMap<string,Box>) {
    const survey=await inspectExits(input.glb,input.catalog);
    const checks:Record<string,string>={};
    const install=(model:AssemblyModel,option:typeof survey[number],blocker?:{piece:string;pose:string})=>{
        const piece=option.piece;
        const occurrence=model.occurrences.find(p=>p.id===piece)!;
        const home=model.poses.find(p=>p.id===occurrence.installedPoseId)!;
        const axis=[...option.axis] as Vec3,delta=axis.map(v=>v*option.travel) as Vec3;
        const free:Pose={ id:`${option.id}/free`,occurrenceId:piece,curveFrame:'assembly',kind:'detached',frame:{translation:home.frame.translation.map((v,k)=>v+delta[k]!) as Vec3,rotation:home.frame.rotation} };
        model.poses.push(free);
        const evidence={tier:'generated' as const,source:`installed-axial-v1:${option.id}`,note:'Straight slide; 4 mm past exit. Initial seated contact, coaxial fit and non-widening shaft assumptions. Steady the mating piece; finger access unverified.'};
        const joints=model.connections.filter(c=>(c.a===piece || c.b===piece) && (!blocker || (c.a!==blocker.piece && c.b!==blocker.piece)));
        const holder=joints.map(j=>model.occurrences.find(p=>p.id===(j.a===piece?j.b:j.a))!.commonName).join(' and ');
        const guard:Operation['requires']=model.occurrences.filter(p=>p.kind==='piece' && p.id!==piece).map(p=>({id:`installed:${p.id}`,subject:{kind:'occurrence',id:p.id},acceptable:[p.installedPoseId],role:'support',reason:'This option was checked with the surrounding assembly installed.',evidence}));
        if(blocker) {
            const required=guard.find(r=>r.subject.id===blocker.piece)!;
            required.acceptable=[blocker.pose];required.role='blocker';required.reason='This piece occupies the withdrawal path in its installed pose.';
        }
        const names=['pull','swap','seat'].map(n=>`${option.id}/${n}`);
        for(const [i,phase] of (['remove','replace','restore'] as const).entries()) {
            const from=i===0?home:free,to=i===2?home:free;
            const id=names[i]!,distance=i===1?0:option.travel;
            const direction=axis.map(v=>v*(i===0?1:i===2?-1:0)) as Vec3;
            const box=bounds.get(piece)!;
            const sweep={min:box.min.map((v,k)=>v+Math.min(0,delta[k]!)) as Vec3,max:box.max.map((v,k)=>v+Math.max(0,delta[k]!)) as Vec3};
            model.motions.push({id,members:[piece],frames:[{atMm:0,frame:from.frame},{atMm:distance,frame:to.frame}],curveFrame:'assembly',toolId:'fingers',sweep,
                allowedContacts:joints.map(j=>({a:j.a,b:j.b,region:j.id,evidence})),toleranceMm:0.12,evidence});
            const text=i===0?`Steady ${holder}. Slide the ${occurrence.commonName} straight along the arrow`:i===1?`Take the matching ${occurrence.commonName} and align it like the removed piece`:`Slide the replacement back along the same axis`;
            model.operations.push({id,label:text,phase,members:[piece],from:[{occurrenceId:piece,poseId:from.id}],to:[{occurrenceId:piece,poseId:to.id}],requires:guard,
                releasesConnectionIds:i===0?joints.map(j=>j.id):[],establishesConnectionIds:i===2?joints.map(j=>j.id):[],wholeAssembly:false,motionId:id,toolId:'fingers',direction,directionLabel:text,strokeMm:distance,
                stopLandmark:i===0?'a visible gap separates the piece from its mating end':i===1?'the keyed faces point in their original orientation':'the piece reaches its original seated depth',isReturn:i===2,evidence,
                ...(i===0?{returnOperationId:names[2]!,alternativeGroup:`exit:${piece}`} : i===1?{fitsReplacementOf:piece}:{})});
        }
        const group=model.alternativeGroups.find(g=>g.id===`exit:${piece}`);
        if(group) group.operationIds.push(names[0]!);else model.alternativeGroups.push({id:`exit:${piece}`,satisfies:`release ${piece}`,operationIds:[names[0]!]});
        if(!model.functionChecks.some(c=>c.id===`check:${piece}`)) {
            model.functionChecks.push({id:`check:${piece}`,subjectUnitIds:[],instruction:`Check that the ${occurrence.commonName} is seated in its original position and turn the rotor gently by hand.`,expectedBehaviour:'the part remains seated and the rotor turns without new binding'});
        }
        return names;
    };
    const direct=survey.filter(o=>!o.obstructions.length && ![PIN,TARGET].includes(o.piece) && leavesOneAssembly(input.catalog,o.piece));
    for(const option of direct){install(model,option);checks[option.piece]=`check:${option.piece}`;}
    // Derive a bounded two-piece catalog. Keep an option only after replaying
    // the parked mesh against the moving target, including both return paths.
    for(const target of survey.filter(o=>o.obstructions.length===1 && ![PIN,TARGET].includes(o.piece))) {
        for(const access of direct.filter(o=>o.piece===target.obstructions[0])) {
            if(!leavesOneAssembly(input.catalog,target.piece,access.piece)) continue;
            const trial=structuredClone(model);
            // Move the access piece far enough that its nearest axial extent
            // clears the entire proposed target sweep, with the 4 mm air gap.
            const axis=access.axis, ab=bounds.get(access.piece)!,tb=bounds.get(target.piece)!;
            let nearest=0,farthest=0;
            for(let k=0;k<3;k++) {const v=axis[k]!;nearest+=v*(v>=0?ab.min[k]!:ab.max[k]!);
                farthest+=v*(v>=0?tb.max[k]!+Math.max(0,target.axis[k]!*target.travel):tb.min[k]!+Math.min(0,target.axis[k]!*target.travel));}
            const park={...access,id:`park:${access.id}:for:${target.id}`,travel:Math.max(access.travel,farthest-nearest+4)};
            const parkOps=install(trial,park);
            // Parking a healthy part is not a second target exchange option.
            trial.operations=trial.operations.filter(o=>o.id!==parkOps[1]);
            trial.motions=trial.motions.filter(m=>m.id!==parkOps[1]);
            const option={...target,id:`${target.id}:via:${access.id}`};
            const targetOps=install(trial,option,{piece:access.piece,pose:`${park.id}/free`});
            const sequence=[parkOps[0]!,...targetOps,parkOps[2]!];
            const issues=await verifyTranslationJob(input.glb,trial,{operationIds:sequence},input.catalog.joints);
            if(issues.length) continue;
            // The stop refers to the access piece's visible clearance of this
            // target, not just the point at which its own fit first releases.
            trial.operations.find(o=>o.id===parkOps[0])!.stopLandmark=`it is clear of the ${trial.occurrences.find(p=>p.id===target.piece)!.commonName} withdrawal path (${park.travel.toFixed(1)} mm from its seat)`;
            Object.assign(model,trial);checks[target.piece]=`check:${target.piece}`;
        }
    }
    return {checks,survey};
}
