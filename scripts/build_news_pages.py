"""Build actual, crawlable headline URLs using only publicly readable articles.
No secret key. Abort on fetch failure; never replace good pages with an error response.
"""
import html, json, re, subprocess, urllib.request, shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
BASE = "https://" + (ROOT / "CNAME").read_text().strip() + "/"
def slugify(text):
    words=re.findall(r'[a-z0-9]+',text.lower())
    stop={'a','an','the','and','of','in','to','for','with','on','at'}
    return '-'.join([w for w in words if w not in stop][:9])[:100].rstrip('-') or 'punjab-news'
def escape(value):return html.escape(str(value or ''),quote=True)
def image(s):
    value=s.get('image') or ''
    return value if value.startswith('https://') else BASE+'assets/images/'+(value if re.fullmatch('[a-z0-9-]+',value) else 'news-farm')+'.webp'
def fetch():
    cfg=(ROOT/'assets/js/backend-config.js').read_text()
    url=re.search(r"url: '([^']+)'",cfg)[1]; key=re.search(r"publicKey: '([^']+)'",cfg)[1]
    req=urllib.request.Request(url+'/rest/v1/rpc/published_stories',data=b'{}',headers={'apikey':key,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=45) as response: rows=json.load(response)
    if not isinstance(rows,list) or any(not s.get('slug') for s in rows): raise ValueError('Invalid public article data')
    return rows
def seeds():
    code="global.window={};require('./assets/js/news-seed.js');console.log(JSON.stringify(window.PRIMEZ_SEED_STORIES))"
    return json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT))
PA_MONTHS=['ਜਨਵਰੀ','ਫ਼ਰਵਰੀ','ਮਾਰਚ','ਅਪ੍ਰੈਲ','ਮਈ','ਜੂਨ','ਜੁਲਾਈ','ਅਗਸਤ','ਸਤੰਬਰ','ਅਕਤੂਬਰ','ਨਵੰਬਰ','ਦਸੰਬਰ']
def nice_date(value):
    """'2026-11-15T16:07:34+00:00' -> '15 ਨਵੰਬਰ 2026' (India time); anything unreadable is shown as-is."""
    try:
        from datetime import timedelta
        d=datetime.fromisoformat(str(value).replace('Z','+00:00'))
        if d.tzinfo: d=d.astimezone(timezone(timedelta(hours=5,minutes=30)))
        return f'{d.day} {PA_MONTHS[d.month-1]} {d.year}'
    except (ValueError, TypeError):
        return str(value or '')
def paragraph_html(text):
    source = re.fullmatch(r"(ਸਰੋਤ|Source): ([^\n]+)\n(https?://[^\s]+)", text, re.I)
    if source:
        return '<p>' + escape(source[1]) + ': <a href="' + escape(source[3]) + '">' + escape(source[2]) + '</a></p>'
    return '<p>' + escape(text) + '</p>'


