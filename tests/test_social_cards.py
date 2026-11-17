import json
import sys
import tempfile
import unittest
from pathlib import Path
from test_seo import Head, ROOT

sys.path.insert(0, str(ROOT / 'scripts'))
from build_news_pages import BASE, page
from social_preview import SIZE, preview
from PIL import Image


class SocialCards(unittest.TestCase):
    def test_new_story_raw_html_and_image_without_javascript(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'assets' / 'images').mkdir(parents=True)
            article = root / 'news/example'
            article.mkdir(parents=True)
            Image.new('RGB', (900, 900), 'green').save(root / 'assets/images/fields.webp')
            photo = preview(root, article, BASE + 'assets/images/fields.webp', BASE, 'https://example.invalid')
            with Image.open(root / photo.removeprefix(BASE)) as card:
                self.assertEqual((card.format, card.size), ('JPEG', SIZE))
            title = 'ਪੰਜਾਬ & ਖ਼ਬਰ'
            story = dict(id='test', slug='example', title=title, summary=title,
                         body='An independent excerpt.', image='fields')
            raw = page((ROOT / 'news.html').read_text(), story, photo)
            head = Head(raw)
            self.assertLess(raw.encode().index(b'charset="utf-8"'), 1024)
            for key, value in [('og:title', title), ('twitter:title', title),
                               ('og:description', story['body']), ('twitter:description', story['body']),
                               ('description', story['body']), ('og:image', photo), ('twitter:image', photo),
                               ('og:url', BASE + 'news/example/'), ('og:image:type', 'image/jpeg')]:
                self.assertEqual(head.meta(key), [value])
            self.assertEqual(head.canonical(), head.meta('og:url'))


def check_generated():
    for name in json.loads((ROOT / 'data/news-pages.json').read_text()):
        head = Head((ROOT / name).read_text())
        for key in ('og:title', 'og:description', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image'):
            values = head.meta(key)
            if len(values) != 1 or not values[0]:
                raise ValueError((name, key))
        url, = head.meta('og:image')
        if not url.startswith(BASE) or head.meta('twitter:image') != [url]:
            raise ValueError((name, url))
        with Image.open(ROOT / url.removeprefix(BASE)) as card:
            if (card.format, card.size) != ('JPEG', SIZE):
                raise ValueError((name, url, card.size))


if __name__ == '__main__':
    check_generated()
