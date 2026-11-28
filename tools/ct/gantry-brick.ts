import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { vec3Schema, type AssemblyModel, type Box, type Operation, type Vec3 } from '../../src/domain/schema.js';
import { createHash } from 'node:crypto';

const config=z.object({target:z.string(),support:z.string(),separator:z.string(),check:z.string(),groups:z.array(z.object({
    key:z.string(),label:z.string(),members:z.array(z.string()).length(5),out:z.string(),back:z.string()})).length(2),
    toolOriginMm:vec3Schema,extract:z.string(),exchange:z.string(),insert:z.string(),functionCheck:z.string()});
const measurements=z.object({paths:z.record(z.string(),z.array(vec3Schema).length(4)),
    initialBlockers:z.record(z.string(),z.object({blocker:z.string(),depthMm:z.number(),pointMm:vec3Schema})),
    contacts:z.array(z.object({moving:z.string(),fixed:z.string(),depthMm:z.number(),witnessMm:vec3Schema}))});
export const gantryRecipe=async()=>config.parse(JSON.parse(await readFile('data/review/4000041/gantry-brick.json','utf8')));
export async function gantryMeasurements(glbPath:string,demo=false) {
    const python=process.env.CT_CAD_PYTHON ?? (process.platform==='win32'?'.tmp/ct-cad-env/Scripts/python.exe':'.tmp/ct-cad-env/bin/python');
    const {stdout}=await promisify(execFile)(python,['-B','-m',demo?'tools.ct.demo_clearance':'tools.ct.gantry_clearance',glbPath]);
    const result=measurements.parse(JSON.parse(stdout));
    result.contacts.sort((a,b)=>a.moving.localeCompare(b.moving)||a.fixed.localeCompare(b.fixed));
    const hash=createHash('sha256').update(await readFile('tools/ct/gantry_clearance.py')).update(await readFile('data/review/4000041/gantry-brick.json'));
    if(demo) hash.update(await readFile('tools/ct/demo_clearance.py'));
    return {...result,revision:hash.digest('hex')};
}

