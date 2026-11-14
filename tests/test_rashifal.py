import datetime
import importlib.util
import json
import pathlib
import tempfile
import unittest
import sys
sys.path.insert(0,str(pathlib.Path(__file__).parents[1] / "scripts"))
from rashifal_free import guidance

spec = importlib.util.spec_from_file_location('generator', pathlib.Path(__file__).parents[1] / 'scripts/generate_rashifal.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def valid():
    return {**{key: 'आज संतुलित ढंग से काम करें।' for key in g.PERIODS}, 'details': {**{key: 'शांति से आगे बढ़ें।' for key in g.TOPICS}, 'lucky_number': 1, 'lucky_color': 'नारंगी'}}


class GeneratorTests(unittest.TestCase):
    def test_free_provider_needs_no_key_and_labels_source(self):
        with tempfile.TemporaryDirectory() as folder:
            result=g.generate(datetime.date(2026,11,14), '', pathlib.Path(folder), g.guidance_wrapper, provider='curated')
            self.assertEqual(result['provider'], 'curated')
            self.assertIn('AI या ग्रह-गणना आधारित नहीं', result['generated_by'])
            self.assertIsNone(result['model'])
            self.assertEqual(len(result['signs']),12)

    def test_free_periods_stay_stable_within_calendar_period(self):
        a=guidance('सिंह',datetime.date(2026,11,10))
        b=guidance('सिंह',datetime.date(2026,11,11))
        for key in ['weekly','monthly','yearly']:
            self.assertEqual(a[key],b[key])

    def test_complete_output_matches_frontend_contract(self):
        with tempfile.TemporaryDirectory() as folder:
            g.generate(datetime.date(2026, 11, 14), 'test', pathlib.Path(folder), lambda *args: valid())
            result = json.loads((pathlib.Path(folder) / 'latest.json').read_text())
            self.assertEqual(len(result['signs']), 12)
            self.assertEqual(result['signs']['सिंह']['details']['lucky_color'], 'नारंगी')
            self.assertEqual(result['content_type'], 'entertainment')

    def test_partial_failure_preserves_existing_file(self):
        with tempfile.TemporaryDirectory() as folder:
            output = pathlib.Path(folder)
            (output / 'latest.json').write_text('previous content')
            def failing(sign, *args):
                if sign == 'सिंह':
                    raise ValueError('Invalid response')
                return valid()
            with self.assertRaises(ValueError):
                g.generate(datetime.date(2026, 11, 14), 'test', output, failing)
            self.assertEqual((output / 'latest.json').read_text(), 'previous content')
            self.assertEqual(len(list(output.iterdir())), 1)

    def test_incomplete_and_placeholder_content_rejected(self):
        for field in ['details', 'daily']:
            data = valid()
            del data[field]
            with self.assertRaises(ValueError):
                g.validate_sign(data)
        data = valid()
        data['daily'] = 'परीक्षण placeholder'
        with self.assertRaises(ValueError):
            g.validate_sign(data)

    def test_bad_lucky_values_and_oversized_text_rejected(self):
        for value in [True, 0, 10, '1']:
            data = valid()
            data['details']['lucky_number'] = value
            with self.assertRaises(ValueError):
                g.validate_sign(data)
        data = valid()
        data['weekly'] = 'क' * 2001
        with self.assertRaises(ValueError):
            g.validate_sign(data)


if __name__ == '__main__':
    unittest.main()