def page(template,s,share_image=None):
    title=s.get('pa') or s['title'];url=BASE+'news/'+quote(s['slug'])+'/'
    photo=image(s)
    share_image = share_image or photo
    summary = ' '.join((s.get('summary') or '').split())
    excerpt = ' '.join((s.get('body') or '').split())
    desc = (excerpt if excerpt and summary.strip('* ') in ('', title.strip('* ')) else summary) or title
    if len(desc) > 200:
        desc = desc[:200].rsplit(' ', 1)[0] + '…'
    metadata='<link rel="canonical" href="'+url+'">'
    for key,value in [('og:type','article'),('og:title',title),('og:description',desc),('og:url',url),('og:image',share_image),('og:image:secure_url',share_image),('og:image:type','image/jpeg'),('og:image:width','1200'),('og:image:height','630'),('og:image:alt',title),('og:locale','pa_IN'),('og:site_name','PrimezNews'),('twitter:card','summary_large_image'),('twitter:title',title),('twitter:description',desc),('twitter:image',share_image),('twitter:image:alt',title)]:
        metadata+='<meta '+('name' if key.startswith('twitter:') else 'property')+'="'+key+'" content="'+escape(value)+'">'
    data={'@context':'https://schema.org','@type':'NewsArticle','headline':title,'description':desc,'url':url,'mainEntityOfPage':url,'image':[share_image],'datePublished':s.get('publish_at') or s.get('published'),'dateModified':s.get('updated_at') or s.get('publish_at') or s.get('published'),'author':{'@type':'Person','name':s.get('author') or s.get('source') or 'PrimezNews Editorial Desk'},'publisher':{'@type':'NewsMediaOrganization','name':'PrimezNews','url':BASE,'logo':{'@type':'ImageObject','url':BASE+'assets/images/primznews-logo-new.webp'}},'inLanguage':'pa'}
    metadata+='<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':[data,{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'PrimezNews','item':BASE},{'@type':'ListItem','position':2,'name':'News','item':BASE+'news.html'},{'@type':'ListItem','position':3,'name':title,'item':url}]}]},ensure_ascii=False).replace('<','\\u003c')+'</script>'
    template=re.sub(r'<link rel="canonical"[^>]*>|<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>','',template)
    template=template.replace('<meta charset="utf-8">','')
    out=template.replace('<html lang="pa">','<html lang="pa" data-story-id="'+escape(s['id'])+'">').replace('<head>','<head><meta charset="utf-8"><base href="../../">'+metadata)
    out=re.sub(r'<title>.*?</title>',lambda _: '<title>'+escape(title)+' | PrimezNews</title>',out,count=1)
    out=re.sub(r'<meta name="description" content="[^"]*">',lambda _: '<meta name="description" content="'+escape(desc)+'">',out,count=1)
    body='<header class="reader-article-header"><nav class="reader-breadcrumb"><a href="./">ਮੁੱਖ ਪੰਨਾ</a> / <a href="news/">ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ</a></nav><h1>'+escape(title)+'</h1>'
    if summary.strip('* ')!=title.strip('* '):body+='<p class="reader-deck">'+escape(s.get('summary',''))+'</p>'
    body+='</header>'
    body+='<figure class="reader-figure"><img class="reader-hero-image" fetchpriority="high" decoding="async" src="'+escape(photo)+'" alt="'+escape(title)+'"></figure>'
    body+='<p class="reader-meta">'+escape(re.sub(r'^RSS Desk.*$','PrimezNews Desk',s.get('author') or s.get('source') or 'PrimezNews',flags=re.I))+(' · '+escape(s['district']) if s.get('district') and s['district'] != 'District unconfirmed' else '')+' · '+escape(nice_date(s.get('publish_at') or s.get('published')))+'</p><div class="reader-body">'
    body+=''.join(paragraph_html(p) for p in s.get('body','').split('\n\n') if p.strip())+'</div>'
    if s.get('sourceUrl'):body+='<p>Source: <a rel="noopener noreferrer" href="'+escape(s['sourceUrl'])+'">'+escape(s['source'])+'</a> · Curated news brief. Photograph is illustrative.</p>'
    out=out.replace('<section id="newsContent" aria-label="ਖ਼ਬਰਾਂ"></section>','<section id="newsContent" class="reader-article" aria-label="ਖ਼ਬਰਾਂ">'+body+'</section>').replace('ਖ਼ਬਰਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…','')
    return out.replace('<use href="#', '<use href="assets/images/reader-icons.svg#')

def write_news_index(template):
    """/news/ = the latest-news list (same page as news.html), so the browser never shows .html."""
    page_html=template.replace('<head>','<head><base href="../">',1)
    (ROOT/'news'/'index.html').write_text(page_html.replace('<use href="#', '<use href="assets/images/reader-icons.svg#'))

