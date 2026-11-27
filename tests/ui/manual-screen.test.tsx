// @vitest-environment jsdom
/**
 * Ticket 4 · V05 · the mechanic's manual screen (plan 02 §5).
 *
 * The bar for this screen is not that it looks finished; it is that a teammate can tell, from
 * the screen alone and without explanation, which physical piece to touch, which way it goes, what
 * the next action is, and when to stop (plan 02 §5.4). So these tests read the screen the way that
 * teammate would: by the words on it, and by whether confirming is something the mechanic does.
 *
 * Layout at 1280x800 and 390x844 is checked by the capture trail and by Playwright, not here:
 * jsdom has no viewport. What is checked here is that the *same* props carry the meaning.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ManualScreen } from '../../src/presentation/manual-screen.js';
import type { ManualScreenProps } from '../../src/presentation/manual-contract.js';
import { toStepViewModel } from '../../src/presentation/manual-contract.js';
import { createManualSession, confirmStep, unconfirmLastStep } from '../../src/app/manual-session.js';
import type { RepairStep } from '../../src/domain/schema.js';

const BURIED_GEAR: RepairStep = {
    stepId: 'step-3',
    ordinal: 3,
    phase: 'remove',
    operationId: 'op-pull-bush',
    heading: 'Free the grey bush',
    instruction: 'Slide the bush straight out along the axle until its end is level with the beam.',
    toolLabel: 'Fingers',
    stopLandmark: 'The bush clears the beam face',
    directionLabel: 'Straight out along the axle',
    partLabel: 'Bush 3L',
    locationLabel: 'Tail rotor, behind the gear'
};

const slots = {
    scene: <div data-testid="scene">drawing field</div>,
    partInset: <div data-testid="part-inset">part inset</div>
};

function renderScreen(
    step: RepairStep = BURIED_GEAR,
    overrides: Partial<ManualScreenProps> = {}
) {
    const actions = {
        confirmStep: vi.fn(),
        replayMotion: vi.fn(),
        resetCamera: vi.fn(),
        returnToCurrentStep: vi.fn(),
        goBackOneStep: vi.fn()
    };
    const props = {
        step: toStepViewModel(step, 7, { canConfirm: true }),
        actions,
        ...slots,
        ...overrides
    };
    render(<ManualScreen {...props} />);
    return { actions, props };
}

beforeEach(cleanup);

describe('what the mechanic can read off the screen', () => {
    it('names the piece, the direction and the action, all at once', () => {
        renderScreen();
        // The strip is where the mechanic reads the step; the inset names the piece again on
        // purpose, so this asks the strip rather than the page.
        expect(within(screen.getByRole('region', { name: 'This step' })).getByText('Bush 3L')).toBeInTheDocument();
        expect(screen.getByText('Straight out along the axle')).toBeInTheDocument();
        expect(screen.getByText(BURIED_GEAR.instruction)).toBeInTheDocument();
    });

    it('says where in the helicopter this piece is, because several look alike', () => {
        renderScreen();
        expect(screen.getByText(/Tail rotor, behind the gear/)).toBeInTheDocument();
    });

    it('keeps the step instruction collapsed until the mechanic opens it', async () => {
        const user = userEvent.setup();
        renderScreen();
        const instruction = screen.getByText(BURIED_GEAR.instruction);
        const direction = screen.getByText(BURIED_GEAR.directionLabel);
        expect(instruction).not.toBeVisible();
        expect(direction).not.toBeVisible();
        await user.click(screen.getByText('Details'));
        expect(instruction).toBeVisible();
        expect(direction).toBeVisible();
    });

    it('shows the step as one of a counted sequence', () => {
        renderScreen();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/of 7/)).toBeInTheDocument();
    });

    it('keeps the tool and the stop condition legible in the instruction strip', () => {
        renderScreen();
        expect(screen.getByText('Fingers')).toBeInTheDocument();
        expect(screen.getByText('The bush clears the beam face')).toBeInTheDocument();
    });

    it('says which phase of the repair this step belongs to, in words a mechanic uses', () => {
        const { rerender } = render(
            <ManualScreen
                step={toStepViewModel(BURIED_GEAR, 7, { canConfirm: true })}
                actions={{ confirmStep: vi.fn(), replayMotion: vi.fn(), resetCamera: vi.fn(), returnToCurrentStep: vi.fn(), goBackOneStep: vi.fn() }}
                {...slots}
            />
        );
        expect(screen.getByText(/Taking it apart/i)).toBeInTheDocument();

        rerender(
            <ManualScreen
                step={toStepViewModel({ ...BURIED_GEAR, phase: 'restore' }, 7, { canConfirm: true })}
                actions={{ confirmStep: vi.fn(), replayMotion: vi.fn(), resetCamera: vi.fn(), returnToCurrentStep: vi.fn(), goBackOneStep: vi.fn() }}
                {...slots}
            />
        );
        expect(screen.getByText(/Putting it back/i)).toBeInTheDocument();
    });
});

describe('what the mechanic does', () => {
    it('advances only when the mechanic confirms this exact step', () => {
        const { actions } = renderScreen();
        const confirm = screen.getByRole('button', { name: /confirm/i });
        expect(screen.queryByRole('status')).toBeNull();
        fireEvent.click(confirm);
        expect(actions.confirmStep).toHaveBeenCalledWith('step-3');
    });

    it('lets a keyboard user reach and press confirmation', async () => {
        const { actions } = renderScreen();
        const user = userEvent.setup();
        await user.tab();
        expect(screen.getByText('Details')).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: /replay the motion/i })).toHaveFocus();
        await user.tab();
        const confirm = screen.getByRole('button', { name: /confirm/i });
        expect(confirm).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(actions.confirmStep).toHaveBeenCalledWith('step-3');
    });

    it('explains why confirmation is unavailable instead of leaving a dead button', () => {
        renderScreen(BURIED_GEAR, {
            step: toStepViewModel(BURIED_GEAR, 7, {
                canConfirm: false,
                blockedReason: 'The gear in front of it has not come off yet.'
            })
        });
        const confirm = screen.getByRole('button', { name: /confirm/i });
        expect(confirm).toBeDisabled();
        expect(screen.getByText('The gear in front of it has not come off yet.')).toBeInTheDocument();
    });

    it('offers to replay the motion and to return to the current step', () => {
        const { actions } = renderScreen(BURIED_GEAR, {
            step: toStepViewModel(BURIED_GEAR, 7, { canConfirm: false, isHistorical: true })
        });
        fireEvent.click(screen.getByRole('button', { name: /replay/i }));
        fireEvent.click(screen.getByRole('button', { name: /back to this step/i }));
        expect(actions.replayMotion).toHaveBeenCalled();
        expect(actions.returnToCurrentStep).toHaveBeenCalled();
    });

    it('does not show a duplicate back action on the current step', () => {
        renderScreen();
        expect(screen.queryByRole('button', { name: /back to this step/i })).not.toBeInTheDocument();
    });

    it('does not show a reset-view button', () => {
        renderScreen();
        expect(screen.queryByRole('button', { name: /reset the view/i })).not.toBeInTheDocument();
    });

    it('offers the previous step next to replay when a prior step exists', () => {
        const { actions } = renderScreen(BURIED_GEAR, {
            step: toStepViewModel(BURIED_GEAR, 7, { canConfirm: false, isHistorical: true, canGoBack: true })
        });
        const previous = screen.getByRole('button', { name: 'Previous step' });
        expect(previous).toBeEnabled();
        fireEvent.click(previous);
        expect(actions.goBackOneStep).toHaveBeenCalled();
    });

    it('disables previous step when there is no earlier instruction', () => {
        renderScreen();
        expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
    });
});

describe('what the drawing field is for', () => {
    it('renders the scene and the part inset into their slots', () => {
        renderScreen();
        expect(screen.getByTestId('scene')).toBeInTheDocument();
        expect(screen.getByTestId('part-inset')).toBeInTheDocument();
    });

    it('labels the inset as the buried piece shown on its own', () => {
        renderScreen();
        expect(screen.getByRole('complementary', { name: /Bush 3L/ })).toBeInTheDocument();
        expect(screen.getByTestId('part-inset')).toBeInTheDocument();
    });

    it('still works when a screen has no inset to show', () => {
        renderScreen(BURIED_GEAR, { partInset: null });
        expect(screen.queryByTestId('part-inset')).toBeNull();
        expect(screen.getByTestId('scene')).toBeInTheDocument();
    });
});

describe('the session behind the screen', () => {
    const steps: readonly RepairStep[] = [
        { ...BURIED_GEAR, stepId: 'step-1', ordinal: 1 },
        { ...BURIED_GEAR, stepId: 'step-2', ordinal: 2 },
        { ...BURIED_GEAR, stepId: 'step-3', ordinal: 3 }
    ];

    it('walks the steps in order and reports the last one as done', () => {
        let session = createManualSession({ steps, total: 3 });
        expect(session.current?.stepId).toBe('step-1');
        session = confirmStep(session, 'step-1');
        expect(session.confirmedCount).toBe(1);
        session = confirmStep(session, 'step-2');
        session = confirmStep(session, 'step-3');
        expect(session.current).toBeNull();
        expect(session.confirmedCount).toBe(3);
    });

    it('refuses a confirmation for a step that is not the current one', () => {
        // A stale or duplicate tap must not skip a step: the mechanic would be told to fit a part
        // whose blocker is still in the way.
        const session = createManualSession({ steps, total: 3 });
        expect(confirmStep(session, 'step-3')).toBe(session);
        expect(confirmStep(session, 'step-3').confirmedCount).toBe(0);
    });

    it('refuses to confirm the same step twice', () => {
        let session = createManualSession({ steps, total: 3 });
        session = confirmStep(session, 'step-1');
        expect(confirmStep(session, 'step-1').confirmedCount).toBe(1);
    });

    it('undoes the last confirmation and makes that step current again', () => {
        let session = createManualSession({ steps, total: 3 });
        session = confirmStep(session, 'step-1');
        session = confirmStep(session, 'step-2');
        const rewound = unconfirmLastStep(session);
        expect(rewound.confirmedCount).toBe(1);
        expect(rewound.current?.stepId).toBe('step-2');
    });

    it('does not go back before the first step', () => {
        const session = createManualSession({ steps, total: 3 });
        expect(unconfirmLastStep(session)).toBe(session);
    });
});