const plus=(a:Vec3,b:Vec3):Vec3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export function addGantryJob(model:AssemblyModel,boxes:Map<string,Box>,recipe:z.infer<typeof config>,measured:Awaited<ReturnType<typeof gantryMeasurements>>) {
    const paths:Record<string,Vec3[]>={};
    const home=new Map(model.poses.filter(p=>p.kind==='installed').map(p=>[p.occurrenceId,p.frame]));
    const source={tier:'generated' as const,source:`${model.source.stepSha256}:gantry-crown`,note:`Access check ${measured.revision}. Upward column edge tolerance 0.01 mm; two named stud-seat contacts ≤0.055 mm; opposed 6 mm finger corridors at Y=89.75 mm; separator at ${recipe.separator}. Force and grip require a bench trial.`};
    const id=(line:number)=>`4000041/L${line}`;
    const joints=(pairs:[string,string][])=>pairs.map(([a,b])=>{
        const key=`crown:${a}:${b}`;
        const aa=boxes.get(a)!,bb=boxes.get(b)!;
        const origin=[0,1,2].map(j=>{
            const low=Math.max(aa.min[j]!,bb.min[j]!),high=Math.min(aa.max[j]!,bb.max[j]!);
            if(high-low<.05) throw new Error(`Missing seat region: ${a} / ${b}`);
            return (high+low)/2;
        }) as Vec3;
        if(!model.connections.some(c=>c.id===key)) model.connections.push({id:key,a,b,kind:'stud-tube',origin,axis:[0,1,0],installedEngaged:true,evidence:{...source,note:'Grouped nominal stud interface; origin is the centre of its overlapping seat region.'}});
        return key;
    });
    model.tools.push({id:'ct-separator',name:'Dark-turquoise LEGO separator · underside sockets on middle two studs',class:'brick-separator',isBenchTool:true});
    const external=new Map<string,string[]>();
    for (const [i,g] of recipe.groups.entries()) {
        const plate=g.members.at(-1)!;
        const internals=joints(g.members.slice(0,-1).map(slope=>[plate,slope]));
        model.units.push({id:g.key,name:g.label,memberIds:g.members,internalConnectionIds:internals,evidence:source});
        const pairs:[number,number][]=i===0?[[208,201],[208,247],[250,262],[251,263],[292,201],[293,201],[292,247],[293,247],[292,262],[293,263]]:[[207,248],[286,248],[287,248]];
        external.set(g.key,joints(pairs.map(([a,b])=>[id(a),id(b)])));
    }
    external.set('brick',joints([[recipe.target,recipe.support]]));
    const groups=[...recipe.groups,{key:'brick',label:'Buried gantry support brick',members:[recipe.target],out:recipe.extract,back:recipe.insert}];
    const route:string[]=[];
    for (const [index,g] of groups.entries()) {
        const outward=measured.paths[g.key]!,park=outward.at(-1)!;
        const lead=g.members[0]!,isTarget=g.key==='brick',toolId=isTarget?'ct-separator':'fingers';
        for(const member of g.members) {
            const frame=home.get(member)!;
            model.poses.push({id:`${member}/crown-park`,occurrenceId:member,kind:isTarget?'detached':'bench',curveFrame:'assembly',frame:{...frame,translation:plus(frame.translation,park)}});
        }
        const assignments=(parked:boolean)=>g.members.map(occurrenceId=>({occurrenceId,poseId:`${occurrenceId}/${parked?'crown-park':'installed'}`}));
        for (const phase of (isTarget?['remove','replace','restore']:['remove','restore']) as Operation['phase'][]) {
            const opId=`gantry-${g.key}-${phase}`,returning=phase==='restore',swap=phase==='replace';
            const points=returning?[...outward].reverse():swap?[park,park]:outward;
            paths[opId]=points;
            const start=home.get(lead)!;let travel=0;
            const frames=points.map((offset,k)=>{
                if(k) travel+=Math.hypot(...offset.map((v,j)=>v-points[k-1]![j]!));
                return {atMm:travel,frame:{rotation:start.rotation,translation:plus(start.translation,offset)}};
            });
            const extrema=(side:'min'|'max')=>[0,1,2].map(j=>(side==='min'?Math.min:Math.max)(...g.members.flatMap(m=>points.map(p=>boxes.get(m)![side][j]!+p[j]!)))) as Vec3;
            model.motions.push({id:opId,members:g.members,frames,curveFrame:'assembly',toolId,sweep:{min:extrema('min'),max:extrema('max')},allowedContacts:[],toleranceMm:.055,evidence:source});
            const text=swap?recipe.exchange:returning?g.back:g.out;
            const requires:Operation['requires']=[];
            if(isTarget && !swap) for (const [k,unit] of recipe.groups.entries()) {
                const witness=measured.initialBlockers[k===0?'brick':'tool']!;
                requires.push({id:`${opId}:${unit.key}`,subject:{kind:'occurrence',id:witness.blocker},acceptable:[`${witness.blocker}/crown-park`],role:k===0?'blocker':'tool-access',
                    reason:k===0?'The first roof plate crosses the brick’s upward exit.':'The second crown section occupies the separator handle approach.',evidence:{...source,note:`Projected column overlap: ${witness.depthMm} mm`}});
            }
            if(index===1 && phase==='remove') {
                const first=recipe.groups[0]!.members[0]!;
                requires.push({id:'crown-sequence',subject:{kind:'occurrence',id:first},acceptable:[`${first}/crown-park`],role:'support',reason:'This checked parking sequence places the first intact section in the nearer bench position.',evidence:source});
            }
            model.operations.push({id:opId,label:g.label,phase,members:g.members,from:assignments(returning||swap),to:assignments(!returning),requires,
                releasesConnectionIds:phase==='remove'?external.get(g.key)!:[],establishesConnectionIds:returning?external.get(g.key)!:[],
                ...(!isTarget?{unitId:g.key}:{}),wholeAssembly:false,motionId:opId,toolId,direction:[0,returning?-1:swap?0:1,0],directionLabel:text,strokeMm:travel,
                stopLandmark:swap?'the spare is ready in the same orientation':returning?'the studs are fully seated and both ends sit level':'the piece or intact section rests clear of the scanner in its indicated bench position',
                ...(phase==='remove'?{returnOperationId:`gantry-${g.key}-restore`}:{}),isReturn:returning,...(swap?{fitsReplacementOf:recipe.target}:{}),evidence:source});
        }
        route.push(`gantry-${g.key}-remove`);
    }
    model.functionChecks.push({id:recipe.check,instruction:recipe.functionCheck,expectedBehaviour:'Both five-piece roof sections are seated, the crown is level and the scanner opening is unobstructed.',subjectUnitIds:recipe.groups.map(g=>g.key)});
    route.push('gantry-brick-replace',...groups.toReversed().map(g=>`gantry-${g.key}-restore`));
    return {paths,route};
}
