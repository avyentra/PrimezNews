// Public masthead controls. Relative links resolve through the article template's base.
/* Punjabi month names: some browsers print "M11" for pa-IN, so format dates ourselves */
const PN_MONTHS={pa:['ਜਨਵਰੀ','ਫ਼ਰਵਰੀ','ਮਾਰਚ','ਅਪ੍ਰੈਲ','ਮਈ','ਜੂਨ','ਜੁਲਾਈ','ਅਗਸਤ','ਸਤੰਬਰ','ਅਕਤੂਬਰ','ਨਵੰਬਰ','ਦਸੰਬਰ'],hi:['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
function pnDate(d,lang,short){const ist=new Date(d.getTime()+(d.getTimezoneOffset()+330)*60000);const m=(PN_MONTHS[lang]||PN_MONTHS.pa)[ist.getMonth()];return ist.getDate()+' '+(short&&lang==='en'?m.slice(0,3):m)+' '+ist.getFullYear();}
(() => {
  const host = document.querySelector('primez-site-nav');
  if (!host) return;
  const root = host.attachShadow({mode:'open'});
  const home = './', category = key => 'home-v2?category=' + key;
  const search = term => home + '?headerSearch=' + encodeURIComponent(term);
  const sections = [
    [home,'⌂','⌂','⌂'], [category('Punjab'),'ਪੰਜਾਬ','पंजाब','Punjab'],
    [category('Agriculture'),'ਖੇਤੀਬਾੜੀ','कृषि','Agriculture'],['jobs','ਰੁਜ਼ਗਾਰ','रोज़गार','Jobs'],
    ['rashi','ਰਾਸ਼ੀਫਲ','राशिफल','Horoscope'],[category('Sports'),'ਖੇਡਾਂ','खेल','Sports'],
    [category('Politics'),'ਸਿਆਸਤ','राजनीति','Politics'],['health-beauty','ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ','स्वास्थ्य व सौंदर्य','Health & Beauty'],
    ['nri','NRI ਖ਼ਬਰਾਂ','NRI खबरें','NRI News'],['videos','ਵੀਡੀਓ','वीडियो','Video']
  ];
  const more = [
    ['health-blog/','✚','ਸਿਹਤ ਬਲੌਗ','हेल्थ ब्लॉग','Health blog','ਤੰਦਰੁਸਤੀ, ਖੁਰਾਕ ਤੇ ਸੁੰਦਰਤਾ ਦੇ ਲੇਖ','सेहत, आहार व सौंदर्य के लेख','Fitness, food and beauty reads'],
    ['mandi-bhav','▥','ਮੰਡੀ ਭਾਅ','मंडी भाव','Market rates','ਅੱਜ ਦੇ ਫ਼ਸਲਾਂ ਦੇ ਰੇਟ','आज के फसल भाव','Crop prices'],
    ['hukamnama','▤','ਹੁਕਮਨਾਮਾ','हुकमनामा','Hukamnama','ਸ੍ਰੀ ਦਰਬਾਰ ਸਾਹਿਬ ਤੋਂ','श्री दरबार साहिब से','From Sri Darbar Sahib'],
    ['sarkari-yojana','⌂','ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ','सरकारी योजनाएँ','Government schemes','ਸਕੀਮਾਂ ਅਤੇ ਅਪਲਾਈ ਕਰਨ ਦਾ ਤਰੀਕਾ','योजनाएँ और आवेदन','Schemes and applications'],
    [category('Education'),'◇','ਸਿੱਖਿਆ','शिक्षा','Education','ਸਕੂਲ, ਕਾਲਜ ਅਤੇ ਨਤੀਜੇ','स्कूल, कॉलेज और नतीजे','Schools, colleges and results'],
    [category('Crime'),'⬡','ਅਪਰਾਧ ਤੇ ਸੁਰੱਖਿਆ','अपराध व सुरक्षा','Crime & Safety','ਪੁਲਿਸ ਅਤੇ ਅਦਾਲਤ ਦੀਆਂ ਖ਼ਬਰਾਂ','पुलिस और अदालत की खबरें','Police and court news'],
    ['dharm','♧','ਆਸਥਾ ਤੇ ਸੱਭਿਆਚਾਰ','आस्था व संस्कृति','Faith & Culture','ਗੁਰਪੁਰਬ, ਤਿਉਹਾਰ ਅਤੇ ਵਿਰਾਸਤ','पर्व, त्योहार और विरासत','Festivals and heritage'],
    [category('Business'),'₹','ਵਪਾਰ','व्यापार','Business','ਬਾਜ਼ਾਰ, ਉਦਯੋਗ ਤੇ ਕਾਰੋਬਾਰ','बाज़ार, उद्योग और कारोबार','Markets, industry and trade'],
    [category('National'),'◎','ਦੇਸ਼','देश','National','ਦੇਸ਼ ਭਰ ਦੀਆਂ ਵੱਡੀਆਂ ਖ਼ਬਰਾਂ','देश भर की बड़ी खबरें','Top stories from India'],
    [category('World'),'◍','ਦੁਨੀਆ','दुनिया','World','ਵਿਦੇਸ਼ਾਂ ਦੀਆਂ ਖ਼ਬਰਾਂ','विदेश की खबरें','News from abroad'],
    [category('Entertainment'),'✦','ਮਨੋਰੰਜਨ','मनोरंजन','Entertainment','ਫ਼ਿਲਮਾਂ, ਸੰਗੀਤ ਤੇ ਕਲਾਕਾਰ','फ़िल्में, संगीत और कलाकार','Films, music and artists'],
    [category('Weather'),'☁','ਮੌਸਮ','मौसम','Weather','ਮੀਂਹ, ਠੰਢ ਤੇ ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ','बारिश, ठंड और मौसम की जानकारी','Rain, cold and forecasts'],
    [category('Technology'),'⌘','ਤਕਨੀਕ','तकनीक','Technology','ਫ਼ੋਨ, ਇੰਟਰਨੈੱਟ ਤੇ ਨਵੀਂ ਤਕਨੀਕ','फ़ोन, इंटरनेट और नई तकनीक','Phones, internet and new tech']
  ];
  root.innerHTML = `<link rel="stylesheet" href="assets/css/public-navigation.css?v=20261118a"><nav><button class="mobile" aria-expanded="false" aria-controls="sections">☰ <span></span></button><div id="sections"></div><a class="live" href="news/">◉ LIVE</a><button class="more" aria-controls="panel" aria-expanded="false"></button><button class="search" aria-label="Search" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></button><div id="panel" hidden><div class="cols"></div><footer></footer></div></nav><div class="wire"><div><b></b><div class="headlines"></div></div></div><div class="market"><div></div></div>`;
  const q = s => root.querySelector(s);
  const locale = () => ['pa','hi','en'].includes(document.documentElement.lang) ? document.documentElement.lang : 'pa';
  const t = (...words) => words[['pa','hi','en'].indexOf(locale())];
  function anchor(url, text) {
    const a=document.createElement('a'); a.href=url; a.textContent=text; return a;
  }
  const mobile=q('.mobile'), trigger=q('.more'), panel=q('#panel');
  let closeTimer;
  function setMore(open) {
    clearTimeout(closeTimer);
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) mobile.setAttribute('aria-expanded','false');
  }
  function close() {
    setMore(false);
    mobile.setAttribute('aria-expanded','false');
  }
  for (const part of [trigger, panel]) {
    part.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') setMore(true);
    });
    part.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') {
        closeTimer = setTimeout(() => {
          if (!panel.contains(root.activeElement)) setMore(false);
        }, 180);
      }
    });
  }
  root.addEventListener('focusout', event => {
    if (event.relatedTarget !== trigger && !panel.contains(event.relatedTarget)) setMore(false);
  });
  trigger.onclick = event => {
    const mouseHover = event.detail > 0 && matchMedia('(hover: hover)').matches && event.pointerType !== 'touch';
    setMore(mouseHover || panel.hidden);
  };
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMore(true);
      panel.querySelector('a')?.focus();
    }
  });
  mobile.onclick=()=>{const open=mobile.getAttribute('aria-expanded')==='false';close();mobile.setAttribute('aria-expanded',String(open));};
  document.addEventListener('click',e=>{if(!e.composedPath().includes(host))close();});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!panel.hidden||mobile.getAttribute('aria-expanded')==='true')){const focus=panel.hidden?mobile:trigger;close();focus.focus();}});
  function showSearch(term=''){
    const opener=document.querySelector('#searchOpen'), input=document.querySelector('#searchInput,#readerSearchInput');
    if(!opener || !input){location.href=search(term);return;}
    opener.click();input.value=term;input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  q('.search').onclick=()=>showSearch();
  window.addEventListener('load',()=>{const term=new URLSearchParams(location.search).get('headerSearch');if(term!==null && document.querySelector('#searchInput'))showSearch(term);});
  function render(){
    const lang=locale();
    const date=document.querySelector('#pn-date');
    if(date)date.textContent=pnDate(new Date(),lang,false);
    mobile.querySelector('span').textContent=t('ਮੀਨੂ','मेन्यू','Menu');trigger.textContent=t('ਹੋਰ','और','More')+' ⌄';
    const links=sections.map(([url,...names])=>anchor(url,t(...names)));links[0].setAttribute('aria-label',t('ਮੁੱਖ ਪੰਨਾ','होम','Home'));
    q('#sections').replaceChildren(...links);
    q('.cols').replaceChildren();
    for(let n=0;n<2;n++){
      const col=document.createElement('section'),heading=document.createElement('strong');
      heading.textContent=n?t('ਹੋਰ ਸ਼੍ਰੇਣੀਆਂ','अन्य श्रेणियाँ','More sections'):t('ਰੋਜ਼ਾਨਾ ਜਾਣਕਾਰੀ','रोज़ाना जानकारी','Daily information');col.append(heading);
      if(n)col.className='compact';   // 'More sections' holds every other category in a compact 2-column grid
      for(const [url,icon,pa,hi,en,...desc] of (n?more.slice(3):more.slice(0,3))){
        const a=anchor(url,''),symbol=document.createElement('i'),name=document.createElement('b'),detail=document.createElement('small');
        symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');name.textContent=t(pa,hi,en);detail.textContent=t(...desc);name.append(detail);a.append(symbol,name);col.append(a);
      }
      q('.cols').append(col);
    }
    q('footer').replaceChildren(anchor('contact',t('ਆਪਣੀ ਖ਼ਬਰ ਭੇਜੋ','अपनी खबर भेजें','Tell your story')+' →'),anchor('advertise',t('ਇਸ਼ਤਿਹਾਰ ਦਿਓ','विज्ञापन दें','Advertise')+' →'));
    q('.wire b').textContent=t('ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ','ताज़ा खबरें','Latest news');
    renderRates();
    renderHeadlines();
  }
  let stories=[];
  function renderHeadlines(){
    /* ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ: headlines move right → left (marquee); hover pauses */const box=q('.headlines'),list=stories.slice(0,8),make=(dup)=>list.map(s=>{const a=anchor('news/'+encodeURIComponent(s.slug)+'/',s[locale()]||s.title||s.pa);if(dup){a.tabIndex=-1;a.setAttribute('aria-hidden','true')}return a});if(list.length){const track=document.createElement('span');track.className='marquee';track.append(...make(false),...make(true));box.replaceChildren(track);box.classList.add('moving');requestAnimationFrame(()=>{const w=track.scrollWidth/2;track.style.setProperty('--dur',Math.max(20,Math.round(w/60))+'s')})}else{box.classList.remove('moving');box.replaceChildren()}
    if(!stories.length)q('.headlines').append(anchor('news/',t('ਸਾਰੀਆਂ ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ ਪੜ੍ਹੋ','सभी ताज़ा खबरें पढ़ें','Read the latest news')));
  }
  const weather = document.querySelector('#pn-temperature');
  if(weather){
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.73&longitude=76.78&current=temperature_2m')
      .then(r=>r.ok?r.json():null).then(data=>{
        const value=data?.current?.temperature_2m;
        if(Number.isFinite(value))weather.textContent=Math.round(value)+'°';
      }).catch(()=>{});
  }
  const cacheKey='primez.chandigarh-rates.v1';
  let rates={};
  try { rates=JSON.parse(localStorage.getItem(cacheKey)) || {}; } catch {}
  function renderRates(){
    const host=q('.market div');
    const city=document.createElement('strong');
    city.textContent=t('ਚੰਡੀਗੜ੍ਹ','चंडीगढ़','Chandigarh');
    const labels={
      gold:t('ਸੋਨਾ 24K','सोना 24K','Gold 24K'),
      petrol:t('ਪੈਟਰੋਲ','पेट्रोल','Petrol'),
      diesel:t('ਡੀਜ਼ਲ','डीज़ल','Diesel')
    };
    const formatter=new Intl.NumberFormat(locale()+'-IN',{numberingSystem:'latn'});
    const dateFormat={format:d=>pnDate(d,locale(),true)};
    const items=Object.entries(labels).map(([kind,label])=>{
      const quote=rates[kind],cell=document.createElement('span'),price=document.createElement('b');
      cell.className='quote';cell.append(label+' ',price);
      if(!quote || !Number.isFinite(quote.price) || !quote.date || !Number.isFinite(Date.parse(quote.date))){
        price.textContent=t('ਰੇਟ ਦੀ ਉਡੀਕ','दर की प्रतीक्षा','Awaiting rate');return cell;
      }
      const unit=kind==='gold'?t('10 ਗ੍ਰਾਮ','10 ग्राम','10 g'):t('ਲੀਟਰ','लीटर','L');
      price.textContent='₹'+formatter.format(quote.price)+'/'+unit;
      const source=anchor(quote.source,dateFormat.format(new Date(quote.date))+' · Goodreturns');
      source.className='quote-source';cell.append(source);
      return cell;
    });
    host.replaceChildren(city,...items,anchor(more[0][0],t('ਮੰਡੀ ਭਾਅ ਪੜ੍ਹੋ','मंडी भाव देखें','Market rates')+' →'));
  }
  async function refreshRates(){
    try {
      const response=await fetch('data/market-rates.json',{cache:'no-cache'});
      if(!response.ok)return;
      const snapshots=await response.json();
      for(const key of ['gold','petrol','diesel']){
        const value=snapshots[key];
        if(value?.price>0 && Number.isFinite(value.price) && /^https:\/\/www\.goodreturns\.in\//.test(value.source)
           && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && value.date>=(rates[key]?.date||''))rates[key]=value;
      }
      renderRates();
      try { localStorage.setItem(cacheKey,JSON.stringify(rates)); } catch {}
    } catch { /* Keep the last dated rates if offline. */ }
  }
  refreshRates();
  setInterval(()=>{if(!document.hidden)refreshRates();},15*60*1000);
  let renderedLanguage = locale();
  render();
  new MutationObserver(() => {
    if (locale() !== renderedLanguage) {
      renderedLanguage = locale();
      render();
    }
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  fetch('data/header-news.json').then(r=>r.ok?r.json():[]).then(rows=>{stories=rows;renderHeadlines();}).catch(()=>{});
})();

/* Nav: mark page language on the component so Punjabi/Hindi menu can match English look */
(()=>{const set=()=>{const l=['pa','hi','en'].includes(document.documentElement.lang)?document.documentElement.lang:'pa';document.querySelectorAll('primez-site-nav').forEach(n=>n.setAttribute('data-lang',l))};set();document.addEventListener('DOMContentLoaded',set);new MutationObserver(set).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})})();

