"""Speed guard: fails in GitHub (newsroom-checks) if a change would make pages slow again.

Covers what Lighthouse flagged (FCP / LCP / Speed Index / CLS):
- images used by the site stay small
- Google Fonts never block the first paint
- the header photo and the home top-story photo are preloaded
- the menu bar and article photo keep their space (no jumping page)
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {'admin.html', 'login.html', 'reset-password.html', 'journalist.html', 'join-newsroom.html'}
IMAGE_LIMIT_KB = 200      # any image a page/CSS/JS uses
LOGO_LIMIT_KB = 60        # logos are above the fold on every page


def pages():
    out = [p for p in ROOT.glob('*.html')]
    out += [ROOT / 'news' / 'index.html'] if (ROOT / 'news' / 'index.html').exists() else []
    out += list((ROOT / 'news').glob('*/index.html'))
    return out


def used_images():
    text = ''
    for f in [*ROOT.glob('*.html'), *ROOT.glob('assets/css/*.css'), *ROOT.glob('assets/js/*.js')]:
        text += f.read_text(errors='ignore')
    names = set(re.findall(r'([A-Za-z0-9_-]+\.(?:webp|jpe?g|png))', text))
    return [p for p in ROOT.glob('assets/images/*') if p.name in names]


class SpeedGuard(unittest.TestCase):
    def test_images_are_small(self):
        too_big = []
        for img in used_images():
            kb = img.stat().st_size / 1024
            limit = LOGO_LIMIT_KB if 'logo' in img.name and img.suffix == '.webp' else IMAGE_LIMIT_KB
            if img.name == 'og-image.jpg':
                limit = 300  # WhatsApp/Facebook card, not shown on pages
            if kb > limit:
                too_big.append(f'{img.name}: {kb:.0f} KB (limit {limit} KB)')
        self.assertEqual(too_big, [], 'Run: python scripts/optimize_images.py  (or push to main: GitHub makes them light automatically)\n' + '\n'.join(too_big))

    def test_google_fonts_do_not_block_first_paint(self):
        bad = []
        for page in pages():
            html = re.sub(r'<noscript>.*?</noscript>', '', page.read_text(), flags=re.S)
            for tag in re.findall(r'<link[^>]*fonts\.googleapis\.com/css2[^>]*>', html):
                if 'rel="stylesheet"' in tag:
                    bad.append(page.name)
        self.assertEqual(bad, [], 'Load Google Fonts with rel="preload" as="style" + onload (see index.html)')

    def test_header_photo_is_preloaded_and_has_phone_size(self):
        self.assertTrue((ROOT / 'assets' / 'images' / 'punjab-panorama-900.webp').exists())
        self.assertIn('punjab-panorama-900.webp', (ROOT / 'assets/css/public-frame.css').read_text())
        missing = [p.name for p in pages() if 'pn-panorama' in p.read_text() and 'rel="preload" as="image" href="/assets/images/punjab-panorama' not in p.read_text()]
        self.assertEqual(missing, [], 'Add the header photo preload to these pages')

    def test_home_top_story_photo_is_preloaded(self):
        home = (ROOT / 'index.html').read_text()
        self.assertRegex(home, r'<!--lead-image--><link rel="preload" as="image" href="[^"]+" fetchpriority="high"><!--/lead-image-->')
        self.assertIn('write_lead_preload(rows)', (ROOT / 'scripts/build_news_pages.py').read_text())
        lead = (ROOT / 'assets/js/cloud-home.js').read_text()
        self.assertIn("img.loading='eager';img.fetchPriority='high'", lead, 'The top story photo must never be lazy-loaded')

    def test_no_page_jump(self):
        frame = (ROOT / 'assets/css/public-frame.css').read_text()
        self.assertIn('primez-site-nav:not(:defined)', frame, 'Keep the menu bar space reserved')
        reader = (ROOT / 'assets/css/article-reader.css').read_text()
        self.assertRegex(reader, r'\.reader-hero-image\{aspect-ratio:16/9', 'Keep the article photo space reserved')
        hero = re.search(r'<img fetchpriority="high"[^>]*>', (ROOT / 'index.html').read_text())
        self.assertTrue(hero and 'width=' in hero.group(0) and 'height=' in hero.group(0))

    def test_no_render_blocking_scripts(self):
        bad = []
        for page in pages():
            if page.name in PRIVATE:
                continue
            head = page.read_text().split('</head>')[0]
            for tag in re.findall(r'<script[^>]*\bsrc="[^"]+"[^>]*>', head):
                if 'defer' not in tag and 'async' not in tag:
                    bad.append(f'{page.name}: {tag[:80]}')
        self.assertEqual(bad, [], 'Scripts in <head> must use defer or async')


if __name__ == '__main__':
    unittest.main()
