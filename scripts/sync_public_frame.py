"""Bake the common public header and footer into directly served HTML."""
from pathlib import Path
import re
from html import escape

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {"admin.html", "login.html", "reset-password.html"}

def label(en, hi, pa):
    return ''.join(f'<span data-frame-lang="{lang}">{escape(value)}</span>'
                   for lang, value in [('pa', pa), ('hi', hi), ('en', en)])

def link(url, *words):
    return f'<a href="{escape(url)}">{label(*words)}</a>'

LOGO = '<img src="assets/primznews-logo-new.webp" width="1000" height="344" alt="PrimezNews — Punjab · Pulse of Pind">'
LANGUAGES = ''.join(f'<button type="button" class="language" data-lang="{lang}">{name}</button>'
                    for lang, name in [('hi','हिन्दी'),('en','English'),('pa','ਪੰਜਾਬੀ')])
HEADER = f'''<header class="pn-header">
<div class="pn-utility"><div class="pn-topline"><div class="pn-context"><strong>{label("Punjab news and ground reality","पंजाब की ख़बरें और ज़मीनी हक़ीक़त","ਪੰਜਾਬ ਦੀਆਂ ਖ਼ਬਰਾਂ ਤੇ ਜ਼ਮੀਨੀ ਹਕੀਕਤ")}</strong>
<a class="pn-district" href="index.html#districts">⌖ {label("Select district","ज़िला चुनें","ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ")} ⌄</a></div>
<a href="login.html">{label("Sign in","साइन इन","ਸਾਈਨ ਇਨ")}</a><div class="pn-langs"><span class="pn-channel" aria-disabled="true">◌ {label("WhatsApp channel","WhatsApp चैनल","WhatsApp ਚੈਨਲ")}</span>{LANGUAGES}<select id="siteLanguage" data-language-switch aria-label="Website language"><option value="pa">ਪੰਜਾਬੀ</option><option value="hi">हिन्दी</option><option value="en">English</option></select></div></div></div>
<div class="pn-panorama"><div class="pn-banner"><div class="pn-edition"><b>{label("Punjab edition","पंजाब अंक","ਪੰਜਾਬ ਅੰਕ")}</b><time id="pn-date"></time><small>☀ {label("Chandigarh","चंडीगढ़","ਚੰਡੀਗੜ੍ਹ")} <span id="pn-temperature"></span></small></div>
<a class="pn-logo" href="index.html">{LOGO}</a></div></div></header>'''

def footer(has_tools):
    explore = [('home-v2.html?category=Punjab','Punjab News','पंजाब समाचार','ਪੰਜਾਬ ਦੀਆਂ ਖ਼ਬਰਾਂ'),
               ('home-v2.html?category=Politics','Political Updates','राजनीति','ਸਿਆਸਤ'),
               ('home-v2.html?category=Agriculture','Agriculture','कृषि','ਖੇਤੀਬਾੜੀ'),
               ('home-v2.html?category=Education','Education','शिक्षा','ਸਿੱਖਿਆ'),
               ('home-v2.html?category=Crime','Crime & Safety','अपराध व सुरक्षा','ਅਪਰਾਧ ਤੇ ਸੁਰੱਖਿਆ')]
    local = [('news.html','Latest News','ताज़ा ख़बरें','ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ'),
             ('index.html#districts','News by District','ज़िले की ख़बरें','ਜ਼ਿਲ੍ਹੇ ਦੀਆਂ ਖ਼ਬਰਾਂ'),
             ('rashi.html','Horoscope','राशिफल','ਰਾਸ਼ੀਫਲ'),
             ('dharm.html','Faith & Culture','आस्था और संस्कृति','ਆਸਥਾ ਤੇ ਸੱਭਿਆਚਾਰ')]
    policies = [('about-us.html','About Us','हमारे बारे में','ਸਾਡੇ ਬਾਰੇ'),('contact.html','Contact Us','संपर्क','ਸੰਪਰਕ'),
                ('privacy-policy.html','Privacy Policy','निजता नीति','ਨਿੱਜਤਾ ਨੀਤੀ'),('editorial-policy.html','Editorial Policy','संपादकीय नीति','ਸੰਪਾਦਕੀ ਨੀਤੀ'),
                ('grievance-redressal.html','Grievance','शिकायत','ਸ਼ਿਕਾਇਤ'),('advertise.html','Advertise','विज्ञापन','ਇਸ਼ਤਿਹਾਰ')]
    tools = ''
    if has_tools:
        tools = (f'<button type="button" id="searchOpen">{label("Search","खोज","ਖੋਜ")}</button>'
                 f'<button type="button" id="savedOpen">{label("Saved stories","सहेजी ख़बरें","ਸੰਭਾਲੀਆਂ ਖ਼ਬਰਾਂ")} <span id="savedCount">0</span></button>')
    return f'''<footer class="pn-footer"><div class="pn-footgrid"><a href="index.html">{LOGO}</a>
<p>{label("PrimezNews brings you in-depth news, analysis and ground reports from Punjab.","पंजाब से गहन समाचार, विश्लेषण और ज़मीनी रिपोर्ट पढ़ें।","ਪੰਜਾਬ ਦੀਆਂ ਖ਼ਬਰਾਂ, ਵਿਸ਼ਲੇਸ਼ਣ ਤੇ ਜ਼ਮੀਨੀ ਰਿਪੋਰਟਾਂ ਪੜ੍ਹੋ।")}</p>
<div><h2>{label("Explore","और पढ़ें","ਹੋਰ ਵੇਖੋ")}</h2>{''.join(link(*row) for row in explore)}</div>
<div><h2>{label("Closer to you","आपके करीब","ਤੁਹਾਡੇ ਨੇੜੇ")}</h2>{''.join(link(*row) for row in local)}{tools}<a id="tipFooter" href="contact.html">{label("Share your story","अपनी खबर भेजें","ਆਪਣੀ ਖ਼ਬਰ ਭੇਜੋ")}</a></div>
<strong>{label("A clearer view.","एक स्पष्ट नज़रिया।","ਇੱਕ ਸਪਸ਼ਟ ਨਜ਼ਰੀਆ।")}<br>{label("A closer connection.","एक गहरा जुड़ाव।","ਇੱਕ ਨੇੜਲਾ ਜੁੜਾਅ।")}</strong></div>
<div class="pn-legal"><div><span>© 2026 PrimezNews. {label("All rights reserved.","सर्वाधिकार सुरक्षित।","ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ।")}</span><div>{''.join(link(*row) for row in policies)}</div></div></div></footer>'''

def sync():
    for path in list(ROOT.glob('*.html')) + list((ROOT/'news').glob('*/index.html')):
        if path.name in PRIVATE: continue
        html = path.read_text()
        start = next(marker for marker in ('<header class="pn-header">','<div class="utility">','<header>') if marker in html)
        i, j = html.index(start), html.index('<primez-site-nav>')
        html = html[:i] + HEADER + '\n' + html[j:]
        html = re.sub(r'<footer\b[^>]*>.*?</footer>', lambda _: footer('id="readerSearch"' in html or 'id="searchDialog"' in html), html, count=1, flags=re.S)
        if 'assets/css/public-frame.css' not in html:
            html = html.replace('</head>','<link rel="stylesheet" href="assets/css/public-frame.css"></head>',1)
        path.write_text(html)

if __name__ == '__main__':
    sync()
