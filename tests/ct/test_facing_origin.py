import unittest

import trimesh

from tools.ct.facing_origin import section_volume


class FacingOriginTest(unittest.TestCase):
    def test_partial_overlap_and_separated_solids_in_all_directions(self):
        a = trimesh.creation.box(extents=[4, 4, 4])
        b = a.copy().apply_translation([3, 2, 1])
        for axis in range(3):
            self.assertAlmostEqual(section_volume(a.triangles, b.triangles, axis, .1)['mm3'], 6)
        b.apply_translation([10, 0, 0])
        self.assertEqual(section_volume(a.triangles, b.triangles, 0, .1)['mm3'], 0)
