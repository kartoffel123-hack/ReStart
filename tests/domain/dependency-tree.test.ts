import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    buildDependencyTree,
    type MotionCandidateSummary
} from '../../src/domain/dependency-tree.js';
import { computeDofTimingSummary, connectionDofCatalogSchema } from '../../src/domain/dof.js';
import { assemblyModelSchema, type AssemblyModel, type Repair } from '../../src/domain/schema.js';

function makeChainModel(): { model: AssemblyModel; repair: Repair; candidates: MotionCandidateSummary[] } {
    const rootAssembly = {
        id: 'kit',
        definitionId: 'KIT',
        definitionName: 'Kit',
        parent: null,
        path: ['kit'],
        kind: 'assembly' as const,
        installedPoseId: 'kit/installed',
        meshId: null,
        typeKey: 'assembly',
        commonName: 'Test helicopter',
        locationLabel: 'root'
    };
    const subAssembly = {
        id: 'kit/sub',
        definitionId: 'SUB',
        definitionName: 'Sub',
        parent: 'kit',
        path: ['kit', 'sub'],
        kind: 'assembly' as const,
        installedPoseId: 'kit/sub/installed',
        meshId: null,
        typeKey: 'assembly',
        commonName: 'Rotor head',
        locationLabel: 'top'
    };
    const pieces = ['target', 'blocker', 'leaf'].map((name) => ({
        id: `kit/sub/${name}`,
        definitionId: name.toUpperCase(),
        definitionName: name,
        parent: 'kit/sub',
        path: ['kit', 'sub', name],
        kind: 'piece' as const,
        installedPoseId: `kit/sub/${name}/installed`,
        meshId: `mesh:${name}`,
        typeKey: name,
        commonName: name.charAt(0).toUpperCase() + name.slice(1),
        locationLabel: 'top'
    }));
    const poses = [rootAssembly, subAssembly, ...pieces].flatMap((occ) => [
        {
            id: `${occ.id}/installed`,
            occurrenceId: occ.id,
            kind: 'installed' as const,
            frame: { translation: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number] },
            curveFrame: 'assembly'
        },
        ...(occ.kind === 'piece'
            ? [
                  {
                      id: `${occ.id}/free`,
                      occurrenceId: occ.id,
                      kind: 'detached' as const,
                      frame: { translation: [20, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number] },
                      curveFrame: 'assembly'
                  }
              ]
            : [])
    ]);
    const evidence = { tier: 'reviewed' as const, source: 'test-fixture' };
    const connections = [
        {
            id: 'conn:target-blocker',
            a: 'kit/sub/target',
            b: 'kit/sub/blocker',
            kind: 'pin-hole' as const,
            origin: [0, 0, 0] as [number, number, number],
            axis: [1, 0, 0] as [number, number, number],
            installedEngaged: true,
            evidence
        },
        {
            id: 'conn:blocker-leaf',
            a: 'kit/sub/blocker',
            b: 'kit/sub/leaf',
            kind: 'axle-bore' as const,
            origin: [10, 0, 0] as [number, number, number],
            axis: [1, 0, 0] as [number, number, number],
            installedEngaged: true,
            evidence
        }
    ];
    const motion = {
        id: 'm:slide',
        members: ['kit/sub/leaf'],
        frames: [
            { atMm: 0, frame: { translation: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number] } },
            { atMm: 10, frame: { translation: [10, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number] } }
        ],
        curveFrame: 'assembly',
        toolId: 'fingers',
        sweep: { min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] },
        allowedContacts: [],
        toleranceMm: 0.5,
        evidence
    };
    const operations = [
        {
            id: 'op:remove-leaf',
            label: 'Pull leaf straight off',
            phase: 'remove' as const,
            members: ['kit/sub/leaf'],
            from: [{ occurrenceId: 'kit/sub/leaf', poseId: 'kit/sub/leaf/installed' }],
            to: [{ occurrenceId: 'kit/sub/leaf', poseId: 'kit/sub/leaf/free' }],
            requires: [],
            releasesConnectionIds: ['conn:blocker-leaf'],
            establishesConnectionIds: [],
            wholeAssembly: false,
            motionId: 'm:slide',
            toolId: 'fingers',
            direction: [1, 0, 0] as [number, number, number],
            directionLabel: 'Pull leaf straight off',
            strokeMm: 10,
            stopLandmark: 'leaf is clear',
            isReturn: false,
            evidence
        },
        {
            id: 'op:remove-blocker',
            label: 'Slide blocker out',
            phase: 'remove' as const,
            members: ['kit/sub/blocker'],
            from: [{ occurrenceId: 'kit/sub/blocker', poseId: 'kit/sub/blocker/installed' }],
            to: [{ occurrenceId: 'kit/sub/blocker', poseId: 'kit/sub/blocker/free' }],
            requires: [
                {
                    id: 'req:blocker-needs-leaf',
                    subject: { kind: 'connection' as const, id: 'conn:blocker-leaf' },
                    acceptable: ['released'],
                    role: 'blocker' as const,
                    reason: 'Leaf holds the blocker axle in place',
                    evidence
                }
            ],
            releasesConnectionIds: ['conn:target-blocker'],
            establishesConnectionIds: [],
            wholeAssembly: false,
            motionId: 'm:slide',
            toolId: 'fingers',
            direction: [1, 0, 0] as [number, number, number],
            directionLabel: 'Slide blocker out',
            strokeMm: 12,
            stopLandmark: 'blocker is clear',
            isReturn: false,
            evidence
        },
        {
            id: 'op:remove-target',
            label: 'Pull target free',
            phase: 'remove' as const,
            members: ['kit/sub/target'],
            from: [{ occurrenceId: 'kit/sub/target', poseId: 'kit/sub/target/installed' }],
            to: [{ occurrenceId: 'kit/sub/target', poseId: 'kit/sub/target/free' }],
            requires: [
                {
                    id: 'req:target-needs-blocker',
                    subject: { kind: 'occurrence' as const, id: 'kit/sub/blocker' },
                    acceptable: ['kit/sub/blocker/free'],
                    role: 'blocker' as const,
                    reason: 'Blocker obstructs the target exit',
                    evidence
                }
            ],
            releasesConnectionIds: [],
            establishesConnectionIds: [],
            wholeAssembly: false,
            motionId: 'm:slide',
            toolId: 'fingers',
            direction: [1, 0, 0] as [number, number, number],
            directionLabel: 'Pull target free',
            strokeMm: 8,
            stopLandmark: 'target is clear',
            alternativeGroup: 'choice:target-exit',
            isReturn: false,
            evidence
        }
    ];
    const model: AssemblyModel = {
        schemaVersion: 1,
        graphRevision: 'rev:test',
        source: {
            datasetRevision: 'ds:test',
            stepSha256: '0'.repeat(64),
            importerVersion: '0.1.0',
            tessellation: { linearDeflection: 0.1, angularDeflection: 0.5, units: 'mm' },
            triangleCount: 100
        },
        occurrences: [rootAssembly, subAssembly, ...pieces],
        units: [],
        connections,
        poses,
        tools: [{ id: 'fingers', name: 'Fingers', class: 'fingers', isBenchTool: true }],
        motions: [motion],
        operations,
        alternativeGroups: [
            {
                id: 'choice:target-exit',
                satisfies: 'free target',
                operationIds: ['op:remove-target']
            }
        ],
        functionChecks: []
    };
    const repair: Repair = {
        targetIds: ['kit/sub/target'],
        datasetRevision: model.source.datasetRevision,
        graphRevision: model.graphRevision,
        procedureFingerprint: 'fp:test',
        operationIds: ['op:remove-leaf', 'op:remove-blocker', 'op:remove-target'],
        functionCheckId: 'chk:1',
        steps: [
            {
                stepId: 's1',
                ordinal: 1,
                operationId: 'op:remove-leaf',
                phase: 'remove',
                heading: 'Remove leaf',
                instruction: 'Pull leaf straight off',
                toolLabel: 'Fingers',
                stopLandmark: 'leaf is clear',
                directionLabel: 'Pull straight off',
                partLabel: 'Leaf',
                locationLabel: 'top'
            },
            {
                stepId: 's2',
                ordinal: 2,
                operationId: 'op:remove-blocker',
                phase: 'remove',
                heading: 'Remove blocker',
                instruction: 'Slide blocker out',
                toolLabel: 'Fingers',
                stopLandmark: 'blocker is clear',
                directionLabel: 'Slide out',
                partLabel: 'Blocker',
                locationLabel: 'top'
            },
            {
                stepId: 's3',
                ordinal: 3,
                operationId: 'op:remove-target',
                phase: 'remove',
                heading: 'Remove target',
                instruction: 'Pull target free',
                toolLabel: 'Fingers',
                stopLandmark: 'target is clear',
                directionLabel: 'Pull free',
                partLabel: 'Target',
                locationLabel: 'top'
            }
        ],
        disturbedIds: ['kit/sub/leaf', 'kit/sub/blocker'],
        disturbedCount: 2,
        preservedUnits: [],
        timing: {
            timedActions: 0,
            totalActions: 3,
            coverage: 'none',
            estimatedSeconds: null,
            basis: 'test',
            rowIds: []
        },
        search: {
            status: 'proved-minimum',
            expandedStates: 4,
            budget: 100,
            tieFrontierComplete: true,
            bestDisturbedCount: 2,
            lowerBound: 2,
            firstUnsatisfied: [],
            incumbentSource: 'search'
        },
        replay: { ok: true, steps: [], issues: [] },
        alternatives: []
    };
    const candidates: MotionCandidateSummary[] = [
        {
            id: 'cand:leaf',
            piece: 'kit/sub/leaf',
            axis: [1, 0, 0],
            proposedStrokeMm: 10,
            transverseJoints: [],
            contacts: []
        }
    ];
    return { model, repair, candidates };
}

