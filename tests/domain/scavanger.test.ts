import { describe, expect, it } from 'vitest';
import { confirmScavangerTurn, decideScavangerPiece, scavangerChoices, scavangerDependencyGraph, startScavanger } from '../../src/domain/scavanger.js';
import { chainFixture } from '../fixtures/repairs.js';

describe('Scavanger guided removal loop', () => {
    it('cycles through every remaining component in stable order', () => {
        const model = chainFixture();
        const run = startScavanger(model);
        expect(scavangerChoices(model, run).map((piece) => piece.id)).toEqual(['A', 'B', 'T']);
        expect(run.currentPieceId).toBe('A');
    });

    it('uses remove/keep decisions and starts another pass for pieces kept behind', () => {
        const model = chainFixture();
        let run = startScavanger(model);
        run = decideScavangerPiece(model, run, 'A', 'remove');
        expect(run.currentPieceId).toBe('B');
        expect(run.removedIds).toEqual([]);
        run = decideScavangerPiece(model, run, 'B', 'keep');
        run = decideScavangerPiece(model, run, 'T', 'keep');

        expect(run.awaitingTurnConfirmation).toBe(true);
        expect(run.removedIds).toEqual([]);
        run = confirmScavangerTurn(model, run);
        expect(run.removedIds).toEqual(['A']);
        expect(run.turns).toEqual([['A']]);
        expect(run.currentPieceId).toBe('B');
        expect(run.edges).toContainEqual({ from: 'A', to: 'B', turn: 1 });
        expect(run.edges).toContainEqual({ from: 'A', to: 'T', turn: 1 });
    });

    it('finishes when a complete pass removes nothing and retains the remainder', () => {
        const model = chainFixture();
        let run = startScavanger(model);
        run = decideScavangerPiece(model, run, 'A', 'keep');
        run = decideScavangerPiece(model, run, 'B', 'keep');
        run = decideScavangerPiece(model, run, 'T', 'keep');
        expect(run.awaitingTurnConfirmation).toBe(true);
        run = confirmScavangerTurn(model, run);
        expect(run.finished).toBe(true);
        expect(run.retainedIds).toEqual(['A', 'B', 'T']);
        expect(run.currentPieceId).toBeNull();
    });

    it('exports occurrence-level graph nodes and turn-order candidate links', () => {
        const model = chainFixture();
        let run = startScavanger(model);
        run = decideScavangerPiece(model, run, 'A', 'remove');
        run = decideScavangerPiece(model, run, 'B', 'keep');
        run = decideScavangerPiece(model, run, 'T', 'keep');
        run = confirmScavangerTurn(model, run);
        run = decideScavangerPiece(model, run, 'B', 'keep');
        run = decideScavangerPiece(model, run, 'T', 'keep');
        run = confirmScavangerTurn(model, run);
        const graph = scavangerDependencyGraph(model, run);

        expect(graph.schema).toBe('restart.scavanger-dependency-graph/1');
        expect(graph.nodes.map((node) => [node.id, node.turn, node.outcome])).toEqual([
            ['A', 1, 'removed'], ['B', 2, 'retained'], ['T', 2, 'retained']
        ]);
        expect(graph.edges).toHaveLength(2);
    });
});
