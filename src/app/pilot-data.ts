import { z } from 'zod';
import { evidenceStatusSchema, repairSchema, vec3Schema } from '../domain/schema.js';

export const pilotSchema = z.object({
    geometry: z.string().regex(/^geometry-[0-9a-f]{64}\.glb$/),
    target: z.string(), pin: z.string(), signedRadialGapMm: z.number().optional(),evidence:z.record(z.string(),evidenceStatusSchema).optional(),
    paths: z.record(z.string(), z.tuple([vec3Schema, vec3Schema])),
    inventory:z.array(z.object({id:z.string(),name:z.string(),elementId:z.string(),designNo:z.string().optional(),color:z.string()})),
    repair: repairSchema
    ,alternatives:repairSchema.array(), jointRepair:repairSchema, movers:z.record(z.string(),z.string())
});
/** v1 remains strict. In v2 a repair belongs to its target; there is no
 * mandatory second pin or joint procedure. Normalize once for the UI. */
export const datasetManualSchema = pilotSchema.pick({geometry:true,inventory:true,paths:true,movers:true,evidence:true}).extend({
    defaultTarget: z.string(), repairs: z.record(z.string(),repairSchema)
}).transform((data, ctx) => {
    const repair = data.repairs[data.defaultTarget];
    if (!repair || Object.entries(data.repairs).some(([id,r]) => r.targetIds.length !== 1 || r.targetIds[0] !== id)) {
        ctx.addIssue({code:'custom',message:'Manual target does not identify its repair'});
        return z.NEVER;
    }
    return {...data,target:data.defaultTarget,repair,alternatives:Object.values(data.repairs).filter(r=>r!==repair)};
});

type HelicopterPilot = z.infer<typeof pilotSchema>;
export type PilotData = Omit<HelicopterPilot,'pin'|'jointRepair'> & Partial<Pick<HelicopterPilot,'pin'|'jointRepair'>>;
