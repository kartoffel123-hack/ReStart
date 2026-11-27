import { z } from 'zod';
import { evidenceStatusSchema, repairSchema, vec3Schema } from '../domain/schema.js';

export const pilotSchema = z.object({
    geometry: z.string().regex(/^geometry-[0-9a-f]{64}\.glb$/),
    target: z.string(), pin: z.string(), signedRadialGapMm: z.number().optional(),evidence:z.record(z.string(),evidenceStatusSchema).optional(),
    paths: z.record(z.string(), z.tuple([vec3Schema, vec3Schema])),
    inventory:z.array(z.object({id:z.string(),name:z.string(),elementId:z.string(),color:z.string()})),
    repair: repairSchema
    ,alternatives:repairSchema.array(), jointRepair:repairSchema, movers:z.record(z.string(),z.string())
});
export type PilotData = z.infer<typeof pilotSchema>;
export const pilotBase = `${import.meta.env.BASE_URL}models/30465/`;
