/**
 * The hand-worked repair fixtures from plan 03 §3, each with its expected
 * observable result written beside it by hand. Three more were added during
 * Ticket 6 (sealed target, tied exits, divergent return obligations) because no
 * §3 fixture could evidence those three claims; each says why beside it.
 */
import type { AssemblyModel, Operation, Unit } from '../../src/domain/schema.js';
import { buildFixture, connection, needsPose, op, type PieceSpec } from './kit.js';

const at = (occurrenceId: string, pose: string) => ({ occurrenceId, poseId: `${occurrenceId}/${pose}` });

/* --------------------------------------------------------- exposed target */
/* T pulls straight out. Nothing healthy moves, but the page still releases,
   exchanges, reinstalls and checks. */
export function exposedTargetFixture(): AssemblyModel {
    return buildFixture({
        pieces: [{ id: 'T' }],
        connections: [connection('c-T', 'T', 'root', 'friction')],
        operations: [
            op('pull-T', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                releasesConnectionIds: ['c-T']
            }),
            op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
                phase: 'replace',
                establishesConnectionIds: ['c-T'],
                fitsReplacementOf: 'T',
                directionLabel: 'insert',
                stopLandmark: 'flush with the face'
            })
        ]
    });
}

/* ------------------------------------------------------------------ chain */
/* A must leave before B, and B before T. Expect access order A, B, T; install
   the new T, then B, then A. Disturbed count 2; the original T never re-enters. */
export function chainFixture(): AssemblyModel {
    return buildFixture({
        pieces: [{ id: 'A' }, { id: 'B' }, { id: 'T' }],
        connections: [
            connection('c-A', 'A', 'root'),
            connection('c-B', 'B', 'root'),
            connection('c-T', 'T', 'root')
        ],
        operations: [
            op('pull-A', ['A'], [at('A', 'installed')], [at('A', 'detached')], {
                releasesConnectionIds: ['c-A'],
                returnOperationId: 'seat-A'
            }),
            op('pull-B', ['B'], [at('B', 'installed')], [at('B', 'detached')], {
                requires: [needsPose('B-needs-A-out', 'A', ['A/detached'], 'A covers B')],
                releasesConnectionIds: ['c-B'],
                returnOperationId: 'seat-B'
            }),
            op('pull-T', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                requires: [needsPose('T-needs-B-out', 'B', ['B/detached'], 'B covers T')],
                releasesConnectionIds: ['c-T']
            }),
            op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
                phase: 'replace',
                establishesConnectionIds: ['c-T'],
                fitsReplacementOf: 'T'
            }),
            op('seat-B', ['B'], [at('B', 'detached')], [at('B', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('B-needs-T-seated', 'T', ['T/installed'], 'B lands on T')],
                establishesConnectionIds: ['c-B']
            }),
            op('seat-A', ['A'], [at('A', 'detached')], [at('A', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('A-needs-B-seated', 'B', ['B/installed'], 'A lands on B')],
                establishesConnectionIds: ['c-A']
            })
        ]
    });
}

/* ------------------------------------------------------- alternative ends */
/* Left exit needs A and B clear. Right exit needs only C clear plus room for
   the supplied pusher. Block the pusher corridor and left wins with {A,B}. */
