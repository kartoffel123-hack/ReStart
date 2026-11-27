import type { AssemblyModel, Operation, Box } from '../../src/domain/schema.js';
import { PIN, TARGET } from './geometry.js';
import { HOLDER } from './pin-geometry.js';

export function addPinOperations(model:AssemblyModel,travel:number,park:number,installedBounds:ReadonlyMap<string,Box>) {
    const joint=(a:string,b:string)=>model.connections.find(c=>(c.a===a && c.b===b)||(c.a===b && c.b===a))!.id;
    const studFit=joint(PIN,TARGET),pinFit=joint(PIN,HOLDER);
    const evidence={tier:'generated' as const,source:`pin-geometry/v1:${model.source.datasetRevision}`,note:'Split pin compression assumed inside cross-block bore. Finger access not checked on kit.'};
    const installed=(id:string)=>`${id}/installed`;
    const parked=`${TARGET}/parked`,free=`${PIN}/detached`;
    for(const [id,name,distance] of [[TARGET,parked,park],[PIN,free,travel]] as const) {
        const at=model.poses.find(p=>p.id===installed(id))!.frame;
        model.poses.push({id:name,occurrenceId:id,kind:'detached',curveFrame:'assembly',frame:{rotation:at.rotation,translation:[at.translation[0]-distance,at.translation[1],at.translation[2]]}});
    }
    const make=(id:string,member:string,from:string,to:string,phase:Operation['phase'],instruction:string,stop:string,extra:Partial<Operation>)=>{
        const a=model.poses.find(p=>p.id===from)!.frame,b=model.poses.find(p=>p.id===to)!.frame;
        const delta=b.translation[0]-a.translation[0],stroke=Math.abs(delta);
        const op:Operation={id,label:instruction,phase,members:[member],from:[{occurrenceId:member,poseId:from}],to:[{occurrenceId:member,poseId:to}],
            requires:[],releasesConnectionIds:[],establishesConnectionIds:[],wholeAssembly:false,motionId:id,toolId:'fingers',direction:[Math.sign(delta),0,0],directionLabel:instruction,
            strokeMm:stroke,stopLandmark:stop,isReturn:false,evidence,...extra};
        model.operations.push(op);
        const lo=model.occurrences.find(p=>p.id===member)!.installedPoseId;
        const home=model.poses.find(p=>p.id===lo)!.frame.translation[0];
        const bounds=installedBounds.get(member)!;
        model.motions.push({id,members:[member],frames:[{atMm:0,frame:a},{atMm:stroke,frame:b}],curveFrame:'assembly',toolId:'fingers',
            sweep:{min:[bounds.min[0]!+Math.min(a.translation[0],b.translation[0])-home,bounds.min[1]!,bounds.min[2]!],max:[bounds.max[0]!+Math.max(a.translation[0],b.translation[0])-home,bounds.max[1]!,bounds.max[2]!] },
            allowedContacts:[],toleranceMm:0.06,evidence});
    };
    const needs=(member:string,pose:string,reason:string):Operation['requires']=>[{id:`needs:${pose}`,subject:{kind:'occurrence',id:member},acceptable:[pose],role:'blocker',reason,evidence}];
    make('park-cap',TARGET,installed(TARGET),parked,'remove','Slide the red cap off the blue pin and hold it clear along the same line','the cap is about 18 mm from its seated position',{returnOperationId:'return-cap',releasesConnectionIds:[studFit]});
    make('withdraw-pin',PIN,installed(PIN),free,'remove','Support the cross block and pull the blue pin toward the parked cap','the split end is clear of the block',{
        requires:needs(TARGET,parked,'The red cap occupies the pull path'),returnOperationId:'return-pin',releasesConnectionIds:[pinFit]});
    make('swap-pin',PIN,free,free,'replace','Exchange the blue friction pin for the same type','the split end of the spare faces the empty bore',{fitsReplacementOf:PIN});
    make('swap-parked-cap',TARGET,parked,parked,'replace','Exchange the detached red cap for a matching spare','the new cap faces the pin and stays clear of the block',{
        fitsReplacementOf:TARGET,requires:needs(PIN,free,'Keep the shared access open for the joint exchange')});
    make('return-pin',PIN,free,installed(PIN),'restore','Press the spare split end back through the cross block','the collar seats in its original recess',{
        requires:needs(TARGET,parked,'Keep the cap clear of the insertion path'),isReturn:true,establishesConnectionIds:[pinFit]});
    make('return-cap',TARGET,parked,installed(TARGET),'restore','Slide the red cap back onto the exposed stud','the cap is flush against the pin shoulder',{
        requires:needs(PIN,installed(PIN),'The replacement pin must be seated'),isReturn:true,establishesConnectionIds:[studFit]});
    model.functionChecks.push({id:'pin-fit',instruction:'Gently check the red cap and blue pin at the cross block.',subjectUnitIds:[],expectedBehaviour:'both remain seated without slipping'});
}
