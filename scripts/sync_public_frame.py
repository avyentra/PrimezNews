"""Bake the common public header and footer into directly served HTML."""
from pathlib import Path
import re
from html import escape

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {"admin.html", "login.html", "reset-password.html", "join-newsroom.html", "journalist.html"}

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
<a class="pn-district" href="./#districts">⌖ {label("Select district","ज़िला चुनें","ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ")} ⌄</a></div>
<a href="login">{label("Sign in","साइन इन","ਸਾਈਨ ਇਨ")}</a><div class="pn-langs"><span class="pn-channel" aria-disabled="true">◌ {label("WhatsApp channel","WhatsApp चैनल","WhatsApp ਚੈਨਲ")}</span>{LANGUAGES}<select id="siteLanguage" data-language-switch aria-label="Website language"><option value="pa">ਪੰਜਾਬੀ</option><option value="hi">हिन्दी</option><option value="en">English</option></select></div></div></div>
<div class="pn-panorama"><div class="pn-banner"><div class="pn-edition"><b>{label("Punjab edition","पंजाब अंक","ਪੰਜਾਬ ਅੰਕ")}</b><time id="pn-date"></time><small>☀ {label("Chandigarh","चंडीगढ़","ਚੰਡੀਗੜ੍ਹ")} <span id="pn-temperature"></span></small></div>
<a class="pn-logo" href="./">{LOGO}</a></div></div></header>'''

def footer(has_tools):
    groups = [
        (("News", "ख़बरें", "ਖ਼ਬਰਾਂ"), [
            ('home-v2?category=Punjab','Punjab','पंजाब','ਪੰਜਾਬ'),
            ('home-v2?category=Agriculture','Agriculture','कृषि','ਖੇਤੀਬਾੜੀ'),
            ('jobs','Jobs','रोज़गार','ਰੁਜ਼ਗਾਰ'),
            ('home-v2?category=Politics','Politics','राजनीति','ਸਿਆਸਤ'),
            ('home-v2?category=Sports','Sports','खेल','ਖੇਡਾਂ'),
            ('nri','NRI News','NRI समाचार','NRI ਖ਼ਬਰਾਂ')]),
        (("See more", "और देखें", "ਹੋਰ ਵੇਖੋ"), [
            ('rashi','Horoscope','राशिफल','ਰਾਸ਼ੀਫਲ'),
            ('health-beauty','Health & beauty','स्वास्थ्य और सौंदर्य','ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ'),
            ('mandi-bhav','Market prices','मंडी भाव','ਮੰਡੀ ਭਾਅ'),
            ('hukamnama','Hukamnama','हुकमनामा','ਹੁਕਮਨਾਮਾ'),
            ('sarkari-yojana','Government schemes','सरकारी योजनाएँ','ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ'),
            ('videos','Video news','वीडियो समाचार','ਵੀਡੀਓ ਖ਼ਬਰਾਂ')]),
        (("Near you", "आपके पास", "ਤੁਹਾਡੇ ਨੇੜੇ"), [
            ('./#districts','Your district','आपका ज़िला','ਤੁਹਾਡਾ ਜ਼ਿਲ੍ਹਾ'),
            ('home-v2?category=Education','Education','शिक्षा','ਸਿੱਖਿਆ'),
            ('home-v2?category=Crime','Crime & safety','अपराध और सुरक्षा','ਅਪਰਾਧ ਤੇ ਸੁਰੱਖਿਆ'),
            ('dharm','Faith & culture','आस्था और संस्कृति','ਆਸਥਾ ਤੇ ਸੱਭਿਆਚਾਰ'),
            ('./#tipOpen','Tell your story','अपनी ख़बर भेजें','ਆਪਣੀ ਖ਼ਬਰ ਭੇਜੋ')])]
    columns = ''.join('<div class="pn-footlinks"><h2>'+label(*title)+'</h2>'+
                      ''.join(link(*item) for item in items)+'</div>' for title,items in groups)
    tools = ''
    if has_tools:
        tools = (f'<button type="button" id="searchOpen">{label("Search","खोज","ਖੋਜ")}</button>'
                 f'<button type="button" id="savedOpen">{label("Saved stories","सहेजी ख़बरें","ਸੰਭਾਲੀਆਂ ਖ਼ਬਰਾਂ")} <span id="savedCount">0</span></button>')
    policies = [('about-us','About us','हमारे बारे में','ਸਾਡੇ ਬਾਰੇ'),('editorial-policy','Editorial policy','संपादकीय नीति','ਸੰਪਾਦਕੀ ਨੀਤੀ'),
                ('privacy-policy','Privacy','निजता','ਨਿੱਜਤਾ'),('grievance-redressal','Complaint','शिकायत','ਸ਼ਿਕਾਇਤ'),
                ('advertise','Advertise','विज्ञापन दें','ਇਸ਼ਤਿਹਾਰ ਦਿਓ'),('contact','Contact','संपर्क','ਸੰਪਰਕ')]
    return f'''<footer class="pn-footer"><div class="pn-footinner">