export function alternativeEndsFixture(options: { pusherBlocked?: boolean } = {}): AssemblyModel {
    const blocked = options.pusherBlocked ?? false;
    const rightRequires = blocked
        ? [
              needsPose('right-needs-C-out', 'C', ['C/detached'], 'C covers the right exit'),
              needsPose(
                  'right-needs-corridor',
                  'wall',
                  ['wall/parked'],
                  'the pusher handle needs the corridor cleared',
                  'tool-access'
              )
          ]
        : [needsPose('right-needs-C-out', 'C', ['C/detached'], 'C covers the right exit')];

    const operations: Operation[] = [
        op('pull-A', ['A'], [at('A', 'installed')], [at('A', 'detached')], { returnOperationId: 'seat-A' }),
        op('pull-B', ['B'], [at('B', 'installed')], [at('B', 'detached')], { returnOperationId: 'seat-B' }),
        op('pull-C', ['C'], [at('C', 'installed')], [at('C', 'detached')], { returnOperationId: 'seat-C' }),
        op('pull-T-left', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
            requires: [
                needsPose('left-needs-A', 'A', ['A/detached'], 'A blocks the left exit'),
                needsPose('left-needs-B', 'B', ['B/detached'], 'B blocks the left exit')
            ],
            alternativeGroup: 'T-exit',
            directionLabel: 'pull left'
        }),
        op('pull-T-right', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
            requires: rightRequires,
            alternativeGroup: 'T-exit',
            toolId: 'pusher',
            direction: [0, 0, -1],
            directionLabel: 'push right'
        }),
        op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
            phase: 'replace',
            fitsReplacementOf: 'T'
        }),
        op('seat-A', ['A'], [at('A', 'detached')], [at('A', 'installed')], {
            phase: 'restore',
            isReturn: true,
            requires: [needsPose('A-needs-T', 'T', ['T/installed'], 'A lands on T')]
        }),
        op('seat-B', ['B'], [at('B', 'detached')], [at('B', 'installed')], {
            phase: 'restore',
            isReturn: true,
            requires: [needsPose('B-needs-T', 'T', ['T/installed'], 'B lands on T')]
        }),
        op('seat-C', ['C'], [at('C', 'detached')], [at('C', 'installed')], {
            phase: 'restore',
            isReturn: true,
            requires: [needsPose('C-needs-T', 'T', ['T/installed'], 'C lands on T')]
        })
    ];

    const pieces: PieceSpec[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'T' }];
    if (blocked) {
        pieces.push({ id: 'wall', extraPoses: ['parked@25'] }, { id: 'X' }, { id: 'Y' });
        operations.push(
            op('park-wall', ['wall', 'X', 'Y'], [at('wall', 'installed')], [at('wall', 'parked')], {
                requires: [
                    needsPose('park-needs-X-out', 'X', ['X/detached'], 'X carries the wall'),
                    needsPose('park-needs-Y-out', 'Y', ['Y/detached'], 'Y carries the wall')
                ],
                returnOperationId: 'unpark-wall'
            }),
            op('pull-X', ['X'], [at('X', 'installed')], [at('X', 'detached')], { returnOperationId: 'seat-X' }),
            op('pull-Y', ['Y'], [at('Y', 'installed')], [at('Y', 'detached')], { returnOperationId: 'seat-Y' }),
            op('unpark-wall', ['wall', 'X', 'Y'], [at('wall', 'parked')], [at('wall', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [
                    needsPose('unpark-needs-X', 'X', ['X/installed'], 'X must be back'),
                    needsPose('unpark-needs-Y', 'Y', ['Y/installed'], 'Y must be back'),
                    needsPose('unpark-needs-T', 'T', ['T/installed'], 'wall lands near T')
                ]
            }),
            op('seat-X', ['X'], [at('X', 'detached')], [at('X', 'installed')], {
                phase: 'restore',
                isReturn: true
            }),
            op('seat-Y', ['Y'], [at('Y', 'detached')], [at('Y', 'installed')], {
                phase: 'restore',
                isReturn: true
            })
        );
    }

    return buildFixture({
        pieces,
        operations,
        alternativeGroups: [
            {
                id: 'T-exit',
                satisfies: 'release T',
                operationIds: ['pull-T-left', 'pull-T-right'],
                note: 'two admissible extraction directions'
            }
        ]
    });
}

/* ----------------------------------------------------- partial withdrawal */
/* The axle retracts 4 mm to clear the gear while still supported. Fully
   extracting it would need the beam out too, so the partial stroke wins. */
