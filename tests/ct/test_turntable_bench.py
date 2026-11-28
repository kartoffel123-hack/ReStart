import unittest

import numpy as np

from tools.ct.turntable_bench import angular_margin, twisted


class BenchRotationTest(unittest.TestCase):
    def test_rotate_about_the_bearing_centre_and_translate_along_its_axis(self):
        poses = twisted(np.array([[10., 4., 7.]]), np.array([3., 7.]), 2., np.array([0., 90., 360.]))
        np.testing.assert_allclose(poses[:, 0], [[12.,4.,7.],[12.,3.,8.],[12.,4.,7.]])

    def test_sample_contacts_alone_do_not_close_a_gap_between_angles(self):
        # Two angular samples, two different surface points. The shallow
        # contacts on the large radius do not guarantee continuous contact.
        depths = np.array([[.2, -.1], [.2, -.1]])
        self.assertLess(angular_margin(depths, np.array([30., 5.]), 1.).min(), 0)
        depths[0, 0] = .4
        depths[1, 1] = .2
        self.assertGreater(angular_margin(depths, np.array([30., 5.]), 1.).min(), .1)
