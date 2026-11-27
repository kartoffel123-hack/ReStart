import unittest

from tools.ct.surfaces import Surfaces


class ScannerSurfaces(unittest.TestCase):
    def test_mirrored_subpart_keeps_its_face_winding_and_inherits_instance_color(self):
        parts = {'parent': ['1 4 20 0 0 -1 0 0 0 1 0 0 0 1 child'],
                 'child': ['3 16 0 0 0 1 0 0 0 1 0']}
        self.assertEqual(Surfaces(parts).mesh('parent'), [('4', ((20, 1, 0), (19, 0, 0), (20, 0, 0)))])

    def test_texture_coordinates_do_not_become_extra_solid_faces(self):
        parts = {'printed': ['3 15 0 0 0 1 0 0 0 1 0 .1 .2 .3 .4 .5 .6']}
        self.assertEqual(Surfaces(parts).mesh('printed'), [('15', ((0, 0, 0), (1, 0, 0), (0, 1, 0)))])