export function partialAxleFixture(): AssemblyModel {
    return buildFixture({
        pieces: [{ id: 'axle', extraPoses: ['retracted-4mm@4'] }, { id: 'gear' }, { id: 'beam' }],
        connections: [
            connection('c-axle-beam', 'axle', 'beam', 'axle-bore'),
            connection('c-gear-axle', 'gear', 'axle', 'friction')
        ],
        operations: [
            op('retract-axle', ['axle'], [at('axle', 'installed')], [at('axle', 'retracted-4mm')], {
                strokeMm: 4,
                stopLandmark: 'the second beam hole lines up',
                directionLabel: 'slide out 4 mm',
                returnOperationId: 'reseat-axle',
                releasesConnectionIds: ['c-gear-axle']
            }),
            op('reseat-axle', ['axle'], [at('axle', 'retracted-4mm')], [at('axle', 'installed')], {
                phase: 'restore',
                isReturn: true,
                strokeMm: 4,
                directionLabel: 'push back home',
                stopLandmark: 'original depth',
                establishesConnectionIds: ['c-axle-beam']
            }),
            op('extract-axle', ['axle'], [at('axle', 'installed')], [at('axle', 'detached')], {
                requires: [needsPose('extract-needs-beam', 'beam', ['beam/detached'], 'the beam traps the axle')],
                releasesConnectionIds: ['c-axle-beam', 'c-gear-axle'],
                returnOperationId: 'insert-axle'
            }),
            op('insert-axle', ['axle'], [at('axle', 'detached')], [at('axle', 'installed')], {
                phase: 'restore',
                isReturn: true,
                establishesConnectionIds: ['c-axle-beam']
            }),
            op('pull-beam', ['beam'], [at('beam', 'installed')], [at('beam', 'detached')], {
                returnOperationId: 'seat-beam'
            }),
            op('seat-beam', ['beam'], [at('beam', 'detached')], [at('beam', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('beam-needs-axle', 'axle', ['axle/installed'], 'the beam rides on the axle')]
            }),
            op('pull-gear', ['gear'], [at('gear', 'installed')], [at('gear', 'detached')], {
                requires: [
                    needsPose('gear-needs-axle-off', 'axle', ['axle/retracted-4mm'], 'the axle carries the gear')
                ],
                releasesConnectionIds: ['c-gear-axle']
            }),
            op('fit-spare-gear', ['gear'], [at('gear', 'detached')], [at('gear', 'installed')], {
                phase: 'replace',
                establishesConnectionIds: ['c-gear-axle'],
                fitsReplacementOf: 'gear',
                requires: [
                    needsPose(
                        'spare-needs-axle-off',
                        'axle',
                        ['axle/retracted-4mm'],
                        'the spare gear only slips on while the axle is held off its seat',
                        'support'
                    )
                ]
            })
        ]
    });
}

/* ----------------------------------------------------------- rigid module */
/* One option parks a three-piece intact module; another removes two pins.
   Two pins beat one module motion even when the module motion is faster. */
export function rigidModuleFixture(options: { disablePins?: boolean } = {}): AssemblyModel {
    const disablePins = options.disablePins ?? false;
    const module: Unit = {
        id: 'unit-clamp',
        name: 'clamp module',
        memberIds: ['m1', 'm2', 'm3'],
        internalConnectionIds: ['c-m1-m2', 'c-m2-m3'],
        evidence: { tier: 'reviewed', source: 'fixture author' }
    };
    const operations: Operation[] = [
        op(
            'park-module',
            ['m1', 'm2', 'm3'],
            [at('m1', 'installed'), at('m2', 'installed'), at('m3', 'installed')],
            [at('m1', 'parked'), at('m2', 'parked'), at('m3', 'parked')],
            {
            unitId: 'unit-clamp',
            requires: [needsPose('park-needs-m2', 'm2', ['m2/installed'], 'the module travels rigidly')],
            releasesConnectionIds: ['c-module-root'],
            returnOperationId: 'restore-module',
            strokeMm: 30,
            stopLandmark: 'bench frame',
            estimatedSeconds: { seconds: 4, rowId: 'ST-mittel', basis: 'fixture', coverage: 'timed' }
            }
        ),
        op(
            'restore-module',
            ['m1', 'm2', 'm3'],
            [at('m1', 'parked'), at('m2', 'parked'), at('m3', 'parked')],
            [at('m1', 'installed'), at('m2', 'installed'), at('m3', 'installed')],
            {
            unitId: 'unit-clamp',
            phase: 'restore',
            isReturn: true,
            requires: [needsPose('restore-needs-T', 'T', ['T/installed'], 'the module lands on T')],
            establishesConnectionIds: ['c-module-root']
            }
        ),
        op('turn-assembly', ['m1', 'm2', 'm3', 'P1', 'P2', 'T'], [at('T', 'installed')], [at('T', 'installed')], {
            wholeAssembly: true,
            label: 'turn the whole assembly to see the joint',
            directionLabel: 'rotate in your hands',
            strokeMm: 0
        }),
        op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
            phase: 'replace',
            fitsReplacementOf: 'T'
        })
    ];
    if (!disablePins) {
        operations.push(
            op('pull-P1', ['P1'], [at('P1', 'installed')], [at('P1', 'detached')], {
                returnOperationId: 'seat-P1',
                estimatedSeconds: { seconds: 9, rowId: 'ST-mittel', basis: 'fixture', coverage: 'timed' }
            }),
            op('pull-P2', ['P2'], [at('P2', 'installed')], [at('P2', 'detached')], {
                returnOperationId: 'seat-P2',
                estimatedSeconds: { seconds: 9, rowId: 'ST-mittel', basis: 'fixture', coverage: 'timed' }
            }),
            op('pull-T-via-pins', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                requires: [
                    needsPose('pins-clear-1', 'P1', ['P1/detached'], 'P1 traps T'),
                    needsPose('pins-clear-2', 'P2', ['P2/detached'], 'P2 traps T')
                ],
                alternativeGroup: 'T-access'
            }),
            op('seat-P1', ['P1'], [at('P1', 'detached')], [at('P1', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('seat-P1-needs-T', 'T', ['T/installed'], 'P1 lands on T')]
            }),
            op('seat-P2', ['P2'], [at('P2', 'detached')], [at('P2', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('seat-P2-needs-T', 'T', ['T/installed'], 'P2 lands on T')]
            })
        );
    }
    operations.push(
        op('pull-T-via-module', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
            requires: [needsPose('module-parked-clears', 'm1', ['m1/parked'], 'the clamp module holds T')],
            alternativeGroup: 'T-access'
        })
    );

    return buildFixture({
        pieces: [
            { id: 'm1', extraPoses: ['parked@30'] },
            { id: 'm2', extraPoses: ['parked@30'] },
            { id: 'm3', extraPoses: ['parked@30'] },
            { id: 'P1' },
            { id: 'P2' },
            { id: 'T' }
        ],
        units: [module],
        connections: [
            connection('c-m1-m2', 'm1', 'm2'),
            connection('c-m2-m3', 'm2', 'm3'),
            connection('c-module-root', 'm1', 'root')
        ],
        operations,
        alternativeGroups: [
            {
                id: 'T-access',
                satisfies: 'release T',
                operationIds: disablePins ? ['pull-T-via-module'] : ['pull-T-via-pins', 'pull-T-via-module']
            }
        ]
    });
}

