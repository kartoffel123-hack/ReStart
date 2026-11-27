/**
 * Deterministic example states for the concept gallery (plan 02 §5.4).
 *
 * These are the states the design review needs to see before the real loader exists: a buried
 * piece with a blocker still in place, the same piece once it can come out, and a restoration
 * step, which reads differently from a removal. They are fixtures and live in `src/concept/`;
 * production loads its steps from the published dataset.
 */
import type { RepairStep } from '../domain/schema.js';

const TAIL_GEAR: RepairStep = {
    stepId: 'concept-tail-gear',
    ordinal: 3,
    phase: 'remove',
    operationId: 'op-pull-bush',
    heading: 'Free the grey bush behind the tail gear',
    instruction:
        'Grip the bush and slide it straight out along the axle. Keep the gear where it is — it does not come off.',
    toolLabel: 'Fingers',
    stopLandmark: 'The end of the bush clears the face of the beam',
    directionLabel: 'Straight out along the axle',
    partLabel: 'Bush 3L',
    locationLabel: 'Tail rotor, behind the gear'
};

const RESTORE_PIN: RepairStep = {
    stepId: 'concept-restore-pin',
    ordinal: 6,
    phase: 'restore',
    operationId: 'op-return-pin',
    heading: 'Put the long pin back through the beam',
    instruction:
        'Line the pin up with the outer hole and push it through until the head sits flat against the beam.',
    toolLabel: 'Fingers',
    stopLandmark: 'The pin head sits flush with the beam',
    directionLabel: 'Straight in, through both holes',
    partLabel: 'Friction pin 5L',
    locationLabel: 'Tail boom, outer hole'
};

export type ConceptScenario = Readonly<{
    id: string;
    label: string;
    why: string;
    step: RepairStep;
    total: number;
    canConfirm: boolean;
    blockedReason: string | null;
    obstruction: string | null;
}>;

export const CONCEPT_SCENARIOS: readonly ConceptScenario[] = [
    {
        id: 'buried-blocked',
        label: 'Buried piece, blocker still in place',
        why: 'The mechanic must see what is in the way and why the confirm control is not available.',
        step: TAIL_GEAR,
        total: 7,
        canConfirm: false,
        blockedReason: 'The tail gear in front of it has not come off yet. Take step 2 first.',
        obstruction: 'Tail gear'
    },
    {
        id: 'buried-ready',
        label: 'Same piece, ready to come out',
        why: 'The step the mechanic acts on: one piece, one direction, one stop condition.',
        step: TAIL_GEAR,
        total: 7,
        canConfirm: true,
        blockedReason: null,
        obstruction: null
    },
    {
        id: 'restore',
        label: 'Putting it back',
        why: 'Restoration reads differently from removal, and the sheet has to say which it is.',
        step: RESTORE_PIN,
        total: 7,
        canConfirm: true,
        blockedReason: null,
        obstruction: null
    }
];
