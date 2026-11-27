/**
 * The presentation contract for the mechanic's manual (plan 02 §5 · ticket 4).
 *
 * Readonly data in, event callbacks out, and the drawing field supplied as a slot. The screen
 * computes nothing: eligibility, counts and the human-readable evidence are derived by selectors
 * in `src/app`, so the same screen renders identically in the production host and in the
 * development gallery, which is what lets a designer restyle it without touching behaviour.
 */
import type { ReactNode } from 'react';
import type { RepairStep } from '../domain/schema.js';

/** How the mechanic would describe the phase they are in, rather than an enum name. */
const PHASE_LABEL: Readonly<Record<RepairStep['phase'], string>> = {
    remove: 'Taking it apart',
    replace: 'Fitting the new part',
    restore: 'Putting it back',
    check: 'Checking it works'
};

export type StepViewModel = Readonly<{
    stepId: string;
    ordinal: number;
    total: number;
    phase: RepairStep['phase'];
    phaseLabel: string;
    heading: string;
    instruction: string;
    partLabel: string;
    /** Always "1×": a repair replaces one physical piece, and the sheet says so. */
    quantityLabel: string;
    locationLabel: string;
    toolLabel: string;
    stopLandmark: string;
    directionLabel: string;
    canConfirm: boolean;
    isHistorical: boolean;
    canGoBack: boolean;
    confirmationLabel: string;
    /** Why confirmation is unavailable, in the mechanic's terms. Shown only when it is. */
    blockedReason: string | null;
}>;

export type ManualActions = Readonly<{
    confirmStep(stepId: string): void;
    replayMotion(): void;
    resetCamera(): void;
    returnToCurrentStep(): void;
    goBackOneStep(): void;
}>;

export type ManualScreenProps = Readonly<{
    step: StepViewModel;
    actions: ManualActions;
    /** The drawing field: the assembly view, supplied by the scene adapter. */
    scene: ReactNode;
    /** The buried piece shown on its own. Absent when the piece is already visible. */
    partInset?: ReactNode;
}>;

export function toStepViewModel(
    step: RepairStep,
    total: number,
    eligibility: Readonly<{ canConfirm: boolean; blockedReason?: string; isHistorical?: boolean; canGoBack?: boolean }>
): StepViewModel {
    return {
        stepId: step.stepId,
        ordinal: step.ordinal,
        total,
        phase: step.phase,
        phaseLabel: PHASE_LABEL[step.phase],
        heading: step.heading,
        instruction: step.instruction,
        partLabel: step.partLabel,
        quantityLabel: '1×',
        locationLabel: step.locationLabel,
        toolLabel: step.toolLabel,
        stopLandmark: step.stopLandmark,
        directionLabel: step.directionLabel,
        canConfirm: eligibility.canConfirm,
        isHistorical: eligibility.isHistorical ?? false,
        canGoBack: eligibility.canGoBack ?? false,
        confirmationLabel: 'Confirm this step',
        blockedReason: eligibility.canConfirm ? null : (eligibility.blockedReason ?? null)
    };
}
