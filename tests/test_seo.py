import json,re,unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
BASE='https://avyentra.github.io/PrimezNews/'
class Head(HTMLParser):
 def __init__(self,source):super().__init__();self.tags=[];self.inhead=False;self.feed(source)
 def handle_starttag(self,tag,attrs):
  if tag=='head':self.inhead=True
  if self.inhead:self.tags.append((tag,dict(attrs)))
 def handle_endtag(self,tag):
  if tag=='head':self.inhead=False
 def meta(self,key):return [a.get('content','') for t,a in self.tags if t=='meta' and (a.get('name')==key or a.get('property')==key)]
 def canonical(self):return [a['href'] for t,a in self.tags if t=='link' and a.get('rel')=='canonical']
class SEO(unittest.TestCase):
 def test_public_templates_have_one_consistent_canonical_and_description(self):
  for name in ['index.html','home-v2.html','news.html','rashi.html','dharm.html','about-us.html','editorial-policy.html','privacy-policy.html','grievance-redressal.html','contact.html','advertise.html']:
   with self.subTest(page=name):
    head=Head((ROOT/name).read_text());self.assertEqual(len(head.canonical()),1);self.assertEqual(len(head.meta('description')),1);self.assertEqual(head.canonical(),head.meta('og:url'));self.assertTrue(head.canonical()[0].startswith(BASE));self.assertEqual(len(head.meta('robots')),1)
 def test_generated_articles_have_unique_metadata_valid_schema_and_english_canonicals(self):
  for path in json.loads((ROOT/'data/news-pages.json').read_text()):
   with self.subTest(page=path):
    source=(ROOT/path).read_text();head=Head(source);self.assertEqual(len(head.canonical()),1);self.assertEqual(len(head.meta('description')),1);self.assertEqual(head.canonical(),head.meta('og:url'));self.assertTrue(head.canonical()[0].isascii())
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',source,re.S):json.loads(block)
 def test_private_pages_and_fallback_are_noindex(self):
  for page in ['admin.html','login.html','reset-password.html','404.html']:
   head=Head((ROOT/page).read_text());self.assertEqual(len(head.meta('robots')),1);self.assertIn('noindex',head.meta('robots')[0])
 def test_sitemap_uses_only_deployed_origin_and_english_paths(self):
  import xml.etree.ElementTree as ET
  tree=ET.fromstring((ROOT/'sitemap.xml').read_text());urls=[e.text for e in tree.iter() if e.tag.endswith('loc')]
  self.assertGreater(len(urls),10)
  for url in urls:self.assertTrue(url.startswith(BASE));self.assertTrue(urlparse(url).path.isascii());self.assertNotIn('admin',url)