/* ---------------------------------------------------------- sealed target */
/* The panel that seals T's only exit has a detached pose the model declares but
   no operation in the catalog can ever produce, so the target has no feasible
   route at all. Expect "no feasible route" naming the panel requirement.
   Added with Ticket 6: the earlier candidate for this status (rigid module with
   the pins disabled) turned out to be feasible through the module option, so it
   could not evidence an infeasible search. */
export function sealedTargetFixture(): AssemblyModel {
    return buildFixture({
        pieces: [{ id: 'panel' }, { id: 'T' }],
        connections: [connection('c-T', 'T', 'root', 'friction'), connection('c-panel', 'panel', 'root')],
        operations: [
            op('pull-T', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                requires: [
                    needsPose(
                        'T-needs-panel-off',
                        'panel',
                        ['panel/detached'],
                        'the panel seals the only exit for T'
                    )
                ],
                releasesConnectionIds: ['c-T']
            }),
            op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
                phase: 'replace',
                establishesConnectionIds: ['c-T'],
                fitsReplacementOf: 'T'
            })
        ]
    });
}

/* ------------------------------------------------------------ tied exits */
/* T has two admissible exits and each is covered by two healthy pieces, so the
   two complete jobs disturb the same number of pieces and neither is better.
   Expect two exhaustive minimum routes and one stable choice. Added with
   Ticket 6: alternativeEndsFixture makes the right exit cheaper (one piece
   against two), so it exercises alternatives but never a tie. */
