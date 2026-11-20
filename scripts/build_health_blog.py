"""Health & Beauty blog builder.

Writes from data/health-blog.json:
  health-blog/index.html          -> https://primeznews.com/health-blog/        (blog list)
  health-blog/<slug>/index.html   -> https://primeznews.com/health-blog/<slug>/ (one post)
  media/share/blog-<slug>.jpg -> 1200x630 WhatsApp/Facebook photo (< 280 KB)

To add a post: add an entry to data/health-blog.json (pa/hi/en text) and push to main —
the "Publish readable news URLs" workflow runs this script.  Locally: python scripts/build_health_blog.py
Header/footer come from health-beauty.html, so the blog always matches the site.
"""
import html
import io
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://primeznews.com'
OUT = ROOT / 'health-blog'
DATA = ROOT / 'data' / 'health-blog.json'
SHELL = ROOT / 'health-beauty.html'
MONTHS = {
    'pa': ['ਜਨਵਰੀ', 'ਫ਼ਰਵਰੀ', 'ਮਾਰਚ', 'ਅਪ੍ਰੈਲ', 'ਮਈ', 'ਜੂਨ', 'ਜੁਲਾਈ', 'ਅਗਸਤ', 'ਸਤੰਬਰ', 'ਅਕਤੂਬਰ', 'ਨਵੰਬਰ', 'ਦਸੰਬਰ'],
    'hi': ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
LANGS = ('pa', 'hi', 'en')
e = html.escape


def L(t, tag='span'):
    """Trilingual text: the site's language switch shows one of the three."""
    return ''.join(f'<{tag} data-frame-lang="{k}">{e(t.get(k) or t.get("pa", ""))}</{tag}>' for k in LANGS)


def T(pa, hi, en):
    return {'pa': pa, 'hi': hi, 'en': en}


def nice_date(iso):
    d = date.fromisoformat(iso)
    return {k: f'{d.day} {MONTHS[k][d.month - 1]} {d.year}' for k in LANGS}


def valid_slug(slug):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug or '') or len(slug) > 90:
        raise ValueError(f'Bad blog slug: {slug!r} (use lower-case English words joined by -)')
    return slug


def image_path(name):
    if not re.fullmatch(r'[a-z0-9-]+', name or ''):
        raise ValueError(f'Bad image name: {name!r} (use a file name from assets/, without .webp)')
    if not (ROOT / 'assets' / 'images' / f'{name}.webp').exists():
        raise ValueError(f'Image assets/{name}.webp not found')
    return f'assets/images/{name}.webp'


def shell():
    s = SHELL.read_text()
    head = s[:s.index('</head>')]
    body_start = s.index('<body')
    pre = s[body_start:s.index('<main')]
    post = s[s.index('</main>') + len('</main>'):]
    # blog styles are in assets/css/topic.css and blog script in assets/js/topic-page.js (both already on the page)
    return head, pre, post


def set_meta(head, base, title, desc, url, image, kind, extra=''):
    m = re.search(r'<meta charset="[^"]*">', head)
    head = head[:m.end()] + f'<base href="{base}">' + head[m.end():]
    head = re.sub(r'<title>.*?</title>', '<title>' + e(title) + '</title>', head, flags=re.S)
    for name, value in (('description', desc), ('og:title', title), ('og:description', desc), ('twitter:title', title),
                        ('twitter:description', desc), ('og:url', url), ('og:image', image), ('twitter:image', image), ('og:type', kind)):
        head = re.sub(r'(<meta (?:name|property)="' + re.escape(name) + r'" content=")[^"]*', lambda mm: mm.group(1) + e(value, quote=True), head)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda mm: mm.group(1) + url, head)
    head = re.sub(r'<script type="application/ld\+json">.*?</script>', '', head, flags=re.S)
    return head + extra


def share_card(src, dest):
    """1200x630 JPEG for WhatsApp/Facebook; rebuilt only when the photo changes."""
    from PIL import Image, ImageOps
    if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
        return
    with Image.open(src) as im:
        card = ImageOps.fit(im.convert('RGB'), (1200, 630), Image.LANCZOS)
    for q in (82, 74, 66, 58):
        buf = io.BytesIO()
        card.save(buf, 'JPEG', quality=q, optimize=True, progressive=False)
        if buf.tell() <= 280 * 1024:
            break
    dest.write_bytes(buf.getvalue())