<div class="pn-footlead"><strong>{label("A clear vision.","एक स्पष्ट नज़रिया।","ਇੱਕ ਸਪਸ਼ਟ ਨਜ਼ਰੀਆ।")}<br>{label("A close connection.","एक करीबी जुड़ाव।","ਇੱਕ ਨੇੜਲਾ ਜੁੜਾਅ।")}</strong>
<div class="pn-footactions"><span class="pn-footchannel" aria-disabled="true">◌ {label("WhatsApp channel · coming soon","WhatsApp चैनल · जल्द","WhatsApp ਚੈਨਲ · ਜਲਦੀ")}</span><a id="tipFooter" href="./#tipOpen">✎ {label("Tell your story","अपनी ख़बर भेजें","ਆਪਣੀ ਖ਼ਬਰ ਭੇਜੋ")}</a></div></div>
<div class="pn-footgrid"><div class="pn-footbrand"><a href="./">{LOGO}</a><p>{label("Independent reporting from Punjab, its districts and villages.","पंजाब, उसके ज़िलों और गाँवों की स्वतंत्र ख़बरें।","ਪੰਜਾਬ, ਇਸ ਦੇ ਜ਼ਿਲ੍ਹਿਆਂ ਅਤੇ ਪਿੰਡਾਂ ਦੀਆਂ ਸੁਤੰਤਰ ਖ਼ਬਰਾਂ।")}</p>{link("about-us","Read more →","और पढ़ें →","ਹੋਰ ਪੜ੍ਹੋ →")}</div>
{columns}<div class="pn-footads"><h2>{label("Advertise","विज्ञापन दें","ਇਸ਼ਤਿਹਾਰ ਦਿਓ")}</h2><div><p>{label("Reach readers across Punjab. Get in touch about government and business advertising.","पंजाब के पाठकों तक पहुँचें। सरकारी और व्यावसायिक विज्ञापनों के लिए संपर्क करें।","ਪੰਜਾਬ ਦੇ ਪਾਠਕਾਂ ਤੱਕ ਆਪਣੀ ਗੱਲ ਪਹੁੰਚਾਓ। ਸਰਕਾਰੀ ਅਤੇ ਕਾਰੋਬਾਰੀ ਇਸ਼ਤਿਹਾਰਾਂ ਲਈ ਸੰਪਰਕ ਕਰੋ।")}</p>{link("advertise","Advertise with us →","विज्ञापन दें →","ਸਾਡੇ ਨਾਲ ਇਸ਼ਤਿਹਾਰ ਦਿਓ →")}</div></div></div></div>
<div class="pn-legal"><div><small>© 2026 PrimezNews · {label("A digital news portal operated by SHARVIX Studio.","SHARVIX Studio द्वारा संचालित डिजिटल समाचार पोर्टल।","SHARVIX Studio ਵੱਲੋਂ ਚਲਾਇਆ ਜਾਂਦਾ ਡਿਜੀਟਲ ਖ਼ਬਰ ਪੋਰਟਲ।")}</small><div>{''.join(link(*row) for row in policies)}{tools}</div></div></div></footer>'''

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
