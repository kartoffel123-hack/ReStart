import tempfile
from pathlib import Path
import unittest

import trimesh

from tools.ct.fidelity import uncovered


class FlexibleString(unittest.TestCase):
    def test_two_attached_end_studs_do_not_prove_the_string_survived(self):
        left = trimesh.creation.box(extents=[2,2,2])
        right = left.copy().apply_translation([20,0,0])
        string = trimesh.creation.box(extents=[18,1,1]).apply_translation([10,0,0])
        ends = left + right
        complete = ends + string
        self.assertTrue((ends.bounds == complete.bounds).all())
        with tempfile.TemporaryDirectory() as temp:
            source, candidate = Path(temp)/'source.stl', Path(temp)/'candidate.stl'
            complete.export(source)
            ends.export(candidate)
            self.assertGreater(uncovered(source,candidate)['maxUncoveredMm'], 5)
            self.assertEqual(uncovered(source,source)['outsideSamples'], 0)