export function tiedExitsFixture(): AssemblyModel {
    const coversLeft = [
        needsPose('left-needs-A', 'A', ['A/detached'], 'A blocks the left exit'),
        needsPose('left-needs-B', 'B', ['B/detached'], 'B blocks the left exit')
    ];
    const coversRight = [
        needsPose('right-needs-C', 'C', ['C/detached'], 'C blocks the right exit'),
        needsPose('right-needs-D', 'D', ['D/detached'], 'D blocks the right exit')
    ];
    return buildFixture({
        pieces: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'T' }],
        connections: [connection('c-T', 'T', 'root', 'friction')],
        operations: [
            op('pull-A', ['A'], [at('A', 'installed')], [at('A', 'detached')], { returnOperationId: 'seat-A' }),
            op('pull-B', ['B'], [at('B', 'installed')], [at('B', 'detached')], { returnOperationId: 'seat-B' }),
            op('pull-C', ['C'], [at('C', 'installed')], [at('C', 'detached')], { returnOperationId: 'seat-C' }),
            op('pull-D', ['D'], [at('D', 'installed')], [at('D', 'detached')], { returnOperationId: 'seat-D' }),
            op('pull-T-left', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                requires: coversLeft,
                alternativeGroup: 'T-exit',
                releasesConnectionIds: ['c-T'],
                directionLabel: 'pull left'
            }),
            op('pull-T-right', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                requires: coversRight,
                alternativeGroup: 'T-exit',
                directionLabel: 'push right'
            }),
            op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
                phase: 'replace',
                establishesConnectionIds: ['c-T'],
                fitsReplacementOf: 'T'
            }),
            op('seat-A', ['A'], [at('A', 'detached')], [at('A', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('A-needs-T', 'T', ['T/installed'], 'A lands on T')]
            }),
            op('seat-B', ['B'], [at('B', 'detached')], [at('B', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('B-needs-T', 'T', ['T/installed'], 'B lands on T')]
            }),
            op('seat-C', ['C'], [at('C', 'detached')], [at('C', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('C-needs-T', 'T', ['T/installed'], 'C lands on T')]
            }),
            op('seat-D', ['D'], [at('D', 'detached')], [at('D', 'installed')], {
                phase: 'restore',
                isReturn: true,
                requires: [needsPose('D-needs-T', 'T', ['T/installed'], 'D lands on T')]
            })
        ],
        alternativeGroups: [
            {
                id: 'T-exit',
                satisfies: 'release T',
                operationIds: ['pull-T-left', 'pull-T-right'],
                note: 'two admissible exits, each covered by two pieces'
            }
        ]
    });
}

/* --------------------------------------------------- divergent obligations */
/* One retainer, two admissible ways to clear it: swing it aside, or lift it off
   and press a new clip on. Both leave the same recorded pose, clip/clear, and
   disturb the same one piece, but they owe different returns — swing-back
   versus clip-on. The pose model is deliberately coarse here: if the search
   keyed a state on outward pose alone it would treat the two histories as the
   same state and could return a job that never re-fits the retainer. Expect the
   oracle to report a divergent obligation and the solver to prove the minimum
   anyway, with every restore step a registered return. (plan 03 §V03) */
export function clearClipFixture(): AssemblyModel {
    return buildFixture({
        pieces: [{ id: 'clip', extraPoses: ['clear@12'] }, { id: 'T' }],
        connections: [connection('c-T', 'T', 'root', 'friction'), connection('c-clip', 'clip', 'root')],
        operations: [
            op('swing-clip', ['clip'], [at('clip', 'installed')], [at('clip', 'clear')], {
                strokeMm: 12,
                directionLabel: 'swing the retainer aside',
                stopLandmark: 'the tab clears the head',
                releasesConnectionIds: ['c-clip'],
                returnOperationId: 'swing-back'
            }),
            op('swing-back', ['clip'], [at('clip', 'clear')], [at('clip', 'installed')], {
                phase: 'restore',
                isReturn: true,
                establishesConnectionIds: ['c-clip'],
                directionLabel: 'swing it back'
            }),
            op('lift-clip', ['clip'], [at('clip', 'installed')], [at('clip', 'clear')], {
                strokeMm: 12,
                directionLabel: 'lift the retainer off',
                stopLandmark: 'clear of the head',
                releasesConnectionIds: ['c-clip'],
                returnOperationId: 'clip-on'
            }),
            op('clip-on', ['clip'], [at('clip', 'clear')], [at('clip', 'installed')], {
                phase: 'restore',
                isReturn: true,
                establishesConnectionIds: ['c-clip'],
                requires: [needsPose('clip-needs-T', 'T', ['T/installed'], 'the clip presses over the installed head')],
                directionLabel: 'press a new clip on'
            }),
            op('pull-T', ['T'], [at('T', 'installed')], [at('T', 'detached')], {
                requires: [needsPose('T-needs-clip-clear', 'clip', ['clip/clear'], 'the retainer holds T down')],
                releasesConnectionIds: ['c-T']
            }),
            op('fit-spare-T', ['T'], [at('T', 'detached')], [at('T', 'installed')], {
                phase: 'replace',
                establishesConnectionIds: ['c-T'],
                fitsReplacementOf: 'T'
            })
        ]
    });
}
