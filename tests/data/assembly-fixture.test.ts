/**
 * Ticket 1 · V01 · hand-worked assembly fixture (plan 03 §4 V01 first bullet).
 *
 * The real snapshot cannot test pose composition: every one of its 81 child placements is
 * the identity, so `parent × inverse(child)` and `parent × child` produce identical numbers
 * there. This fixture makes the child placement non-identity and states the composed
 * transforms by hand, so an implementation that forgets the inverse fails here.
 *
 * Structure, hand-authored rather than generated, so every expected number is reviewable:
 *
 *   ROOT ─ NAUOA ─> SUB ─ NAUOC ─> LEAF
 *        └ NAUOB ─> SUB
 *
 *   SUB context placement      pc = [10, 0, 0] for LEAF, identity for SUB
 *   NAUOA in ROOT              pp = [0, 0, 0], axes identity
 *   NAUOB in ROOT              pp = [0, 5, 0], Z = [0,0,1], X = [0,1,0]  (so Y = [-1,0,0])
 *   NAUOC in SUB               pp = [0, 0, 20], identity
 *   LEAF vertex points         [0,0,0], [24,0,0], [0,8,0] → local centre [12, 4, 0]
 *
   Expected, computed by hand:
 *   NAUOC child→parent = pp × pc⁻¹ = translation [0,0,20] − [10,0,0] = [−10, 0, 20]
 *   branch A world      = [−10, 0, 20], bounds centre [−10,0,20] + [12,4,0] = [2, 4, 20]
 *   branch B world      = [0,5,0] + Rz90·[−10,0,20] = [0,5,0] + [0,−10,20] = [0, −5, 20]
 *   branch B centre     = [0,−5,20] + Rz90·[12,4,0] = [0,−5,20] + [−4,12,0] = [−4, 7, 20]
 */
import { describe, expect, it } from 'vitest';
import { parseStepEntities } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, MODEL_ID } from '../../tools/lib/step-tree.js';

