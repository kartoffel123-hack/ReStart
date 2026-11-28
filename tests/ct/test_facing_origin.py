import unittest

import numpy as np
import trimesh

from tools.ct.facing_origin import crossing_witness, directional_vote, section_volume


class FacingOriginTest(unittest.TestCase):
    def test_partial_overlap_and_separated_solids_in_all_directions(self):
        a = trimesh.creation.box(extents=[4, 4, 4])
        b = a.copy().apply_translation([3, 2, 1])
        for axis in range(3):
            self.assertAlmostEqual(section_volume(a.triangles, b.triangles, axis, .1)['mm3'], 6)
        vote = directional_vote(a.triangles,b.triangles,.1)
        self.assertAlmostEqual(vote['unanimousMm3'],6)
        self.assertEqual(vote['tiesMm3'],0)
        b.apply_translation([10, 0, 0])
        self.assertEqual(section_volume(a.triangles, b.triangles, 0, .1)['mm3'], 0)

    def test_a_face_touch_is_not_reported_as_an_edge_passing_through_material(self):
        face = np.array([[[0.,0.,0.],[4.,0.,0.],[0.,4.,0.]]])
        edge = np.array([[[1.,1.,-1.],[1.,1.,1.],[2.,1.,1.]]])
        self.assertGreater(crossing_witness(face,edge)['marginMm'],.5)
        edge[:,:,2] += 1
        with self.assertRaisesRegex(ValueError,'No transverse'):
            crossing_witness(face,edge)
