import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('news_pages',Path(__file__).resolve().parents[1]/'scripts/build_news_pages.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class NewsPages(unittest.TestCase):
 def test_short_slug(self):
  self.assertEqual(m.slugify('The Punjab Police and Village Monitoring'), 'punjab-police-village-monitoring')
  self.assertLessEqual(len(m.slugify(' '.join(['word']*30)).split('-')),9)
 def test_static_page_is_crawlable_and_escapes_editor_text(self):
  s={'id':'x','slug':'punjab-news','title':'<script>unsafe</script>','body':'A paragraph\n\nAnother paragraph','summary':'Deck','image':'news-farm','publish_at':'2026-11-14T00:00:00Z'}
  template='<html lang="pa"><head><title>News</title></head><body><section id="newsContent" aria-label="ਖ਼ਬਰਾਂ"></section></body></html>'
  out=m.page(template,s)
  self.assertIn('rel="canonical"',out);self.assertIn('NewsArticle',out);self.assertIn('<p>A paragraph</p>',out);self.assertIn('<base href="/PrimezNews/">',out);self.assertNotIn('<h1><script>',out)
