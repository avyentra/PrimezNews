"""Build actual, crawlable headline URLs using only publicly readable articles.
No secret key. Abort on fetch failure; never replace good pages with an error response.
"""
import html, json, re, subprocess, urllib.request, shutil
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
    value=s.get('image','')
    return value if value.startswith('https://') else BASE+'assets/'+(value if re.fullmatch('[a-z0-9-]+',value) else 'news-farm')+'.webp'
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
def page(template,s):
    title=s.get('pa') or s['title'];url=BASE+'news/'+quote(s['slug'])+'/'
    desc=s.get('summary','')[:200];photo=image(s)
    metadata='<link rel="canonical" href="'+url+'">'
    for key,value in [('og:type','article'),('og:title',title),('og:description',desc),('og:url',url),('og:image',photo),('og:site_name','PrimezNews'),('twitter:card','summary_large_image'),('twitter:title',title),('twitter:description',desc),('twitter:image',photo)]:
        metadata+='<meta '+('name' if key.startswith('twitter:') else 'property')+'="'+key+'" content="'+escape(value)+'">'
    data={'@context':'https://schema.org','@type':'NewsArticle','headline':title,'description':desc,'url':url,'mainEntityOfPage':url,'image':[photo],'datePublished':s.get('publish_at') or s.get('published'),'dateModified':s.get('updated_at') or s.get('publish_at') or s.get('published'),'author':{'@type':'Person','name':s.get('author') or s.get('source') or 'PrimezNews Editorial Desk'},'publisher':{'@type':'NewsMediaOrganization','name':'PrimezNews','url':BASE,'logo':{'@type':'ImageObject','url':BASE+'assets/primznews-logo-new.webp'}},'inLanguage':'pa'}
    metadata+='<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':[data,{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'PrimezNews','item':BASE},{'@type':'ListItem','position':2,'name':'News','item':BASE+'news.html'},{'@type':'ListItem','position':3,'name':title,'item':url}]}]},ensure_ascii=False).replace('<','\\u003c')+'</script>'
    template=re.sub(r'<link rel="canonical"[^>]*>|<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>','',template)
    out=template.replace('<html lang="pa">','<html lang="pa" data-story-id="'+escape(s['id'])+'">').replace('<head>','<head><base href="../../">'+metadata)
    out=re.sub(r'<title>.*?</title>',lambda _: '<title>'+escape(title)+' | PrimezNews</title>',out,count=1)
    out=re.sub(r'<meta name="description" content="[^"]*">',lambda _: '<meta name="description" content="'+escape(desc)+'">',out,count=1)
    body='<header class="reader-article-header"><nav class="reader-breadcrumb"><a href="index.html">ਮੁੱਖ ਪੰਨਾ</a> / <a href="news.html">ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ</a></nav><h1>'+escape(title)+'</h1>'
    if desc.strip('* ')!=title.strip('* '):body+='<p class="reader-deck">'+escape(s.get('summary',''))+'</p>'
    body+='<p class="reader-meta">'+escape(s.get('author') or s.get('source') or 'PrimezNews')+' · '+escape(s.get('district'))+' · '+escape(s.get('publish_at') or s.get('published'))+'</p></header>'
    body+='<figure class="reader-figure"><img class="reader-hero-image" fetchpriority="high" decoding="async" src="'+escape(photo)+'" alt="'+escape(title)+'"></figure><div class="reader-body">'
    body+=''.join('<p>'+escape(p)+'</p>' for p in s.get('body','').split('\n\n') if p.strip())+'</div>'
    if s.get('sourceUrl'):body+='<p>Source: <a rel="noopener noreferrer" href="'+escape(s['sourceUrl'])+'">'+escape(s['source'])+'</a> · Curated news brief. Photograph is illustrative.</p>'
    out=out.replace('<section id="newsContent" aria-label="ਖ਼ਬਰਾਂ"></section>','<section id="newsContent" class="reader-article" aria-label="ਖ਼ਬਰਾਂ">'+body+'</section>').replace('ਖ਼ਬਰਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…','')
    return out.replace('<use href="#', '<use href="assets/reader-icons.svg#')

def build():
    rows=fetch(); seen={s['slug'] for s in rows}
    route_file=ROOT/'assets/js/news-routes.js'
    previous=json.loads(route_file.read_text().splitlines()[0].removeprefix('window.PRIMEZ_NEWS_ROUTES=').rstrip().removesuffix(';')) if route_file.exists() else {}
    for s in seeds():
        if s.get('id')=='video':continue
        slug=previous.get(s['id']) or slugify(s.get('en') or s['title'])
        if slug in seen:slug+='-brief'
        seen.add(slug);rows.append({**s,'slug':slug})
    template=(ROOT/'news.html').read_text(); routes={};paths=[]
    for s in rows:
        slug=s['slug']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug):raise ValueError('Article slug must use English letters, numbers and hyphens')
        path=ROOT/'news'/slug/'index.html';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(page(template,s));paths.append(str(path.relative_to(ROOT)));routes[s['id']]=slug
        for alias in s.get('slug_aliases',[]):
            if '/' in alias or '\\' in alias or alias in ('.','..'):raise ValueError('Unsafe alias')
            legacy=ROOT/'news'/alias/'index.html';legacy.parent.mkdir(parents=True,exist_ok=True);legacy.write_text(page(template,s));paths.append(str(legacy.relative_to(ROOT)))
    manifest=ROOT/'data/news-pages.json'
    old=json.loads(manifest.read_text()) if manifest.exists() else []
    for stale in set(old)-set(paths):
        p=ROOT/stale
        if p.parent.parent==ROOT/'news':shutil.rmtree(p.parent)
    manifest.write_text(json.dumps(paths,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'assets/js/news-routes.js').write_text('window.PRIMEZ_NEWS_ROUTES='+json.dumps(routes,ensure_ascii=False,separators=(',',':'))+';\nwindow.PRIMEZ_PUBLIC_BASE='+json.dumps(BASE)+';\n')
    fallback_template=re.sub(r'<meta name="robots"[^>]*>','',template)
    fallback=fallback_template.replace('<html lang="pa">','<html lang="pa" data-news-fallback="true">').replace('<head>','<head><base href="/"><script>if(location.hostname==="avyentra.github.io")document.querySelector("base").href="/PrimezNews/";</script><meta name="robots" content="noindex">')
    (ROOT/'404.html').write_text(fallback.replace('<use href="#', '<use href="assets/reader-icons.svg#'))
    # Only genuine public articles and established public pages enter the sitemap.
    pages=['','news.html','rashi.html','dharm.html','about-us.html','editorial-policy.html','privacy-policy.html','grievance-redressal.html','contact.html','advertise.html']
    urls=[BASE+p for p in pages]+[BASE+'news/'+quote(s['slug'])+'/' for s in rows]
    (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(u)+'</loc></url>' for u in urls)+'</urlset>\n')
    print(f'Built {len(rows)} public headline pages')
if __name__=='__main__':build()