def card(p, tags, cls='bl-card'):
    href = f'health-blog/{p["slug"]}/'
    tag = tags.get(p['tag'], T(p['tag'], p['tag'], p['tag']))
    return (f'<a class="{cls}" href="{href}" data-tag="{e(p["tag"])}">'
            f'<span class="bl-card-img"><img src="{image_path(p["image"])}" alt="" width="800" height="450" loading="lazy" decoding="async"></span>'
            f'<span class="bl-card-body"><span class="bl-tag">{L(tag)}</span><h3>{L(p["title"])}</h3><p>{L(p["excerpt"])}</p>'
            f'<span class="bl-meta">{L(nice_date(p["date"]))} · {p["minutes"]} {L(T("ਮਿੰਟ ਪੜ੍ਹੋ", "मिनट पढ़ें", "min read"))}</span></span></a>')


def block(b):
    if 'h2' in b: return f'<h2>{L(b["h2"])}</h2>'
    if 'p' in b: return f'<p>{L(b["p"])}</p>'
    if 'ul' in b: return '<ul>' + ''.join(f'<li>{L(x)}</li>' for x in b['ul']) + '</ul>'
    if 'ol' in b: return '<ol>' + ''.join(f'<li>{L(x)}</li>' for x in b['ol']) + '</ol>'
    if 'tip' in b: return f'<aside class="bl-tip"><b>{L(T("ਸਲਾਹ", "सलाह", "Tip"))}</b><p>{L(b["tip"])}</p></aside>'
    raise ValueError(f'Unknown blog block: {list(b)}')


def body_html(body):
    """Blocks -> HTML; every h2 gets an id so the table of contents can link to it."""
    out, n = [], 0
    for b in body:
        if 'h2' in b:
            n += 1
            out.append(f'<h2 id="s{n}">{L(b["h2"])}</h2>')
        else:
            out.append(block(b))
    return ''.join(out)


def word_count(body):
    n = 0
    for b in body:
        for kind, v in b.items():
            if kind == 'h2': continue
            n += sum(len(x['en'].split()) for x in v) if isinstance(v, list) else len(v['en'].split())
    return n


def toc_html(body):
    items = [b['h2'] for b in body if 'h2' in b]
    if len(items) < 3: return ''
    lis = ''.join(f'<li><a href="#s{i}">{L(h)}</a></li>' for i, h in enumerate(items, 1))
    return ('<nav class="bl-toc" aria-label="Contents"><details open><summary>' + L(T('ਇਸ ਲੇਖ ਵਿੱਚ', 'इस लेख में', 'In this article')) + f'</summary><ol>{lis}</ol></details></nav>')


def faq_html(p):
    faq = p.get('faq') or []
    if not faq: return ''
    items = ''.join(f'<details class="bl-q"><summary>{L(f["q"])}</summary><p>{L(f["a"])}</p></details>' for f in faq)
    return '<section class="bl-faq"><h2>' + L(T('ਅਕਸਰ ਪੁੱਛੇ ਜਾਂਦੇ ਸਵਾਲ', 'अक्सर पूछे जाने वाले सवाल', 'Frequently asked questions')) + f'</h2>{items}</section>'


def faq_ld(p):
    faq = p.get('faq') or []
    if not faq: return None
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': f['q']['en'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a']['en']}} for f in faq]}


def author_box(p):
    return ('<aside class="bl-author"><span class="bl-avatar" aria-hidden="true">PN</span><div><b>' + L(p['author']) + '</b><p>'
            + L(T('ਆਮ ਜਨਤਕ ਸਿਹਤ ਮਾਰਗਦਰਸ਼ਨ ਦੇ ਆਧਾਰ ’ਤੇ ਤਿਆਰ ਕੀਤਾ ਗਿਆ। ਇਹ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਦੀ ਥਾਂ ਨਹੀਂ ਲੈਂਦਾ। ਸਾਡੀ ਸੰਪਾਦਕੀ ਨੀਤੀ ਪੜ੍ਹੋ।',
                'आम जन-स्वास्थ्य मार्गदर्शन के आधार पर तैयार। यह डॉक्टर की सलाह का विकल्प नहीं है। हमारी संपादकीय नीति पढ़ें।',
                'Prepared from widely accepted public-health guidance. It does not replace a doctor’s advice. Read our editorial policy.'))
            + ' <a href="editorial-policy">' + L(T('ਸੰਪਾਦਕੀ ਨੀਤੀ →', 'संपादकीय नीति →', 'Editorial policy →')) + '</a></p></div></aside>')


