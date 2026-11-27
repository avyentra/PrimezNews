"""Generate crawler-readable pages from the published editorial blog rows."""
import html
import json
import math
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import nh3

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://primeznews.com'
CATEGORIES = ('General', 'Business & Finance', 'Health & Beauty', 'Technology',
              'Insurance & Legal', 'Education', 'Lifestyle')
LANGUAGES = {'en': 'English', 'pa': 'ਪੰਜਾਬੀ', 'hi': 'हिन्दी'}
TAGS = set('p div br h2 h3 strong b em i u ul ol li blockquote table caption thead tbody tr th td a img figure figcaption span'.split())
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')
XMLNS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
FIELDS = ('slug,title,summary,category,language,author,cover_url,cover_alt,cover_caption,'
          'body_html,seo_title,seo_description,canonical_url,social_image,sources,published_at,updated_at,status')
escape = html.escape


def https_url(value):
    try:
        parsed = urllib.parse.urlsplit(value)
        if parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password:
            return value
    except ValueError:
        pass
    return ''


def sanitize(value):
    def filter_attribute(tag, attr, val):
        if attr in {'src', 'href'}:
            return https_url(val) or None
        if attr == 'align':
            return val if val in {'left', 'center', 'right'} else None
        return val

    return nh3.clean(value, tags=TAGS, attributes={
        '*': {'align'}, 'a': {'href'}, 'img': {'src', 'alt'}, 'th': {'scope'}
    }, attribute_filter=filter_attribute, url_schemes={'https'},
        set_tag_attribute_values={'img': {'loading': 'lazy', 'decoding': 'async'}})


def category_id(value):
    return re.sub(r'[^a-z]+', '-', value.lower()).strip('-')


def load_rows():
    config = (ROOT / 'assets/js/backend-config.js').read_text(encoding='utf-8')
    url = re.search(r"url: '(https://[a-z0-9-]+\.supabase\.co)'", config)[1]
    key = re.search(r"publicKey: '([^']+)'", config)[1]
    rows = []
    while True:
        query = urllib.parse.urlencode({'select': FIELDS, 'status': 'eq.published',
                                        'order': 'published_at.desc,id.asc', 'limit': 100,
                                        'offset': len(rows)})
        req = urllib.request.Request(f'{url}/rest/v1/editorial_blogs?{query}',
                                     headers={'apikey': key})
        with urllib.request.urlopen(req, timeout=30) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < 100:
            return rows


def blog_url(slug):
    return f'{SITE}/blogs/{slug}/'


def blog_card(url, title, summary, author, language, label, cover):
    image = (f'<span class="blog-card-cover"><img src="{escape(cover)}" alt="" '
             'width="800" height="450" loading="lazy" decoding="async"></span>') if cover else ''
    return (f'<a class="blog-card" lang="{language}" href="{escape(url)}">{image}'
            f'<span class="blog-card-copy"><h3>{escape(title)}</h3>'
            f'<span class="blog-card-summary">{escape(" ".join(summary.split()))}</span>'
            f'<small>{escape(author)} · {escape(label)}</small></span></a>')


def card(row):
    return blog_card(blog_url(row['slug']), row['title'], row['summary'], row['author'],
                     row['language'], LANGUAGES[row['language']], https_url(row['cover_url']))


