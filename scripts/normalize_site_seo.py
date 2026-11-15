"""Normalize metadata against the actual deployed origin; do not alter editorial copy."""
import re,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE = "https://" + (ROOT / "CNAME").read_text().strip() + "/"
PUBLIC=['index.html','home-v2.html','news.html','rashi.html','dharm.html','about-us.html','editorial-policy.html','privacy-policy.html','grievance-redressal.html','contact.html','advertise.html']
OVERRIDES={
 'index.html':('PrimezNews | ਪੰਜਾਬ ਦੀਆਂ ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ ਅਤੇ ਜ਼ਿਲ੍ਹਾ ਖ਼ਬਰਾਂ','ਪੰਜਾਬ ਅਤੇ ਜ਼ਿਲ੍ਹਿਆਂ ਦੀਆਂ ਖ਼ਬਰਾਂ: ਖੇਤੀਬਾੜੀ, ਸਿੱਖਿਆ, ਸਿਆਸਤ, ਖੇਡਾਂ ਅਤੇ ਸੱਭਿਆਚਾਰ। PrimezNews ਪੰਜਾਬੀ, ਹਿੰਦੀ ਅਤੇ English ਵਿੱਚ ਪੜ੍ਹੋ।'),
 'rashi.html':('ਰਾਸ਼ੀਫਲ ਅਤੇ ਆਪਣੀ ਰਾਸ਼ੀ ਜਾਣੋ | PrimezNews','ਨਾਮ ਤੋਂ ਨਾਮ ਰਾਸ਼ੀ ਜਾਂ ਜਨਮ ਵੇਰਵਿਆਂ ਤੋਂ ਅਨੁਮਾਨਿਤ ਚੰਦਰ ਰਾਸ਼ੀ ਜਾਣੋ। 12 ਰਾਸ਼ੀਆਂ ਲਈ ਆਮ ਮਾਰਗਦਰਸ਼ਨ ਪੜ੍ਹੋ। ਕੇਵਲ ਮਨੋਰੰਜਨ ਲਈ।'),
 'dharm.html':('ਧਰਮ, ਆਸਥਾ ਅਤੇ ਪੰਜਾਬੀ ਸੱਭਿਆਚਾਰ | PrimezNews','ਪੰਜਾਬ ਦੀਆਂ ਧਰਮ, ਆਸਥਾ, ਗੁਰਪੁਰਬ, ਤਿਉਹਾਰ ਅਤੇ ਸੱਭਿਆਚਾਰ ਨਾਲ ਜੁੜੀਆਂ ਖ਼ਬਰਾਂ PrimezNews ਉੱਤੇ ਪੜ੍ਹੋ।')}
def normalize(name):
 p=ROOT/name;s=p.read_text();head,body=s.split('</head>',1)
 # Remove stale/duplicate metadata; reinsert one consistent set.
 title=re.search(r'<title>(.*?)</title>',head,re.S)[1]
 description=re.search(r'<meta name="description" content="([^"]*)"',head)[1]
 if name in OVERRIDES:title,description=OVERRIDES[name]
 if name=='home-v2.html':title,description=OVERRIDES['index.html']
 canonical=BASE if name in ('index.html','home-v2.html') else BASE+name
 head=re.sub(r'<title>.*?</title>','',head,flags=re.S)
 head=re.sub(r'<link rel="canonical"[^>]*>','',head)
 head=re.sub(r'<meta (?:name="(?:description|keywords|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>','',head)
 esc=lambda x:html.escape(html.unescape(x),quote=True)
 meta='<title>'+esc(title)+'</title>\n<meta name="description" content="'+esc(description)+'">\n<link rel="canonical" href="'+canonical+'">\n'
 meta+='<meta name="robots" content="'+('noindex, follow' if name=='home-v2.html' else 'index, follow, max-image-preview:large')+'">\n'
 for key,value in [('og:type','website'),('og:site_name','PrimezNews'),('og:title',title),('og:description',description),('og:url',canonical),('og:image',BASE+'assets/og-image.jpg'),('og:image:width','1200'),('og:image:height','630')]:meta+='<meta property="'+key+'" content="'+esc(value)+'">\n'
 for key,value in [('card','summary_large_image'),('title',title),('description',description),('image',BASE+'assets/og-image.jpg')]:meta+='<meta name="twitter:'+key+'" content="'+esc(value)+'">\n'
 p.write_text(head+meta+'</head>'+body)
if __name__=='__main__':
 for name in PUBLIC:normalize(name)
 print('Normalized 11 public page templates')
