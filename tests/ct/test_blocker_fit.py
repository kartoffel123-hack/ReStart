import unittest

import manifold3d as md

from tools.ct.blocker_fit import vertical_sweep


class SweptSolidTest(unittest.TestCase):
    def test_mid_stroke_shelf_blocks_even_with_clear_endpoints(self):
        tile = md.Manifold.cube((2, 1, 2))
        shelf = md.Manifold.cube((1, .2, 1)).translate((.5, 3, .5))
        self.assertTrue((tile ^ shelf).is_empty())
        self.assertTrue((tile.translate((0, 5, 0)) ^ shelf).is_empty())
        self.assertAlmostEqual((vertical_sweep(tile, 5) ^ shelf).volume(), .2)

    def test_a_post_inside_an_open_bore_stays_clear_throughout_the_lift(self):
        sleeve = md.Manifold.cube((4, 1, 4)) - md.Manifold.cube((2, 3, 2)).translate((1, -1, 1))
        post = md.Manifold.cube((1, 8, 1)).translate((1.5, -1, 1.5))
        self.assertTrue((vertical_sweep(sleeve, 5) ^ post).is_empty())
