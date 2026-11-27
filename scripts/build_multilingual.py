"""Generate static language editions only for complete translated content."""
import html,json,re
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
BASE='https://'+(ROOT/'CNAME').read_text().strip()+'/'
LANGS=('pa','hi','en')
POLICIES=('editorial-policy','privacy-policy','grievance-redressal','advertise')
SPAN=re.compile(r'<span\b[^>]*\bdata-(?:frame|info)-lang="(pa|hi|en)"[^>]*>.*?</span>',re.S)
def url(route,lang): return BASE+('' if lang=='pa' else lang+'/')+route+('/' if lang!='pa' and not route.endswith('/') else '')

def plain(s): return html.unescape(re.sub(r'<[^>]+>','',s)).strip()
def edition(source,route,lang,title,desc,available,post=None):
    s=SPAN.sub(lambda m:m[0] if m[1]==lang else '',source)
    s=re.sub(r'<html\b[^>]*>',f'<html lang="{lang}" data-fixed-language="{lang}">',s,count=1)
    s=re.sub(r'<base\b[^>]*>','',s)
    s=s.replace('<head>','<head><base href="/">',1)
    s=re.sub(r'<link\b[^>]*\b(?:rel="canonical"|hreflang="[^"]+")[^>]*>','',s)
    canonical=url(route,lang)
    tags=f'<link rel="canonical" href="{canonical}">'
    for l in LANGS: tags+=f'<link rel="alternate" hreflang="{l}" href="{url(route,l)}">'
    tags+=f'<link rel="alternate" hreflang="x-default" href="{url(route,"pa")}">'
    s=s.replace('</head>',tags+'</head>',1)
    s=re.sub(r'<title>.*?</title>',lambda _: '<title>'+html.escape(title)+'</title>',s,count=1,flags=re.S)
    for key,val in [('description',desc),('og:title',title),('og:description',desc),('twitter:title',title),('twitter:description',desc),('og:url',canonical),('og:locale',{'pa':'pa_IN','hi':'hi_IN','en':'en_US'}[lang])]:
        s=re.sub(r'(<meta (?:name|property)="'+re.escape(key)+r'" content=")[^"]*',lambda m:m[1]+html.escape(val,quote=True),s)
    s=re.sub(r'<script type="application/ld\+json">.*?</script>','',s,flags=re.S)
    ld={'@context':'https://schema.org','@type':'BlogPosting' if post else 'WebPage','name':title,'description':desc,'url':canonical,'inLanguage':lang}
    if post: ld.update(headline=post['title'][lang],datePublished=post['date'],mainEntityOfPage=canonical,author={'@type':'Organization','name':'PrimezNews','url':BASE+'about-us'},publisher={'@type':'Organization','name':'PrimezNews'},image=BASE+'media/share/blog-'+post['slug']+'.jpg')
    s=s.replace('</head>','<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')+'</script></head>',1)
    if lang!='pa':
        def local(m):
            target=m[1]; clean=target.split('#')[0].split('?')[0]; return 'href="'+url(clean,lang)+target[len(clean):]+'"' if clean in available else m[0]
        s=re.sub(r'href="([^"#:/][^"]*)"',local,s)
    s=s.replace('data-url="'+url(route,'pa')+'"','data-url="'+canonical+'"')
    return s

def blog_source(path):
    cache=ROOT/'scripts/language-templates'/ ('blog-'+path.parent.name+'.txt')
    source=path.read_text()
    if 'data-fixed-language=' not in source: cache.write_text(source)
    return cache.read_text()

def build():
    posts=json.loads((ROOT/'data/health-blog.json').read_text())['posts']
    entries={}; available=set()
    for p in posts:
        route='health-blog/'+p['slug']+'/'
        source=ROOT/route/'index.html'
        if source.exists(): entries[route]=(blog_source(source),p)
    entries['health-blog/']=(blog_source(ROOT/'health-blog/index.html'),None)
    for route in POLICIES:
        template=ROOT/'scripts'/'language-templates'/(route+'.txt')
        entries[route]=(template.read_text(),None)
    available=set(entries)
    for lang in ('hi','en'):
        for old in (ROOT/lang/'health-blog').glob('*/index.html'):
            if 'health-blog/'+old.parent.name+'/' not in available:
                old.unlink(); old.parent.rmdir()
    for route,(source,p) in entries.items():
        for lang in LANGS:
            if p: title=p['title'][lang]+' | PrimezNews'; desc=p['excerpt'][lang]
            else:
                selected=SPAN.sub(lambda m:m[0] if m[1]==lang else '',source)
                main=selected.split('<main',1)[1].split('</main>',1)[0]
                title=plain(re.search(r'<h1[^>]*>(.*?)</h1>',main,re.S)[1])+' | PrimezNews'
                desc=plain(re.search(r'<p[^>]*>(.*?)</p>',main,re.S)[1])[:300]
            target=ROOT/('' if lang=='pa' else lang)/route
            target=target/'index.html' if route.endswith('/') or lang!='pa' else target.with_suffix('.html')
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(edition(source,route,lang,title,desc,available,p))
    sm=ROOT/'sitemap.xml'; xml=sm.read_text()
    xml=re.sub(r'<url>\s*<loc>'+re.escape(BASE)+r'(?:hi|en)/[^<]+</loc>\s*</url>','',xml)
    additions=''.join('<url><loc>'+url(route,l)+'</loc></url>' for route in entries for l in LANGS if '<loc>'+url(route,l)+'</loc>' not in xml)
    sm.write_text(xml.replace('</urlset>',additions+'</urlset>'))
if __name__=='__main__': build()
