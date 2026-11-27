import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

from build_editorial_blogs import CATEGORIES, SITE, build, sanitize


def post(slug='test-post', **overrides):
    row = dict(slug=slug, title='A test article', summary='A public summary', category='General',
               language='pa', author='Editorial Desk', cover_url='https://example.com/photo.webp',
               cover_alt='Example photo', cover_caption='Photo caption', body_html='<h2>Heading</h2><p>Example text.</p>',
               seo_title='Search title', seo_description='Search description', canonical_url='',
               social_image='', sources=['https://example.com/source'], published_at='2026-11-26T12:00:00Z',
               updated_at='2026-11-26T12:00:00Z', status='published')
    return row | overrides


class EditorialBlogsTests(unittest.TestCase):
    def test_sanitizer_removes_active_content(self):
        output = sanitize('<h2>Safe</h2><script>alert(1)</script><img src="javascript:x" onerror="x">'
                          '<a href="//example.com">No relative URL</a><svg onload="x"></svg>'
                          '<figure><img src="https://example.com/x.png" alt="Photo"><figcaption>Caption</figcaption></figure>')
        for value in ('<script', 'alert(1)', 'onerror', 'javascript:', '<svg', 'href="//'):
            self.assertNotIn(value, output)
        self.assertIn('<h2>Safe</h2>', output)
        self.assertIn('alt="Photo"', output)
        self.assertIn('loading="lazy"', output)
        self.assertIn('<figcaption>Caption</figcaption>', output)

    def test_publication_and_unpublication(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'health-beauty.html').write_bytes((ROOT / 'health-beauty.html').read_bytes())
            rows = [post('member-' + str(index), category=category, title=category) for index, category in enumerate(CATEGORIES)]
            rows += [post('retained', title='Related story'), post('private', status='draft', title='Secret draft')]
            build(rows, root)
            page = root / 'blogs/member-0/index.html'
            content = page.read_text()
            self.assertIn('html lang="pa"', content)
            self.assertIn('type="application/ld+json"', content)
            self.assertIn('"@type": "BlogPosting"', content)
            self.assertIn('name="twitter:card"', content)
            self.assertIn('property="og:image"', content)
            self.assertIn('content="Search title"', content)
            self.assertIn('href="https://example.com/source"', content)
            self.assertIn('href="https://primeznews.com/blogs/retained/"', content)
            self.assertNotIn('adsbygoogle.js', content)
            self.assertNotIn('Secret draft', (root / 'blogs/index.html').read_text())
            self.assertFalse((root / 'blogs/private').exists())
            xml = ET.parse(root / 'blog-sitemap.xml')
            self.assertEqual(len(xml.findall('.//{*}loc')), 9)
            self.assertTrue(all((root / f'blogs/member-{i}/index.html').exists() for i in range(7)))
            rows[0]['status'] = 'draft'
            build(rows, root)
            self.assertFalse(page.exists())
            self.assertNotIn(f'{SITE}/blogs/member-0/', (root / 'blog-sitemap.xml').read_text())

    def test_archive_uses_original_public_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'health-beauty.html').write_bytes((ROOT / 'health-beauty.html').read_bytes())
            (root / 'data').mkdir()
            (root / 'data/health-blog.json').write_bytes((ROOT / 'data/health-blog.json').read_bytes())
            build([post()], root)
            listing = (root / 'blogs/index.html').read_text()
            self.assertIn('href="/en/health-blog/how-to-compare-gym-memberships/"', listing)
            self.assertIn('A gym membership that fits your real week', listing)
            self.assertIn(f'href="{SITE}/blogs/test-post/"', listing)
            self.assertFalse((root / 'blogs/how-to-compare-gym-memberships').exists())

    def test_rejects_invalid_slug(self):
        with self.assertRaisesRegex(ValueError, 'slug'):
            build([post('../draft')], Path('/unused'))


if __name__ == '__main__':
    unittest.main()