def write_home_headlines(rows):
    """Give readers real article links before the interactive homepage loads."""
    def headline(row):
        slug = row["slug"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError("Invalid homepage headline slug")
        title = escape(row.get("pa") or row["title"])
        return f'<a href="news/{slug}/">{title}</a>'

    if not rows:
        return
    lead = rows[0]
    photo = escape(image(lead))
    hero = (f'<article class="lead-story"><a class="lead-image" href="news/{lead["slug"]}/">'
            f'<img fetchpriority="high" width="1200" height="675" src="{photo}" alt=""></a>'
            f'<h2>{headline(lead)}</h2></article><div class="secondary-stories">'
            + "".join(f'<article class="secondary-card"><h3>{headline(row)}</h3></article>' for row in rows[1:3]) + '</div>')
    features = "".join(f'<article><h3>{headline(row)}</h3></article>' for row in rows[3:6])
    if features:
        features = '<section class="wrap pn-featured"><h2>ਹੋਰ ਪ੍ਰਕਾਸ਼ਿਤ ਖ਼ਬਰਾਂ</h2><div>' + features + '</div></section>'
    for filename in ("index.html", "home-v2.html"):
        path = ROOT / filename
        text = path.read_text()
        for marker, block in (("published-headlines", hero), ("published-features", features)):
            text = re.sub(f'<!--{marker}-->.*?<!--/{marker}-->',
                          lambda _: f'<!--{marker}-->{block}<!--/{marker}-->', text, count=1, flags=re.S)
        if text != path.read_text():
            path.write_text(text)

def write_lead_preload(rows):
    """Speed (LCP): tell the browser the home page's top-story photo before any JavaScript runs."""
    now=datetime.now(timezone.utc)
    def when(s):
        try: return datetime.fromisoformat(str(s.get('publish_at','')).replace('Z','+00:00'))
        except ValueError: return None
    live=[s for s in rows if s.get('status') in ('published','scheduled') and when(s) and when(s)<=now]
    live.sort(key=lambda s:when(s),reverse=True)
    lead=live[0] if live else None
    if lead is None:
        seed=[s for s in seeds() if s.get('id')!='video']
        lead=seed[0] if seed else {}
    value=str(lead.get('image') or '')
    url=value if value.startswith('https://') else ('assets/images/'+value+'.webp' if re.fullmatch(r'[a-z0-9-]+',value,re.I) else 'assets/images/news-farm.webp')
    home=ROOT/'index.html'; text=home.read_text()
    tag='<!--lead-image--><link rel="preload" as="image" href="'+html.escape(url,quote=True)+'" fetchpriority="high"><!--/lead-image-->'
    new=re.sub(r'<!--lead-image-->.*?<!--/lead-image-->',lambda m:tag,text,count=1,flags=re.S)
    if new!=text: home.write_text(new)

def build():
    from social_preview import preview
    cfg = (ROOT/'assets/js/backend-config.js').read_text()
    storage_origin = re.search(r"url: '([^']+)'", cfg)[1]
    rows=fetch(); seen={s['slug'] for s in rows}
    route_file=ROOT/'assets/js/news-routes.js'
    previous=json.loads(route_file.read_text().splitlines()[0].removeprefix('window.PRIMEZ_NEWS_ROUTES=').rstrip().removesuffix(';')) if route_file.exists() else {}
    # fetch() reads the public-only RPC, before the offline seed rows are appended.
    write_home_headlines(rows)
    for s in seeds():
        if s.get('id')=='video':continue
        slug=previous.get(s['id']) or slugify(s.get('en') or s['title'])
        if slug in seen:slug+='-brief'
        seen.add(slug);rows.append({**s,'slug':slug})
    template=(ROOT/'news.html').read_text(); routes={};paths=[]
    for s in rows:
        slug=s['slug']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug):raise ValueError('Article slug must use English letters, numbers and hyphens')
        path=ROOT/'news'/slug/'index.html';path.parent.mkdir(parents=True,exist_ok=True);share_image=preview(ROOT,path.parent,image(s),BASE,storage_origin);path.write_text(page(template,s,share_image));paths.append(str(path.relative_to(ROOT)));routes[s['id']]=slug
        for alias in s.get('slug_aliases',[]):
            if '/' in alias or '\\' in alias or alias in ('.','..'):raise ValueError('Unsafe alias')
            legacy=ROOT/'news'/alias/'index.html';legacy.parent.mkdir(parents=True,exist_ok=True);legacy.write_text(page(template,s,share_image));paths.append(str(legacy.relative_to(ROOT)))
    headlines = [{key: row.get(key) for key in ('slug', 'title', 'pa', 'hi', 'en')} for row in rows[:4]]
    (ROOT/'data/header-news.json').write_text(json.dumps(headlines, ensure_ascii=False) + '\n')
    manifest=ROOT/'data/news-pages.json'
    old=json.loads(manifest.read_text()) if manifest.exists() else []
    for stale in set(old)-set(paths):
        p=ROOT/stale
        if p.parent.parent==ROOT/'news':shutil.rmtree(p.parent)
    manifest.write_text(json.dumps(paths,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'assets/js/news-routes.js').write_text('window.PRIMEZ_NEWS_ROUTES='+json.dumps(routes,ensure_ascii=False,separators=(',',':'))+';\nwindow.PRIMEZ_PUBLIC_BASE='+json.dumps(BASE)+';\n')
    fallback_template=re.sub(r'<meta name="robots"[^>]*>','',template)
    fallback=fallback_template.replace('<html lang="pa">','<html lang="pa" data-news-fallback="true">').replace('<head>','<head><base href="/"><script>if(location.hostname==="avyentra.github.io")document.querySelector("base").href="/PrimezNews/";</script><meta name="robots" content="noindex">')
    (ROOT/'404.html').write_text(fallback.replace('<use href="#', '<use href="assets/images/reader-icons.svg#'))
    write_news_index(template)
    write_lead_preload(rows)
    # Only genuine public articles and established public pages enter the sitemap.
    # Clean URLs (no .html): GitHub Pages serves about-us.html at /about-us
    pages=['','news/','rashi','dharm','jobs','health-beauty','health-blog/','nri','videos','mandi-bhav','hukamnama','sarkari-yojana','about-us','editorial-policy','privacy-policy','grievance-redressal','contact','advertise','join-newsroom']
    try: pages+=['health-blog/'+p['slug']+'/' for p in json.loads((ROOT/'data'/'health-blog.json').read_text())['posts']]
    except (OSError, ValueError, KeyError): pass
    urls=[BASE+p for p in pages]+[BASE+'news/'+quote(s['slug'])+'/' for s in rows]
    (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(u)+'</loc></url>' for u in urls)+'</urlset>\n')
    print(f'Built {len(rows)} public headline pages')
if __name__=='__main__':build()
