/**
 * The mechanic's position in a repair (plan 02 §5 · ticket 4).
 *
 * The controller owns this state, not the screen: only an explicit confirmation commits a step,
 * and a confirmation that names a step other than the current one is refused rather than
 * honoured. A stale tap — a double click, or a click that arrives after the step advanced —
 * would otherwise skip a step and tell the mechanic to fit a part whose blocker is still in the
 * way. Pure and serialisable, so a refresh can resume from a tab-scoped checkpoint (ticket 7).
 */
import type { RepairStep } from '../domain/schema.js';

export type ManualSession = Readonly<{
    steps: readonly RepairStep[];
    total: number;
    /** How many steps the mechanic has confirmed physically. */
    confirmedCount: number;
    /** The step the mechanic is on, or null once every step is confirmed. */
    current: RepairStep | null;
}>;

export function createManualSession(
    input: Readonly<{ steps: readonly RepairStep[]; total?: number }>
): ManualSession {
    const steps = input.steps;
    const confirmedCount = 0;
    return {
        steps,
        total: input.total ?? steps.length,
        confirmedCount,
        current: steps[confirmedCount] ?? null
    };
}

/** The step the mechanic is on, or null once every step is confirmed. */
export function currentStep(session: ManualSession): RepairStep | null {
    return session.steps[session.confirmedCount] ?? null;
}

/**
 * Commit a confirmation. Returns the same session, unchanged, when `stepId` is not the current
 * step — a duplicate or obsolete confirmation never advances the repair.
 */
export function confirmStep(session: ManualSession, stepId: string): ManualSession {
    const current = currentStep(session);
    if (current === null || current.stepId !== stepId) return session;
    if (session.steps.slice(0, session.confirmedCount).some((step) => step.stepId === stepId)) {
        return session;
    }
    const confirmedCount = session.confirmedCount + 1;
    return { ...session, confirmedCount, current: session.steps[confirmedCount] ?? null };
}

/** Undo the most recent confirmation and make that instruction current again. */
export function unconfirmLastStep(session: ManualSession): ManualSession {
    if (session.confirmedCount === 0) return session;
    const confirmedCount = session.confirmedCount - 1;
    return { ...session, confirmedCount, current: session.steps[confirmedCount] ?? null };
}

/** Steps the mechanic may still browse without committing, for the step list. */
export function stepHistory(session: ManualSession): ReadonlyArray<
    RepairStep & Readonly<{ state: 'confirmed' | 'current' | 'upcoming' }>
> {
    return session.steps.map((step, index) => ({
        ...step,
        state:
            index < session.confirmedCount
                ? 'confirmed'
                : index === session.confirmedCount
                  ? 'current'
                  : 'upcoming'
    }));
}