# Placeholder boxes ("300 x 250", "728 x 90") are NOT shown on blog pages: Google AdSense reviewers dislike empty placeholder ads.
# Real ad units can be pasted here after AdSense approves the site.
AD_SIDE = ''
AD_WIDE = ''
DISCLAIMER = T('ਇਹ ਲੇਖ ਆਮ ਜਾਣਕਾਰੀ ਲਈ ਹੈ, ਡਾਕਟਰੀ ਸਲਾਹ ਨਹੀਂ। ਕੋਈ ਵੀ ਦਵਾਈ ਜਾਂ ਇਲਾਜ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਨਾਲ ਹੀ ਲਓ।',
               'यह लेख सामान्य जानकारी के लिए है, डॉक्टरी सलाह नहीं। कोई भी दवा या इलाज डॉक्टर की सलाह से ही लें।',
               'This article is general information, not medical advice. Take any medicine or treatment only on a doctor’s advice.')


def side(tags, current=None):
    chips = ''.join(f'<a class="bl-side-tag" href="health-blog/#{k}">{L(v)}</a>' for k, v in tags.items())
    return (f'<aside class="topic-side">'
            f'<section class="topic-box"><h2>{L(T("ਵਿਸ਼ੇ", "विषय", "Topics"))}</h2><div class="bl-side-tags">{chips}</div></section>'
            f'{AD_SIDE}'
            f'<section class="topic-box bl-wa"><h2>{L(T("ਨਵੇਂ ਲੇਖ WhatsApp ’ਤੇ", "नए लेख WhatsApp पर", "New articles on WhatsApp"))}</h2>'
            f'<p>{L(T("ਹਰ ਹਫ਼ਤੇ ਸਿਹਤ ਦੀਆਂ ਆਸਾਨ ਗੱਲਾਂ ਸਿੱਧੀਆਂ ਤੁਹਾਡੇ ਫ਼ੋਨ ’ਤੇ।", "हर हफ़्ते सेहत की आसान बातें सीधे आपके फ़ोन पर।", "Simple health reads every week, straight to your phone."))}</p>'
            f'<a class="hb-btn" href="health-beauty">{L(T("ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ ਪੰਨਾ →", "स्वास्थ्य व सौंदर्य पेज →", "Health & Beauty page →"))}</a></section>'
            f'</aside>')