const FIXTURE = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('fixture'),'1');
FILE_NAME('fixture.step','2026-01-01',(''),(''),'','','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;
DATA;
/* definitions */
#1 = PRODUCT ( 'ROOT', 'ROOT', '', (#90) ) ;
#2 = PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE ( 'ANY', '', #1, .NOT_KNOWN. ) ;
#3 = PRODUCT_DEFINITION ( 'ROOT', '', #2, #90 ) ;
#4 = PRODUCT ( 'SUB', 'SUB', '', (#90) ) ;
#5 = PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE ( 'ANY', '', #4, .NOT_KNOWN. ) ;
#6 = PRODUCT_DEFINITION ( 'SUB', '', #5, #90 ) ;
#7 = PRODUCT ( 'LEAF - 30465', 'LEAF - 30465', '', (#90) ) ;
#8 = PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE ( 'ANY', '', #7, .NOT_KNOWN. ) ;
#9 = PRODUCT_DEFINITION ( 'LEAF', '', #8, #90 ) ;
/* usage: name, , , parent definition, child definition */
#10 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( 'NAUOA', ' ', ' ', #3, #6, $ ) ;
#11 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( 'NAUOB', ' ', ' ', #3, #6, $ ) ;
#12 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( 'NAUOC', ' ', ' ', #6, #9, $ ) ;
#13 = PRODUCT_DEFINITION_SHAPE ( 'NONE', 'NONE', #10 ) ;
#14 = PRODUCT_DEFINITION_SHAPE ( 'NONE', 'NONE', #11 ) ;
#15 = PRODUCT_DEFINITION_SHAPE ( 'NONE', 'NONE', #12 ) ;
#16 = CONTEXT_DEPENDENT_SHAPE_REPRESENTATION ( #20, #13 ) ;
#17 = CONTEXT_DEPENDENT_SHAPE_REPRESENTATION ( #21, #14 ) ;
#18 = CONTEXT_DEPENDENT_SHAPE_REPRESENTATION ( #22, #15 ) ;
#20 = ( REPRESENTATION_RELATIONSHIP ( 'NONE', 'NONE', #30, #31 ) REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION ( #40 ) SHAPE_REPRESENTATION_RELATIONSHIP ( ) ) ;
#21 = ( REPRESENTATION_RELATIONSHIP ( 'NONE', 'NONE', #30, #31 ) REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION ( #41 ) SHAPE_REPRESENTATION_RELATIONSHIP ( ) ) ;
#22 = ( REPRESENTATION_RELATIONSHIP ( 'NONE', 'NONE', #31, #33 ) REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION ( #42 ) SHAPE_REPRESENTATION_RELATIONSHIP ( ) ) ;
#40 = ITEM_DEFINED_TRANSFORMATION ( 'NONE', 'NONE', #50, #51 ) ;
#41 = ITEM_DEFINED_TRANSFORMATION ( 'NONE', 'NONE', #52, #51 ) ;
#42 = ITEM_DEFINED_TRANSFORMATION ( 'NONE', 'NONE', #53, #54 ) ;
/* placements */
#50 = AXIS2_PLACEMENT_3D ( 'A', #100, #110, #111 ) ;
#51 = AXIS2_PLACEMENT_3D ( 'C', #103, #110, #111 ) ;
#52 = AXIS2_PLACEMENT_3D ( 'B', #104, #110, #112 ) ;
#53 = AXIS2_PLACEMENT_3D ( 'D', #106, #110, #111 ) ;
#54 = AXIS2_PLACEMENT_3D ( 'E', #107, #110, #111 ) ;
#100 = CARTESIAN_POINT ( 'NONE', ( 0.0, 0.0, 0.0 ) ) ;
#103 = CARTESIAN_POINT ( 'NONE', ( 0.0, 0.0, 0.0 ) ) ;
#104 = CARTESIAN_POINT ( 'NONE', ( 0.0, 5.0, 0.0 ) ) ;
#106 = CARTESIAN_POINT ( 'NONE', ( 0.0, 0.0, 20.0 ) ) ;
#107 = CARTESIAN_POINT ( 'NONE', ( 10.0, 0.0, 0.0 ) ) ;
#110 = DIRECTION ( 'NONE', ( 0.0, 0.0, 1.0 ) ) ;
#111 = DIRECTION ( 'NONE', ( 1.0, 0.0, 0.0 ) ) ;
#112 = DIRECTION ( 'NONE', ( 0.0, 1.0, 0.0 ) ) ;
/* representations */
#30 = SHAPE_REPRESENTATION ( 'ROOT', ( #50, #52 ), #90 ) ;
#31 = SHAPE_REPRESENTATION ( 'SUB', ( #51, #53 ), #90 ) ;
#33 = ADVANCED_BREP_SHAPE_REPRESENTATION ( '', ( #60, #54 ), #90 ) ;
#19 = PRODUCT_DEFINITION_SHAPE ( 'NONE', 'NONE', #9 ) ;
#190 = SHAPE_DEFINITION_REPRESENTATION ( #19, #33 ) ;
#90 = MECHANICAL_CONTEXT ( 'NONE', 'fixture', 'mechanical' ) ;
/* one triangular solid so the leaf has topological vertices */
#60 = MANIFOLD_SOLID_BREP ( 'tri', #61 ) ;
#61 = CLOSED_SHELL ( 'shell', ( #62 ) ) ;
#62 = ADVANCED_FACE ( 'face', ( #63 ), #70, .T. ) ;
#63 = FACE_OUTER_BOUND ( 'bound', #64, .T. ) ;
#64 = BOUNDED_SURFACE ( 'bounded', #70, ( #65 ) ) ;
#65 = EDGE_LOOP ( 'loop', ( #66, #67, #68 ) ) ;
#66 = ORIENTED_EDGE ( 'o1', *, *, #80, .T. ) ;
#67 = ORIENTED_EDGE ( 'o2', *, *, #81, .T. ) ;
#68 = ORIENTED_EDGE ( 'o3', *, *, #82, .T. ) ;
#80 = EDGE_CURVE ( 'e1', #200, #201, #210, .T. ) ;
#81 = EDGE_CURVE ( 'e2', #201, #202, #210, .T. ) ;
#82 = EDGE_CURVE ( 'e3', #202, #200, #210, .T. ) ;
#200 = VERTEX_POINT ( 'v1', #300 ) ;
#201 = VERTEX_POINT ( 'v2', #301 ) ;
#202 = VERTEX_POINT ( 'v3', #302 ) ;
#300 = CARTESIAN_POINT ( 'NONE', ( 0.0, 0.0, 0.0 ) ) ;
#301 = CARTESIAN_POINT ( 'NONE', ( 24.0, 0.0, 0.0 ) ) ;
#302 = CARTESIAN_POINT ( 'NONE', ( 0.0, 8.0, 0.0 ) ) ;
#70 = PLANE ( 'plane', #310 ) ;
#310 = AXIS2_PLACEMENT_3D ( 'origin', #100, #110, #111 ) ;
#210 = LINE ( 'line', #100, #320 ) ;
#320 = VECTOR ( 'vec', #111, 1.0 ) ;
ENDSEC;
ENDSEC;
ISO-10303-21;
`;

const round = (values: readonly number[]): number[] => values.map((value) => Number(value.toFixed(6)));

describe('two-level fixture with a reused subassembly', () => {
    const tree = buildAssemblyTree(parseStepEntities(FIXTURE));

    it('parses the fixture without a diagnostic', () => {
        expect(tree.diagnostics).toEqual([]);
        expect(tree.usageCount).toBe(3);
        expect(tree.assemblyDefinitionCount).toBe(2);
        expect(tree.leafDefinitionCount).toBe(1);
    });

    it('gives the reused leaf two full paths and two composed transforms', () => {
        expect(tree.occurrences.map((occurrence) => occurrence.id)).toEqual([
            `${MODEL_ID}/NAUOA/NAUOC`,
            `${MODEL_ID}/NAUOB/NAUOC`
        ]);
        const [branchA, branchB] = tree.occurrences;
        expect(branchA?.definitionId).toBe(branchB?.definitionId);

        expect(round(branchA?.worldPlacement.translation ?? [])).toEqual([-10, 0, 20]);
        expect(round(branchB?.worldPlacement.translation ?? [])).toEqual([0, -5, 20]);
    });

    it('composes the child placement inverse, not the child placement itself', () => {
        // Without the inverse branch A would land at [22, 4, 20] instead of [2, 4, 20].
        const [branchA, branchB] = tree.occurrences;
        expect(round(branchA?.boundsCentre ?? [])).toEqual([2, 4, 20]);
        expect(round(branchB?.boundsCentre ?? [])).toEqual([-4, 7, 20]);
    });

    it('reports the subassembly as a node, never as a piece', () => {
        expect(tree.modules.map((node) => node.id)).toEqual([`${MODEL_ID}/NAUOA`, `${MODEL_ID}/NAUOB`]);
        expect(tree.occurrences.every((occurrence) => occurrence.name === 'LEAF - 30465')).toBe(true);
    });

    it('keeps every frame right-handed', () => {
        for (const occurrence of tree.occurrences) {
            expect(occurrence.handedness, occurrence.id).toBe(1);
            const [x, y, z] = [occurrence.worldPlacement.xAxis, occurrence.worldPlacement.yAxis, occurrence.worldPlacement.zAxis];
            const crossY = [x[2] * z[0] - x[0] * z[2], x[0] * z[2] - x[2] * z[0]];
            expect(crossY.length).toBe(2);
        }
    });
});

describe('definition cycles', () => {
    it('reports a cyclic definition reference as a path diagnostic instead of recursing', () => {
        const cyclic = FIXTURE.replace(
            '#12 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( \'NAUOC\', \' \', \' \', #6, #9, $ ) ;',
            '#12 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( \'NAUOC\', \' \', \' \', #6, #6, $ ) ;'
        );
        const tree = buildAssemblyTree(parseStepEntities(cyclic));
        expect(tree.diagnostics.map((diagnostic) => diagnostic.code)).toContain('cyclic-definition-reference');
        expect(tree.occurrences).toEqual([]);
    });
});

describe('source revision', () => {
    it('reports an unparsable record instead of dropping it', () => {
        const broken = FIXTURE.replace(
            '#10 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( \'NAUOA\', \' \', \' \', #3, #6, $ ) ;',
            '#10 = NEXT_ASSEMBLY_USAGE_OCCURRENCE ( \'NAUOA\', \' \', \' \', #3, #6 ) '
        );
        const index = parseStepEntities(broken);
        expect(index.diagnostics.map((diagnostic) => diagnostic.code)).toContain('unparsable-record');
    });
});
