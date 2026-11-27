import { Vector3 } from 'three';
import type { ImportPackage } from '../import/build-package.js';
import { readWorldMeshes } from '../pilot/geometry.js';
import { buildObstacle } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';
import { axialCandidates } from './candidates.js';
import { axialFitAllowance } from './axial-fit.js';
import { prismaticExit } from './prismatic-fit.js';

export async function inspectExits(glb:Uint8Array,catalog:ImportPackage['catalog']) {
    const meshes=await readWorldMeshes(glb);
    const obstacles=meshes.map(p=>buildObstacle(p,{translation:[0,0,0],rotation:[0,0,0,1]}));
    const results=[];
    try {
        for(const option of axialCandidates(catalog,meshes)) {
            if(option.transverseJoints.length) continue;
            const moving=meshes.find(p=>p.id===option.piece)!;
            const travel=option.proposedStrokeMm+4, delta=new Vector3(...option.axis).multiplyScalar(travel);
            const back=delta.clone().negate();
            const parked=moving.positions.map((v,i)=>v+delta.getComponent(i%3));
            const obstructions=[];
            const certificates=[];
            for(const o of obstacles.filter(o=>o.id!==moving.id && [0,1,2].every(k=>
                o.bounds.min[k]!<=moving.bounds.max[k]!+Math.max(0,delta.getComponent(k))+1e-6 &&
                o.bounds.max[k]!>=moving.bounds.min[k]!+Math.min(0,delta.getComponent(k))-1e-6))) {
                const joint=catalog.joints.find(j=>j.pieces.includes(o.id) && j.pieces.includes(moving.id));
                if(joint && joint.roles.length===1) {
                    const role=joint.roles[0]!;
                    const certificate=prismaticExit(joint,moving.id,option.axis,
                        meshes.find(p=>p.id===role.maleOccurrenceId)!.positions,meshes.find(p=>p.id===role.femaleOccurrenceId)!.positions);
                    if(certificate && travel>=certificate.strokeToExit+1e-5) {certificates.push(certificate);continue;}
                }
                let problem=false;
                for(const returning of [false,true]) {
                    const v=returning?back:delta;
                    const allow=joint && axialFitAllowance(joint,moving.id,returning?delta:new Vector3(),v);
                    const hit=translationWitness(returning?parked:moving.positions,v,o,(m,b,t)=>
                        (returning?1-t[0]:t[1])*travel<1e-5 || !!allow?.(m,b,t));
                    if(hit){problem=true;break;}
                }
                if(problem) obstructions.push(o.id);
            }
            results.push({...option,travel,obstructions,certificates});
        }
        return results;
    } finally {obstacles.forEach(o=>o.geometry.dispose());}
}