def frame(root, language, title, description, canonical, content, image='', structured=None):
    original = (root / 'health-beauty.html').read_text(encoding='utf-8')
    pre = original[original.index('<body'):original.index('<main')]
    post = original[original.index('</main>') + len('</main>'):]
    post = re.sub(r'<script\b[^>]*src="[^"]*googlesyndication[^"]*"[^>]*></script>', '', post)
    post = re.sub(r'<script\b[^>]*src="[^"]*topic-page[^"]*"[^>]*></script>', '', post)
    scripts_and_styles = ''.join(re.findall(r'<link\b[^>]+rel="stylesheet"[^>]*>', original[:original.index('</head>')]))
    frame_scripts = ''.join(re.findall(
        r'<script\b[^>]*src="assets/js/(?:public-language|site-nav|site-language-data|news-routes|news-urls)\.js[^"]*"[^>]*></script>',
        original[:original.index('</head>')]))
    image = image or f'{SITE}/assets/images/primznews-logo-new.webp'
    metadata = {
        'description': description, 'og:title': title, 'og:description': description,
        'og:url': canonical, 'og:image': image, 'og:type': 'article' if structured else 'website',
        'twitter:card': 'summary_large_image', 'twitter:title': title,
        'twitter:description': description, 'twitter:image': image
    }
    meta = ''.join(f'<meta {"property" if name.startswith("og:") else "name"}="{name}" content="{escape(value)}">'
                   for name, value in metadata.items())
    ld = ''
    if structured:
        payload = json.dumps(structured, ensure_ascii=False).replace('<', '\\u003c')
        ld = f'<script type="application/ld+json">{payload}</script>'
    return (f'<!doctype html><html lang="{language}" data-fixed-language="{language}"><head>'
            '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/">'
            f'<title>{escape(title)}</title><link rel="canonical" href="{escape(canonical)}">'
            f'{meta}{scripts_and_styles}<link rel="stylesheet" href="/assets/css/blog-management.css?v=public-layout-20261127">{frame_scripts}{ld}</head>'
            f'{pre}{content}{post}')


def archive_cards(root):
    archive = root / 'data/health-blog.json'
    if not archive.exists():
        return ''
    cards = []
    for post in json.loads(archive.read_text(encoding='utf-8'))['posts']:
        slug = post['slug']
        if not SLUG.fullmatch(slug):
            raise ValueError(f'Invalid archived blog slug: {slug}')
        image = post.get('image', '')
        cover = https_url(image)
        if not cover and SLUG.fullmatch(image):
            cover = f'/assets/images/{image}.webp'
        translated = root / 'en' / 'health-blog' / slug / 'index.html'
        url = f'/en/health-blog/{slug}/' if translated.exists() else f'/health-blog/{slug}/'
        cards.append(blog_card(url, post['title']['en'], post['excerpt']['en'], post['author']['en'],
                               'en', 'English, ਪੰਜਾਬੀ, हिन्दी', cover))
    return ''.join(cards)


def listing(root, rows):
    links, sections = [], []
    for category in CATEGORIES:
        articles = ''.join(card(row) for row in rows if row['category'] == category)
        if category == 'Health & Beauty':
            articles += archive_cards(root)
        if not articles:
            continue
        anchor = category_id(category)
        links.append(f'<a href="#{anchor}">{escape(category)}</a>')
        archive = ('<a class="blog-archive-link" href="/health-blog/">View archive →</a>'
                   if category == 'Health & Beauty' else '')
        sections.append(f'<section id="{anchor}"><div class="blog-section-heading">'
                        f'<h2>{escape(category)}</h2>{archive}</div>'
                        f'<div class="bl-grid">{articles}</div></section>')
    nav = f'<nav class="blog-category-nav" aria-label="Blog categories">{"".join(links)}</nav>' if len(links) > 1 else ''
    stories = ''.join(sections) or '<p>No published blogs yet.</p>'
    content = ('<main class="topic bl editorial-blogs blog-index"><h1>Blogs</h1>'
               f'{nav}{stories}</main>')
    return frame(root, 'en', 'Blogs | PrimezNews', 'Browse PrimezNews blogs by category.', f'{SITE}/blogs/', content)