def build():
    data = json.loads(DATA.read_text())
    tags = data['tags']
    posts = sorted(data['posts'], key=lambda p: p['date'], reverse=True)
    seen = set()
    for p in posts:
        valid_slug(p['slug'])
        if p['slug'] in seen: raise ValueError(f'Duplicate blog slug {p["slug"]}')
        seen.add(p['slug']); image_path(p['image']); date.fromisoformat(p['date'])
        if p['tag'] not in tags: raise ValueError(f'Unknown tag {p["tag"]} in {p["slug"]}')
    head, pre, post_html = shell()
    OUT.mkdir(exist_ok=True)

    # ---- list page ----
    lead, rest = posts[0], posts[1:]
    chips = f'<button type="button" class="hb-chip active" data-blog-tag="" aria-pressed="true">{L(T("ਸਭ", "सभी", "All"))}</button>' + ''.join(
        f'<button type="button" class="hb-chip" data-blog-tag="{e(k)}" aria-pressed="false">{L(v)}</button>' for k, v in tags.items() if any(p['tag'] == k for p in posts))
    list_main = (
        '<main class="topic hb bl">'
        '<nav class="bl-crumbs" aria-label="Breadcrumb"><a href="./">' + L(T('ਮੁੱਖ ਪੰਨਾ', 'मुख्य पृष्ठ', 'Home')) + '</a> / <a href="health-beauty">' + L(T('ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ', 'स्वास्थ्य व सौंदर्य', 'Health & Beauty')) + '</a> / <span>' + L(T('ਬਲੌਗ', 'ब्लॉग', 'Blog')) + '</span></nav>'
        '<section class="bl-hero"><span class="hb-kicker">PrimezNews · ' + L(T('ਸਿਹਤ ਬਲੌਗ', 'हेल्थ ब्लॉग', 'Health blog')) + '</span>'
        '<h1>' + L(T('ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ ਬਲੌਗ', 'स्वास्थ्य व सौंदर्य ब्लॉग', 'Health & Beauty Blog')) + '</h1>'
        '<p>' + L(T('ਤੰਦਰੁਸਤੀ, ਖੁਰਾਕ, ਮਨ ਦੀ ਸਿਹਤ ਅਤੇ ਸੁੰਦਰਤਾ ਬਾਰੇ ਆਸਾਨ ਭਾਸ਼ਾ ਵਿੱਚ ਲੇਖ — ਪੰਜਾਬੀ, ਹਿੰਦੀ ਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ।', 'सेहत, आहार, मानसिक स्वास्थ्य और सौंदर्य पर आसान भाषा में लेख — पंजाबी, हिंदी व अंग्रेज़ी में।', 'Easy reads on fitness, food, mental health and beauty — in Punjabi, Hindi and English.')) + '</p>'
        f'<ul class="bl-stats"><li><b>{len(posts)}</b><span>' + L(T('ਲੇਖ', 'लेख', 'Articles')) + f'</span></li><li><b>{len({p["tag"] for p in posts})}</b><span>' + L(T('ਵਿਸ਼ੇ', 'विषय', 'Topics')) + '</span></li><li><b>3</b><span>' + L(T('ਭਾਸ਼ਾਵਾਂ', 'भाषाएँ', 'Languages')) + '</span></li><li><b>' + L(T('ਰੋਜ਼', 'रोज़', 'Daily')) + '</b><span>' + L(T('ਨਵੇਂ ਲੇਖ', 'नए लेख', 'New posts')) + '</span></li></ul>'
        f'<div class="hb-chips bl-chips" role="group" aria-label="Topics">{chips}</div></section>'
        '<div class="hb-grid"><div class="hb-main">'
        '<h2 class="bl-sec">' + L(T('ਤਾਜ਼ਾ ਲੇਖ', 'ताज़ा लेख', 'Latest article')) + '</h2>'
        + card(lead, tags, 'bl-card bl-featured') +
        '<h2 class="bl-sec">' + L(T('ਹੋਰ ਲੇਖ', 'और लेख', 'More articles')) + '</h2>'
        '<div class="bl-grid" id="blogGrid">' + ''.join(card(p, tags) for p in rest) + '</div>'
        '<p class="bl-empty" id="blogEmpty" hidden>' + L(T('ਇਸ ਵਿਸ਼ੇ ’ਤੇ ਲੇਖ ਜਲਦੀ ਆਉਣਗੇ।', 'इस विषय पर लेख जल्द आएँगे।', 'Articles on this topic are coming soon.')) + '</p>'
        + AD_WIDE + '</div>' + side(tags) + '</div></main>')
    list_title = 'Health & Beauty Blog | ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ ਬਲੌਗ — PrimezNews'
    list_desc = 'Simple health, fitness, diet, mental-health and beauty articles from PrimezNews in Punjabi, Hindi and English.'
    ld = {'@context': 'https://schema.org', '@type': 'Blog', 'name': 'PrimezNews Health & Beauty Blog', 'url': f'{SITE}/health-blog/', 'inLanguage': ['pa', 'hi', 'en'],
          'blogPost': [{'@type': 'BlogPosting', 'headline': p['title']['en'], 'url': f'{SITE}/health-blog/{p["slug"]}/', 'datePublished': p['date']} for p in posts]}
    h = set_meta(head, '../', list_title, list_desc, f'{SITE}/health-blog/', f'{SITE}/media/share/blog-{lead["slug"]}.jpg', 'website',
                 '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>')
    (OUT / 'index.html').write_text(h + '</head>\n' + pre + list_main + '\n' + post_html)

    # ---- post pages ----
    for i, p in enumerate(posts):
        folder = OUT / p['slug']; folder.mkdir(exist_ok=True)
        share_dir = ROOT / 'media' / 'share'; share_dir.mkdir(parents=True, exist_ok=True)
        share_card(ROOT / image_path(p['image']), share_dir / f'blog-{p["slug"]}.jpg')
        share_url = f'{SITE}/media/share/blog-{p["slug"]}.jpg'
        url = f'{SITE}/health-blog/{p["slug"]}/'
        tag = tags[p['tag']]
        related = [q for q in posts if q is not p][:2]
        points = ''.join(f'<li>{L(x)}</li>' for x in p['points'])
        share = ('<div class="bl-share" data-url="' + url + '" data-title="' + e(p['title']['en'], quote=True) + '">'
                 '<span>' + L(T('ਸਾਂਝਾ ਕਰੋ', 'शेयर करें', 'Share')) + '</span>'
                 '<a class="wa" href="https://wa.me/?text=' + url + '" target="_blank" rel="noopener">WhatsApp</a>'
                 '<a class="fb" href="https://www.facebook.com/sharer/sharer.php?u=' + url + '" target="_blank" rel="noopener">Facebook</a>'
                 '<a class="x" href="https://twitter.com/intent/tweet?url=' + url + '" target="_blank" rel="noopener">X</a>'
                 '<button type="button" class="bl-copy">' + L(T('ਲਿੰਕ ਕਾਪੀ', 'लिंक कॉपी', 'Copy link')) + '</button></div>')
        article = (
            '<main class="topic hb bl bl-post"><div class="hb-grid"><article class="hb-main bl-article">'
            '<nav class="bl-crumbs" aria-label="Breadcrumb"><a href="./">' + L(T('ਮੁੱਖ ਪੰਨਾ', 'मुख्य पृष्ठ', 'Home')) + '</a> / <a href="health-beauty">' + L(T('ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ', 'स्वास्थ्य व सौंदर्य', 'Health & Beauty')) + '</a> / <a href="health-blog/">' + L(T('ਬਲੌਗ', 'ब्लॉग', 'Blog')) + '</a></nav>'
            f'<a class="bl-tag" href="health-blog/#{e(p["tag"])}">{L(tag)}</a>'
            f'<h1>{L(p["title"])}</h1><p class="bl-lede">{L(p["excerpt"])}</p>'
            '<div class="bl-byline"><span class="bl-avatar" aria-hidden="true">PN</span><span><b>' + L(p['author']) + '</b><small>' + L(nice_date(p['date'])) + f' · {p["minutes"]} ' + L(T('ਮਿੰਟ ਪੜ੍ਹੋ', 'मिनट पढ़ें', 'min read')) + '</small></span></div>'
            f'<figure class="bl-figure"><img src="{image_path(p["image"])}" alt="" width="1200" height="675" fetchpriority="high" decoding="async"></figure>'
            '<section class="bl-points"><h2>' + L(T('ਮੁੱਖ ਗੱਲਾਂ', 'मुख्य बातें', 'Key points')) + f'</h2><ul>{points}</ul></section>'
            + toc_html(p['body']) +
            '<div class="bl-body">' + body_html(p['body']) + '</div>'
            + faq_html(p) +
            f'<p class="topic-note">{L(DISCLAIMER)}</p>' + author_box(p) + share + AD_WIDE +
            '<section class="bl-related"><h2 class="topic-section-title">' + L(T('ਹੋਰ ਪੜ੍ਹੋ', 'और पढ़ें', 'Read more')) + '</h2><div class="bl-grid">' + ''.join(card(q, tags) for q in related) + '</div></section>'
            '</article>' + side(tags) + '</div></main>')
        ld = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': p['title']['en'], 'description': p['excerpt']['en'],
              'image': share_url, 'datePublished': p['date'], 'dateModified': p['date'], 'inLanguage': ['pa', 'hi', 'en'],
              'author': {'@type': 'Organization', 'name': 'PrimezNews'}, 'publisher': {'@type': 'Organization', 'name': 'PrimezNews', 'logo': {'@type': 'ImageObject', 'url': f'{SITE}/assets/images/primznews-logo-new.webp'}},
              'mainEntityOfPage': url, 'articleSection': tag['en'], 'wordCount': word_count(p['body'])}
        if p.get('keywords') or p.get('keyword'):
            ld['keywords'] = ', '.join(([p['keyword']] if p.get('keyword') else []) + [k for k in p.get('keywords', []) if k != p.get('keyword')])
        extra_ld = ''.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False).replace('</', '<\\/') + '</script>' for x in (faq_ld(p),) if x)
        en_t = p['title']['en'].strip()
        title = en_t if len(en_t) + 13 > 70 and len(en_t) > 57 else f'{en_t} | PrimezNews'
        h = set_meta(head, '../../', title, p['excerpt']['en'], url, share_url, 'article',
                     '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>' + extra_ld
                     + (f'<meta name="keywords" content="{e(", ".join(([p["keyword"]] if p.get("keyword") else []) + p.get("keywords", [])), quote=True)}">' if p.get('keyword') else ''))
        (folder / 'index.html').write_text(h + '</head>\n' + pre + article + '\n' + post_html)
    # keep sitemap.xml in step: every blog page must be listed (the daily workflow does not run the news-pages builder)
    sm = ROOT / 'sitemap.xml'
    if sm.exists():
        xml = sm.read_text()
        want = [f'{SITE}/health-blog/'] + [f'{SITE}/health-blog/{p["slug"]}/' for p in posts]
        add = ''.join(f'<url><loc>{u}</loc></url>' for u in want if f'<loc>{u}</loc>' not in xml)
        if add and '</urlset>' in xml:
            sm.write_text(xml.replace('</urlset>', add + '</urlset>'))
    # latest 3 posts on the Health & Beauty page (between markers)
    page = SHELL.read_text()
    lead_p, others = posts[0], posts[1:4]
    def feat(p):
        tag = tags.get(p['tag'], T(p['tag'], p['tag'], p['tag']))
        return (f'<a class="hf-feat" href="health-blog/{p["slug"]}/" data-tag="{e(p["tag"])}">'
                f'<span class="hf-feat-img"><img src="{image_path(p["image"])}" alt="" width="1200" height="675" decoding="async"></span>'
                f'<span class="hf-feat-body"><span class="hf-pills"><b>{L(T("ਖ਼ਾਸ ਲੇਖ", "खास लेख", "Featured"))}</b><b>{L(tag)}</b></span>'
                f'<h3>{L(p["title"])}</h3><p>{L(p["excerpt"])}</p>'
                f'<span class="hf-read">{L(T("ਪੂਰੀ ਕਹਾਣੀ ਪੜ੍ਹੋ →", "पूरी कहानी पढ़ें →", "Read Full Story →"))}</span>'
                f'<span class="hf-fmeta">{L(nice_date(p["date"]))} · {p["minutes"]} {L(T("ਮਿੰਟ ਪੜ੍ਹੋ", "मिनट पढ़ें", "min read"))}</span></span></a>')

    def row(p):
        return (f'<a class="hf-row" href="health-blog/{p["slug"]}/" data-tag="{e(p["tag"])}">'
                f'<span class="hf-thumb"><img src="{image_path(p["image"])}" alt="" width="200" height="140" loading="lazy" decoding="async"></span>'
                f'<span class="hf-rbody"><span class="hf-rtitle">{L(p["title"])}</span>'
                f'<small>{L(nice_date(p["date"]))} · {p["minutes"]} {L(T("ਮਿੰਟ ਪੜ੍ਹੋ", "मिनट पढ़ें", "min read"))}</small></span></a>')

    block_html = ('<!--blog-latest--><section class="hf-top" aria-labelledby="blLatestTitle">' + feat(lead_p) +
                  '<aside class="hf-side"><div class="hf-side-head"><h2 id="blLatestTitle">' + L(T('ਤਾਜ਼ਾ ਸਿਹਤ ਬਲੌਗ', 'ताज़ा हेल्थ ब्लॉग', 'Latest Health Blogs')) + '</h2>'
                  '<a href="health-blog/">' + L(T('ਸਾਰੇ ਲੇਖ →', 'सभी लेख →', 'View All →')) + '</a></div>' +
                  ''.join(row(p) for p in others) + '</aside></section><!--/blog-latest-->')
    new = re.sub(r'<!--blog-latest-->.*?<!--/blog-latest-->', lambda m: block_html, page, count=1, flags=re.S)
    if new != page: SHELL.write_text(new)
    # remove pages of posts that were taken out of the data file (only folders this script made)
    for d in OUT.iterdir():
        if d.is_dir() and d.name not in seen and (d / 'index.html').exists() and 'bl-article' in (d / 'index.html').read_text():
            for f in d.iterdir(): f.unlink()
            d.rmdir()
    return [p['slug'] for p in posts]


if __name__ == '__main__':
    print('blog posts:', ', '.join(build()))
