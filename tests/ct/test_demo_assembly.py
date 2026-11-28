import unittest

from tools.ct.source import load_source
from tools.ct.demo_assembly import select_demo


class DemoAssemblyTest(unittest.TestCase):
    def test_string_is_absent_and_both_turntable_halves_keep_their_ids(self):
        pieces = select_demo(load_source())
        self.assertEqual(len(pieces), 284)
        self.assertEqual({p['group'] for p in pieces}, {'MRI', 'Mid section'})
        refs = {p['id']: p['ref'] for p in pieces}
        self.assertNotIn('4000041/L111', refs)
        self.assertNotIn('4000041/L388', refs)
        self.assertEqual(refs['4000041/L112'], '88738_raw.dat')
        self.assertEqual(refs['4000041/L192'], '18939.dat')

    def test_a_reassigned_string_id_does_not_exclude_a_different_piece(self):
        source = load_source()
        next(p for p in source['pieces'] if p['id'] == '4000041/L111')['ref'] = '3010.dat'
        with self.assertRaisesRegex(ValueError, 'L111'):
            select_demo(source)