def article(root, row, rows):
    url = blog_url(row['slug'])
    canonical = https_url(row.get('canonical_url', '')) or url
    cover = https_url(row['cover_url'])
    share = https_url(row['social_image']) or cover
    lang = row['language']
    source_urls = [url for url in map(https_url, row['sources']) if url]
    sources = ''.join(f'<li><a href="{escape(link)}">{escape(link)}</a></li>' for link in source_urls)
    refs = f'<section><h2>Sources</h2><ul>{sources}</ul></section>' if sources else ''
    caption = f'<figcaption>{escape(row["cover_caption"])}</figcaption>' if row['cover_caption'] else ''
    related = [other for other in rows if other['slug'] != row['slug'] and other['category'] == row['category']]
    related.sort(key=lambda other: other['language'] != lang)
    cards = ''.join(card(other) for other in related[:3])
    related_html = f'<section><h2>Related blogs</h2><div class="bl-grid">{cards}</div></section>' if cards else ''
    body = sanitize(row['body_html'])
    words = len(html.unescape(re.sub(r'<[^>]+>', ' ', body)).split())
    date = row['published_at'][:10]
    content = (
        '<main class="topic bl editorial-blogs"><article class="bl-article">'
        f'<nav class="bl-crumbs" aria-label="Breadcrumb"><a href="/blogs/">Blogs</a> / '
        f'<a href="/blogs/#{category_id(row["category"])}">{escape(row["category"])}</a></nav>'
        f'<h1>{escape(row["title"])}</h1><p class="bl-lede">{escape(row["summary"])}</p>'
        f'<p class="bl-byline">{escape(row["author"])} · <time datetime="{escape(date)}">{escape(date)}</time> · {math.ceil(words / 220)} min</p>'
        f'<figure class="bl-figure"><img src="{escape(cover)}" alt="{escape(row["cover_alt"])}" '
        'width="1672" height="941" fetchpriority="high" decoding="async">'
        f'{caption}</figure><div class="bl-body">{body}</div>{refs}{related_html}</article></main>'
    )
    structured = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': row['title'],
                  'description': row['summary'], 'image': share, 'datePublished': row['published_at'],
                  'dateModified': row['updated_at'], 'mainEntityOfPage': canonical,
                  'articleSection': row['category'], 'inLanguage': lang, 'wordCount': words,
                  'author': {'@type': 'Person', 'name': row['author']},
                  'publisher': {'@type': 'Organization', 'name': 'PrimezNews'}}
    return frame(root, lang, row['seo_title'], row['seo_description'], canonical, content, share, structured)


def build(rows, root=ROOT):
    rows = [row for row in rows if row['status'] == 'published']
    slugs = set()
    for row in rows:
        slug = row['slug']
        if not slug or not SLUG.fullmatch(slug) or len(slug) > 100 or slug in slugs:
            raise ValueError('Invalid or duplicate published blog slug')
        if row['language'] not in LANGUAGES or row['category'] not in CATEGORIES or not https_url(row['cover_url']):
            raise ValueError(f'Invalid public metadata for {slug}')
        slugs.add(slug)
    pages = {Path('blogs/index.html'): listing(root, rows)}
    sitemap = ET.Element('urlset', xmlns=XMLNS)
    ET.SubElement(ET.SubElement(sitemap, 'url'), 'loc').text = f'{SITE}/blogs/'
    # Include the existing health archive and its canonical published articles.
    archive = root / 'data/health-blog.json'
    if archive.exists():
        if (root / 'health-blog/index.html').is_file():
            ET.SubElement(ET.SubElement(sitemap, 'url'), 'loc').text = f'{SITE}/health-blog/'
        for post in json.loads(archive.read_text(encoding='utf-8'))['posts']:
            slug = post['slug']
            if not SLUG.fullmatch(slug):
                raise ValueError(f'Invalid archived blog slug: {slug}')
            if (root / 'health-blog' / slug / 'index.html').is_file():
                ET.SubElement(ET.SubElement(sitemap, 'url'), 'loc').text = f'{SITE}/health-blog/{slug}/'
    for row in rows:
        pages[Path('blogs', row['slug'], 'index.html')] = article(root, row, rows)
        url = blog_url(row['slug'])
        if not row.get('canonical_url') or row['canonical_url'] == url:
            entry = ET.SubElement(sitemap, 'url')
            ET.SubElement(entry, 'loc').text = url
            ET.SubElement(entry, 'lastmod').text = row['updated_at'][:10]
    pages[Path('blog-sitemap.xml')] = ET.tostring(sitemap, encoding='unicode', xml_declaration=True) + '\n'
    for name, text in pages.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
    for path in (root / 'blogs').glob('*/index.html'):
        if path.parent.name not in slugs:
            path.unlink()


if __name__ == '__main__':
    build(load_rows())
