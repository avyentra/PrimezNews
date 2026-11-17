"""Health & Beauty blog: data is complete and generated pages are correct."""
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_health_blog as blog  # noqa: E402


class HealthBlog(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'data' / 'health-blog.json').read_text())

    def test_every_post_has_three_languages(self):
        def walk(value, where):
            if isinstance(value, dict) and set(value) >= {'pa', 'hi', 'en'}:
                for k in ('pa', 'hi', 'en'):
                    self.assertTrue(str(value[k]).strip(), f'{where}: missing {k}')
            elif isinstance(value, dict):
                for k, v in value.items(): walk(v, f'{where}.{k}')
            elif isinstance(value, list):
                for i, v in enumerate(value): walk(v, f'{where}[{i}]')
        for p in self.data['posts']:
            for key in ('slug', 'image', 'date', 'tag', 'minutes', 'title', 'excerpt', 'points', 'body', 'author'):
                self.assertIn(key, p, f'{p.get("slug")}: missing {key}')
            walk(p, p['slug'])

    def test_build_writes_pages_and_share_photos(self):
        slugs = blog.build()
        self.assertTrue((ROOT / 'health-blog' / 'index.html').exists())
        for slug in slugs:
            page = (ROOT / 'health-blog' / slug / 'index.html').read_text()
            self.assertIn(f'<link rel="canonical" href="https://primeznews.com/health-blog/{slug}/"', page)
            self.assertIn(f'content="https://primeznews.com/media/share/blog-{slug}.jpg"', page)
            self.assertIn('<base href="../../">', page)
            self.assertNotRegex(page, r'href="[^"]*\.html[\"#?]', 'blog links must not show .html')
            share = ROOT / 'media' / 'share' / f'blog-{slug}.jpg'
            self.assertLessEqual(share.stat().st_size, 280 * 1024)
        self.assertIn('<!--blog-latest--><section', (ROOT / 'health-beauty.html').read_text())

    def test_bad_slug_is_rejected(self):
        with self.assertRaises(ValueError):
            blog.valid_slug('Bad Slug.html')


if __name__ == '__main__':
    unittest.main()
