import { describe, expect, it } from 'vitest';
import { removedInstances } from '../../src/app/manual-scene-state.js';
import type { RepairStep } from '../../src/domain/schema.js';

const step = (phase: RepairStep['phase'], operationId: string): RepairStep => ({
    stepId: `${phase}-${operationId}`,
    ordinal: 1,
    phase,
    operationId,
    heading: '',
    instruction: '',
    toolLabel: '',
    stopLandmark: '',
    directionLabel: '',
    partLabel: '',
    locationLabel: ''
});

describe('manual scene physical state', () => {
    it('hides a confirmed removal and shows the occurrence again after restoration', () => {
        const steps = [step('remove', 'pull-gear'), step('restore', 'return-gear')];
        const movers = { 'pull-gear': 'gear-1', 'return-gear': 'gear-1' };

        expect(removedInstances(steps, 1, movers)).toEqual(new Set(['gear-1']));
        expect(removedInstances(steps, 2, movers)).toEqual(new Set());
    });

    it('does not hide an unconfirmed removal while browsing step history', () => {
        const steps = [step('remove', 'pull-gear')];
        expect(removedInstances(steps, 0, { 'pull-gear': 'gear-1' })).toEqual(new Set());
    });
});