describe('buildDependencyTree', () => {
    it('expands a full transitive dependency chain from target down to free leaves and tags manual steps', () => {
        const { model, repair, candidates } = makeChainModel();
        const tree = buildDependencyTree(model, 'kit/sub/target', {
            includeRequires: true,
            includeConnected: false,
            includeContains: false,
            includeCandidates: false,
            repair,
            candidates
        });

        expect(tree.rootId).toBe('kit/sub/target');
        const byId = new Map(tree.nodes.map((node) => [node.id, node]));
        expect(byId.get('kit/sub/target')?.depth).toBe(0);
        expect(byId.get('kit/sub/target')?.role).toBe('target');
        expect(byId.get('kit/sub/target')?.manualStepOrdinals).toEqual([3]);

        expect(byId.get('kit/sub/blocker')?.depth).toBe(1);
        expect(byId.get('kit/sub/blocker')?.inManual).toBe(true);
        expect(byId.get('kit/sub/blocker')?.manualStepOrdinals).toEqual([2]);

        expect(byId.get('kit/sub/leaf')?.depth).toBe(2);
        expect(byId.get('kit/sub/leaf')?.role).toBe('free');
        expect(byId.get('kit/sub/leaf')?.isFree).toBe(true);
        expect(byId.get('kit/sub/leaf')?.manualStepOrdinals).toEqual([1]);

        expect(tree.edges.every((edge) => edge.relation === 'requires')).toBe(true);
        expect(tree.edges.some((edge) => edge.alternativeGroup === 'choice:target-exit')).toBe(true);
        expect(tree.stats.maxDepth).toBe(2);
        expect(tree.stats.freeLeafCount).toBe(1);
    });

    it('keeps contains, connected-to, and requires as distinct edge relations without collapsing them', () => {
        const { model } = makeChainModel();
        const tree = buildDependencyTree(model, 'kit/sub/target', {
            includeRequires: true,
            includeConnected: true,
            includeContains: true,
            includeCandidates: false
        });

        const relations = new Set(tree.edges.map((edge) => edge.relation));
        expect(relations.has('requires')).toBe(true);
        expect(relations.has('connected-to')).toBe(true);
        expect(relations.has('contains')).toBe(true);

        const containsNodes = tree.nodes.filter((node) => node.kind === 'assembly').map((node) => node.id);
        expect(containsNodes).toContain('kit/sub');
        expect(containsNodes).toContain('kit');
    });

    it('detects cycles in connected-to edges without infinite loops and stays deterministic', () => {
        const { model } = makeChainModel();
        model.connections.push({
            id: 'conn:leaf-target-cycle',
            a: 'kit/sub/leaf',
            b: 'kit/sub/target',
            kind: 'pin-hole',
            origin: [0, 0, 0],
            axis: [0, 1, 0],
            installedEngaged: true,
            evidence: { tier: 'generated', source: 'cycle-test' }
        });

        const first = buildDependencyTree(model, 'kit/sub/target', {
            includeRequires: false,
            includeConnected: true,
            includeContains: false,
            includeCandidates: false
        });
        const second = buildDependencyTree(model, 'kit/sub/target', {
            includeRequires: false,
            includeConnected: true,
            includeContains: false,
            includeCandidates: false
        });

        expect(first).toEqual(second);
        expect(first.edges.some((edge) => edge.isCycle)).toBe(true);
        expect(first.nodes).toHaveLength(3);
    });

    it('builds a complete DOF-backed dependency tree and removal/reassembly plan for all 70 physical pieces', () => {
        const graphRaw = JSON.parse(readFileSync('public/models/30465/pilot/graph.json', 'utf8'));
        const candidatesRaw = JSON.parse(
            readFileSync('public/models/30465/pilot/motion-candidates.json', 'utf8')
        ) as MotionCandidateSummary[];
        const dofRaw = JSON.parse(readFileSync('data/review/connection-dof.json', 'utf8'));
        const dofCatalog = connectionDofCatalogSchema.parse(dofRaw);
        const model = assemblyModelSchema.parse(graphRaw);
        const pieces = model.occurrences.filter((occ) => occ.kind === 'piece');

        expect(dofCatalog.connections).toHaveLength(84);
        expect(dofCatalog.pieces).toHaveLength(70);
        expect(pieces).toHaveLength(70);

        for (const piece of pieces) {
            const tree = buildDependencyTree(model, piece.id, {
                includeRequires: true,
                includeConnected: false,
                includeContains: false,
                includeCandidates: true,
                candidates: candidatesRaw,
                dofCatalog
            });
            expect(tree.rootId).toBe(piece.id);
            const rootNode = tree.nodes.find((node) => node.id === piece.id && node.depth === 0);
            expect(rootNode).toBeDefined();
            expect(rootNode?.remainingTranslationalDof).not.toBeNull();
            expect(tree.plan.removalOrder.at(-1)?.pieceId).toBe(piece.id);
            expect(tree.plan.reassemblyOrder[0]?.pieceId).toBe(piece.id);
            expect(tree.plan.removalOrder.length).toBe(tree.plan.reassemblyOrder.length);
        }
    });

    it('excludes aligned mating-joint peers from candidate blockers and derives reverse reassembly order', () => {
        const { model } = makeChainModel();
        // Remove modeled operations so candidate-blocker logic runs on target -> blocker -> leaf
        const unmodeled: AssemblyModel = { ...model, operations: [] };
        const candidates: MotionCandidateSummary[] = [
            {
                id: 'cand:target',
                piece: 'kit/sub/target',
                axis: [1, 0, 0],
                proposedStrokeMm: 10,
                alignedJoints: ['conn:target-blocker'],
                transverseJoints: [],
                contacts: [
                    { obstacle: 'kit/sub/blocker', witness: { fromMm: 0, toMm: 2 } },
                    { obstacle: 'kit/sub/leaf', witness: { fromMm: 3, toMm: 5 } }
                ]
            },
            {
                id: 'cand:leaf',
                piece: 'kit/sub/leaf',
                axis: [1, 0, 0],
                proposedStrokeMm: 10,
                alignedJoints: [],
                transverseJoints: [],
                contacts: []
            }
        ];

        const tree = buildDependencyTree(unmodeled, 'kit/sub/target', {
            includeRequires: true,
            includeCandidates: true,
            includeConnected: false,
            includeContains: false,
            candidates
        });

        const nodeIds = tree.nodes.map((n) => n.id);
        expect(nodeIds).toContain('kit/sub/target');
        expect(nodeIds).toContain('kit/sub/leaf');
        // blocker is only an aligned mating surface, NOT a blocking obstacle
        expect(nodeIds).not.toContain('kit/sub/blocker');

        expect(tree.plan.removalOrder.map((s) => s.pieceId)).toEqual([
            'kit/sub/leaf',
            'kit/sub/target'
        ]);
        expect(tree.plan.reassemblyOrder.map((s) => s.pieceId)).toEqual([
            'kit/sub/target',
            'kit/sub/leaf'
        ]);
        expect(tree.plan.additionalPartsCount).toBe(1);
        expect(tree.plan.releasedPieceIds).toEqual(['kit/sub/leaf']);
    });

    it('minimizes released connections and keeps intact subassemblies together instead of dismantling unrelated stages', () => {
        const graphRaw = JSON.parse(readFileSync('public/models/30465/pilot/graph.json', 'utf8'));
        const candidatesRaw = JSON.parse(
            readFileSync('public/models/30465/pilot/motion-candidates.json', 'utf8')
        ) as MotionCandidateSummary[];
        const dofRaw = JSON.parse(readFileSync('data/review/connection-dof.json', 'utf8'));
        const dofCatalog = connectionDofCatalogSchema.parse(dofRaw);
        const model = assemblyModelSchema.parse(graphRaw);

        const tree = buildDependencyTree(model, '30465/NAUO1/NAUO78', {
            includeRequires: true,
            includeCandidates: true,
            preserveIntactUnits: true,
            includeConnected: false,
            includeContains: false,
            candidates: candidatesRaw,
            dofCatalog
        });

        expect(tree.plan.releasedConnections.length).toBeGreaterThanOrEqual(1);
        // NAUO78 is a double-sided Friction Pin with Bore sandwiched between NAUO80 and NAUO23,
        // and cross-pinned by NAUO81: both the transverse pin and the exit-side beam must be flagged.
        expect(tree.plan.releasedPieceIds).toContain('30465/NAUO1/NAUO81');
        expect(tree.plan.releasedPieceIds).toContain('30465/NAUO1/NAUO80');

        // NAUO9 is also a sandwiched Friction Pin with Bore blocked by Stage 1 & Stage 6:
        // it must list all boundary interface connections (>= 3) and include the blocking units in removalOrder.
        const nauo9 = buildDependencyTree(model, '30465/NAUO9', {
            includeRequires: true,
            includeCandidates: true,
            preserveIntactUnits: true,
            includeConnected: false,
            includeContains: false,
            candidates: candidatesRaw,
            dofCatalog
        });
        expect(nauo9.plan.releasedConnections.length).toBeGreaterThanOrEqual(3);
        expect(nauo9.plan.removalOrder.length).toBeGreaterThanOrEqual(3);
        expect(nauo9.plan.releasedPieceIds.length).toBeGreaterThanOrEqual(2);

        const timing = computeDofTimingSummary(dofCatalog);
        expect(timing.challengeAssumption).toBe(true);
        expect(timing.totalConnections).toBe(84);
        expect(timing.totalReleaseSeconds).toBe(378);
        expect(timing.totalReassemblySeconds).toBeCloseTo(900, -1);
        expect(timing.totalRoundTripSeconds).toBeCloseTo(
            timing.totalReleaseSeconds + timing.totalReassemblySeconds,
            2
        );
    });
});