/* Menu: highlight the section you are on (font size never changes; underline only) */
(()=>{const clean=p=>(p||'/').replace(/index\.html$/,'').replace(/\.html$/,'').replace(/\/+$/,'')||'/';
const here=()=>{let p=clean(location.pathname);if(/\/health-blog(\/|$)/.test(p))p=p.replace(/\/health-blog.*$/,'/health-beauty');return p};
function mark(nav){const root=nav.shadowRoot;if(!root)return;const cur=here();root.querySelectorAll('#sections a[href], .more-panel a[href], [role="menu"] a[href]').forEach(a=>{let u;try{u=new URL(a.getAttribute('href'),document.baseURI)}catch{return}if(u.origin!==location.origin||u.search||u.hash)return;const on=clean(u.pathname)!=='/'&&clean(u.pathname)===cur;if(on)a.setAttribute('aria-current','page');else if(a.getAttribute('aria-current')==='page')a.removeAttribute('aria-current')})}
function watch(nav){if(nav.__pnMark)return;nav.__pnMark=true;mark(nav);if(nav.shadowRoot)new MutationObserver(()=>mark(nav)).observe(nav.shadowRoot,{childList:true,subtree:true})}
document.querySelectorAll('primez-site-nav').forEach(watch)})();

/* Super Admin site settings (backend/super-admin.sql). Fail-safe: no settings, no table or no network = site stays exactly as before. */
(()=>{const KEY='primez.siteSettings',TTL=300000;
function cached(){try{const c=JSON.parse(sessionStorage.getItem(KEY)||'null');return c&&Date.now()-c.t<TTL?c.v:null}catch{return null}}
async function load(){const c=cached();if(c)return c;const cfg=window.PRIMEZ_BACKEND;if(!cfg||!cfg.url||!cfg.publicKey)return{};
 const r=await fetch(cfg.url+'/rest/v1/site_settings?select=key,value&is_public=eq.true',{headers:{apikey:cfg.publicKey}});
 const v={};if(r.ok){const rows=await r.json();if(Array.isArray(rows))rows.forEach(x=>{if(x&&typeof x.key==='string')v[x.key]=x.value})}
 try{sessionStorage.setItem(KEY,JSON.stringify({t:Date.now(),v}))}catch{}return v}
function apply(s){
 const hide=Array.isArray(s.menu_hidden)?s.menu_hidden.filter(h=>typeof h==='string'):[];
 if(hide.length)document.querySelectorAll('primez-site-nav').forEach(nav=>{const go=()=>{const root=nav.shadowRoot;if(!root)return;root.querySelectorAll('a[href]').forEach(a=>{if(hide.includes(a.getAttribute('href'))){const item=a.closest('li')||a;item.style.display='none'}})};go();if(nav.shadowRoot)new MutationObserver(go).observe(nav.shadowRoot,{childList:true,subtree:true})});
 if(s.ticker_enabled===false){const t=document.getElementById('ticker');if(t)(t.closest('.briefing')||t).style.display='none'}
 if(s.journalist_signups===false)document.querySelectorAll('a[href^="join-newsroom"]:not([href*="#review"])').forEach(a=>{a.style.display='none'});
 const n=s.site_notice;if(n&&n.on===true&&!document.getElementById('primezSiteNotice')){const bar=document.createElement('div');bar.id='primezSiteNotice';bar.setAttribute('role','status');bar.style.cssText='background:#14233a;color:#fff;text-align:center;padding:9px 16px;font:600 14px/1.45 system-ui,"Noto Sans Gurmukhi",sans-serif';
  const text=()=>{const l=(document.documentElement.lang||'pa').slice(0,2);bar.textContent=String(n[l]||n.pa||n.en||n.hi||'').slice(0,200)};text();if(bar.textContent){document.body.prepend(bar);new MutationObserver(text).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}}}
function run(){load().then(apply).catch(()=>{})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run()})();
