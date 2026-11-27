import unittest

from tools.ct.source import Definitions, LIBRARY, load_source


class ScannerInventory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = load_source()

    def test_selects_one_slope_and_keeps_its_neighbour_installed(self):
        pieces = self.source['pieces']
        self.assertEqual(len(pieces), 566)
        self.assertEqual(len({p['id'] for p in pieces}), 566)
        by_line = {p['line']: p for p in pieces}
        self.assertEqual(by_line[250]['ref'], '50950.dat')
        self.assertEqual(by_line[254]['ref'], '50950.dat')
        self.assertAlmostEqual((by_line[250]['origin'][0] - by_line[254]['origin'][0]) * .4, 8, places=2)
        self.assertNotEqual(by_line[250]['id'], by_line[254]['id'])

    def test_pose_variants_rope_and_custom_turntable_are_individual_articles(self):
        refs = {p['ref'] for p in self.source['pieces']}
        self.assertIn('76384.dat copy 10', refs)
        self.assertNotIn('__flexiblesubmodel_rope copy 10', refs)
        definitions = Definitions(LIBRARY)
        self.assertTrue(any(line.endswith('__flexiblesubmodel_rope copy 10')
                            for line in definitions.get('76384.dat copy 10')))
        self.assertTrue(any(line.startswith('3 ') for line in definitions.get('__flexiblesubmodel_rope copy 10')))
        self.assertIn('88738_raw.dat', refs)
        self.assertEqual(self.source['xmlPartCounts'], {1: 550, 2: 2, 3: 5, 5: 6})

    def test_the_two_studio_1104_records_are_different_bricks(self):
        pieces = [p for p in self.source['pieces'] if p['studioId'] == '1104']
        self.assertEqual({p['ref'] for p in pieces}, {'3062b.dat', '3022.dat'})
        self.assertEqual(len({p['id'] for p in pieces}), 2)
