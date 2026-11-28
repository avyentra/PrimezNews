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
    [category('Agriculture'),'ਖੇਤੀਬਾੜੀ','कृषि','Agriculture'],
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
  root.innerHTML = `<style>:host{display:block;position:relative;z-index:15;color:#201e1c;background:white;font:600 16px/1.35 "Noto Sans Gurmukhi",system-ui,sans-serif}*{box-sizing:border-box}nav,.wire>div,.market>div{max-width:1380px;margin:auto;padding:0 16px}nav{position:relative;display:flex;align-items:center;gap:9px;min-height:56px}a,button{font:inherit;color:inherit;text-decoration:none}button{cursor:pointer;background:white;border:1px solid #ded7ce;border-radius:7px;min-height:40px;padding:5px 13px}#sections{display:flex;align-items:stretch;flex:1;justify-content:space-between}#sections a{display:grid;place-items:center;position:relative;min-height:54px;padding:0 clamp(4px,.8vw,15px);white-space:nowrap}#sections a:first-child{font:700 26px system-ui}#sections a:not(:last-child):after{content:"";position:absolute;right:-4px;top:36%;height:14px;border-right:1px solid #d8d0c4}a:hover{color:#986300}.live{padding:8px 10px;border-radius:6px;color:white;background:#be1634;font:700 15px system-ui}.live:hover{color:white;background:#990e29}.more[aria-expanded=true]{border-color:#dfa52e;background:#fff2d8}.search{display:grid;place-items:center;width:42px;padding:0}.mobile,[hidden]{display:none!important}#panel{position:absolute;z-index:2;top:calc(100% + 4px);right:68px;width:min(640px,94vw);background:white;border:1px solid #ded8cf;box-shadow:0 14px 34px #17233729;border-radius:12px;overflow:hidden}.cols{display:grid;grid-template-columns:1fr 1fr}.cols section{padding:14px 20px}.cols section+section{border-left:1px solid #eee7dd}.cols strong,footer a{color:#9e650b;font-size:14px}.cols a{display:flex;align-items:center;gap:12px;padding:9px 0;min-height:55px}.cols i{display:grid;place-items:center;font:21px system-ui;color:#af7009;background:#fbefd9;width:38px;height:38px;border-radius:8px;flex:none}.cols small{display:block;color:#6f6b66;font-size:12px;font-weight:400}footer{display:flex;justify-content:space-between;padding:12px 20px;background:#f7f4ef;border-top:1px solid #eee7dd}.wire{border-block:1px solid #e6ded4}.wire>div,.headlines,.market>div{display:flex;align-items:center}.wire>div{gap:16px;min-height:44px}.wire b{background:#bf1431;color:white;padding:5px 20px 5px 13px;white-space:nowrap;clip-path:polygon(0 0,100% 0,94% 100%,0 100%)}.headlines{min-width:0;gap:20px;overflow-x:auto;scrollbar-width:none}.headlines a{white-space:nowrap;font-size:14px;font-weight:450;color:#57534d}.headlines a:before{content:"•";color:#bc1530;margin-right:8px}.market{background:#0d1832;color:#dbe1e9}.market>div{min-height:36px;justify-content:space-between;font-size:14px;font-weight:450}.market b,.market a{color:#f9c650}:focus-visible{outline:2px solid #ae7800;outline-offset:-2px}@media(max-width:1100px){.mobile{display:block!important;margin-right:auto}#sections{display:none}.mobile[aria-expanded=true]+#sections{position:absolute;display:grid;grid-template-columns:repeat(2,1fr);top:100%;left:0;right:0;z-index:3;background:white;border:1px solid #e5ded3;box-shadow:0 12px 18px #11203922}#sections a{justify-content:start;padding-left:18px}#sections a:after{display:none}#panel{right:12px}.wire>div{min-height:40px}}@media(max-width:600px){nav,.market>div,.wire>div{padding-inline:10px}.market>div{font-size:11px}.wire b{font-size:13px}.cols section{padding:12px}.cols a{gap:7px}.cols small{font-size:11px}.cols i{width:28px;height:30px}.cols b{font-size:14px}#panel{width:calc(100% - 16px);right:8px}.cols a{min-height:59px}}.market>div{gap:8px 14px;padding-block:5px}.market .quote{white-space:nowrap}.market .quote-source{display:block;font-size:11px;color:#c9d4e2}@media(max-width:700px){.market>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 8px}.market strong{grid-column:1/3}.market>div>a{grid-column:3;grid-row:1;text-align:right}.market .quote{grid-row:2;white-space:normal}.market .quote b{display:block}.market .quote-source{font-size:10px}}  .headlines.moving{overflow:hidden;flex:1;-webkit-mask:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);mask:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}.headlines .marquee{display:inline-flex;gap:0;white-space:nowrap;animation:pn-marquee var(--dur,40s) linear infinite;will-change:transform}.headlines.moving:hover .marquee,.headlines.moving:focus-within .marquee{animation-play-state:paused}.headlines .marquee a{margin-right:28px}@keyframes pn-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(prefers-reduced-motion:reduce){.headlines .marquee{animation-duration:calc(var(--dur,40s)*2)}}  :host(:not([data-lang="en"])) #sections a:not(:first-child):not(.live){font-weight:500;letter-spacing:.1px;color:#24211e}  #sections a[aria-current="page"]{color:#b4232a!important;box-shadow:inset 0 -3px 0 #d9ad4e}
.cols section.compact{display:grid;grid-template-columns:1fr 1fr;column-gap:10px;align-content:start}.cols section.compact strong{grid-column:1/-1}.cols section.compact small{display:none}.cols section.compact a{min-height:46px;padding:5px 0}.cols section.compact b{font-size:13px}

:host(.compact-nav){background:#051e44}
:host(.compact-nav) nav{background:#051e44;max-width:1780px;min-height:76px;gap:clamp(8px,1vw,20px);padding-inline:clamp(12px,2vw,36px);color:white}
/* Extend the navy band beyond the centered navigation on wide screens. */
:host(.compact-nav) nav::before{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:0 0 0 100vmax #051e44;clip-path:inset(0 -100vmax)}
:host(.compact-nav) nav .mobile{display:block!important;margin:0;border:0;background:none;color:white;font-size:25px;padding:4px}
:host(.compact-nav) .mobile span{display:none}
:host(.compact-nav) #sections{display:none}
:host(.compact-nav) .mobile[aria-expanded=true]+#sections{position:absolute;display:grid;grid-template-columns:repeat(2,1fr);top:100%;left:12px;right:auto;width:min(420px,94vw);z-index:4;background:white;color:#152238;box-shadow:0 8px 24px #07132630;border-radius:8px}
.brand img{display:block;width:clamp(124px,11.8vw,197px);height:auto}
.primary{display:flex;flex:1;align-items:center;justify-content:space-evenly;gap:8px}
.primary>a,.primary summary{color:white;white-space:nowrap;padding:16px 0}
.primary [aria-current=page]{box-shadow:inset 0 -4px #ed172c}
.primary details{position:relative}
.primary summary{cursor:pointer;list-style:none}
.primary summary::-webkit-details-marker{display:none}
.primary summary,.more{display:inline-flex;align-items:center;gap:6px}
.primary summary::after,.more::after{
  content:"";
  width:12px;
  height:12px;
  flex:none;
  background:currentColor;
  mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='m2 4 4 4 4-4' stroke='black' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;
}
.primary details[open]>summary::after,.more[aria-expanded=true]::after{transform:rotate(180deg)}
.primary details>div{position:absolute;top:100%;min-width:190px;z-index:3;background:white;color:#172132;border:1px solid #dde2ea;border-radius:8px;box-shadow:0 8px 24px #07132624;padding:6px}
.primary details a,.primary details small{display:block;padding:8px 12px}
.primary details small{color:#607084}
.primary details a:hover{background:#f3f5f9}
:host(.compact-nav) #panel,:host(.compact-nav) .search,:host(.compact-nav) .more{color:#142237}
:host(.compact-nav) .wire{background:white;padding:14px 0;border:0}
:host(.compact-nav) .wire>div{width:90%;max-width:1670px;border-radius:30px;background:#c80814;color:white;gap:16px;min-height:42px;overflow:hidden}
:host(.compact-nav) .wire b{background:none;clip-path:none;border-right:1px solid #ffffff90;font:italic 800 clamp(13px,1.45vw,23px)/1 system-ui;padding:2px 16px 2px 4px}
:host(.compact-nav) .headlines a{color:white;font-weight:650}
:host(.compact-nav) .headlines a:before{color:white}
@media(max-width:1100px){.primary{display:none}.brand{margin-right:auto}:host(.compact-nav) nav{min-height:62px}}
@media(max-width:600px){:host(.compact-nav) nav{gap:6px;padding-inline:8px}.brand img{width:clamp(96px,26vw,132px)}:host(.compact-nav) .more,:host(.compact-nav) .live{padding-inline:6px}:host(.compact-nav) .wire>div{width:96%}}
@media(prefers-reduced-motion:reduce){:host(.compact-nav) .headlines .marquee{animation:none}:host(.compact-nav) .headlines{overflow-x:auto}}
.planned-countries{grid-column:1/-1;padding:8px 16px;border-top:1px solid #e3e6ed;font-size:13px;color:#536177}@media(max-width:760px){:host(.compact-nav) #panel{max-height:70vh;overflow-y:auto}}

:host(.compact-nav:is([data-lang="hi"], [data-lang="pa"])) :is(.primary, #sections, .more, #panel) {
  font-size: 15px;
  line-height: 1.45;
}
:host(.compact-nav:is([data-lang="hi"], [data-lang="pa"])) .headlines a {
  font-size: 13.5px;
  line-height: 1.5;
}
  :host(.compact-nav) nav > :is(button, .live),
  :host(.compact-nav) .primary :is(a, summary) {
    min-inline-size: 44px;
    min-block-size: 44px;
    justify-content: center;
  }
  :host(.compact-nav) .primary > a {
    display: inline-flex;
    align-items: center;
  }
</style><nav><button class="mobile" aria-expanded="false" aria-controls="sections">☰ <span></span></button><div id="sections"></div><a class="live" href="news/">◉ LIVE</a><button class="more" aria-controls="panel" aria-expanded="false"></button><button class="search" aria-label="Search" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></button><div id="panel" hidden><div class="cols"></div><footer></footer></div></nav><div class="wire"><div><b></b><div class="headlines"></div></div></div><div class="market"><div></div></div>`;
  const q = s => root.querySelector(s);
  const locale = () => ['pa','hi','en'].includes(document.documentElement.lang) ? document.documentElement.lang : 'pa';
  const t = (...words) => words[['pa','hi','en'].indexOf(locale())];
  function anchor(url, text) {
    const a=document.createElement('a'); a.href=url; a.textContent=text; return a;
  }
  const mobile=q('.mobile'), trigger=q('.more'), panel=q('#panel');
  const masthead = document.querySelector('.pn-header:has(.pn-logo):has(.pn-topline)');
  const groups = [
    [sections[5].slice(1), [sections[5], [category('National'),'ਦੇਸ਼','देश','National']]],
    [['ਦੇਸ਼','देश','India'], [[category('National'),'ਦੇਸ਼','देश','National'], ['sarkari-yojana','ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ','सरकारी योजनाएँ','Government schemes']]],
    [['ਦੁਨੀਆ','दुनिया','World'], [[category('World'),'ਅੰਤਰਰਾਸ਼ਟਰੀ','अंतरराष्ट्रीय','International'], sections[7]]],
    [sections[7].slice(1), [sections[7]], ['Canada','UK','Australia','USA','UAE']],
    [['ਲਾਈਫਸਟਾਈਲ','लाइफ़स्टाइल','Lifestyle'], [sections[6], ['health-blog/','ਸਿਹਤ ਬਲੌਗ','हेल्थ ब्लॉग','Health blog'], sections[3], ['dharm','ਆਸਥਾ ਤੇ ਸੱਭਿਆਚਾਰ','आस्था व संस्कृति','Faith & culture']]]
  ];
  const primary = document.createElement('div');
  primary.className = 'primary';
  let quick, clock;
  if (masthead) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'assets/css/masthead.css?v=3';
    document.head.append(style);
    masthead.classList.add('pn-compact');
    host.classList.add('compact-nav');
    const brand = masthead.querySelector('.pn-logo').cloneNode(true);
    brand.className = 'brand';
    q('#sections').after(brand, primary);
    quick = document.createElement('div');
    quick.className = 'pn-quick';
    clock = document.createElement('time');
    const line = masthead.querySelector('.pn-topline');
    line.prepend(clock, quick);
    function updateClock() {
      clock.textContent = new Intl.DateTimeFormat('en-US',{month:'short', day:'numeric', year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date()) + ' | ' + new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date()) + ' IST';
    }
    updateClock();
    setInterval(updateClock,60000);
  }
  function closeGroups(except) {
    primary.querySelectorAll('details[open]').forEach(item => { if(item !== except) item.open = false; });
  }
  function renderPrimary() {
    if (!quick) return;
    const link = ([url,...names]) => anchor(url,t(...names));
    quick.replaceChildren(anchor('./','PrimezNews'), ...[sections[1],sections[2],sections[5],groups[2][1][0],sections[7],sections[8]].map(link));
    primary.replaceChildren(anchor('./',t('ਹੋਮ','होम','Home')),link(sections[1]),link(sections[2]));
    if(location.pathname === '/' || location.pathname === '/index.html') primary.firstChild.setAttribute('aria-current','page');
    for(const [names,items,future] of groups) {
      const group = document.createElement('details'), title = document.createElement('summary'), box = document.createElement('div');
      title.textContent = t(...names);
      box.append(...items.map(link));
      for(const country of future || []) {
        const planned = document.createElement('small');
        planned.textContent = country + ' · ' + t('ਜਲਦੀ','जल्द','Coming soon');
        box.append(planned);
      }
      group.append(title,box);
      group.ontoggle = () => { if(group.open) {closeGroups(group); setMore(false); mobile.setAttribute('aria-expanded','false');} };
      primary.append(group);
    }
  }
  primary.addEventListener('focusout',e=>{if(!primary.contains(e.relatedTarget))closeGroups();});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){const current=primary.querySelector('details[open]');if(current){current.open=false;current.querySelector('summary').focus();}}});
  document.addEventListener('click',e=>{if(!e.composedPath().includes(primary))closeGroups();});
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
  {const fs=document.getElementById('searchOpen');if(fs && !document.querySelector('#searchInput,#readerSearchInput'))fs.addEventListener('click',()=>{location.href=search('');});}
  window.addEventListener('load',()=>{const term=new URLSearchParams(location.search).get('headerSearch');if(term!==null && document.querySelector('#searchInput'))showSearch(term);});
  function render(){
    const lang=locale();
    const date=document.querySelector('#pn-date');
    if(date)date.textContent=pnDate(new Date(),lang,false);
    mobile.querySelector('span').textContent=t('ਮੀਨੂ','मेन्यू','Menu');trigger.textContent=t('ਹੋਰ','और','More');
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
    if (masthead) {
      const countries = document.createElement('div');
      countries.className = 'planned-countries';
      countries.textContent = t('NRI ਖ਼ਬਰਾਂ · ਜਲਦੀ','NRI खबरें · जल्द','NRI News · Coming soon') + ' — ' + groups[3][2].join(', ');
      q('.cols').append(countries);
    }
    q('footer').replaceChildren(anchor('contact',t('ਆਪਣੀ ਖ਼ਬਰ ਭੇਜੋ','अपनी खबर भेजें','Tell your story')+' →'),anchor('advertise',t('ਇਸ਼ਤਿਹਾਰ ਦਿਓ','विज्ञापन दें','Advertise')+' →'));
    q('.wire b').textContent=t('ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ','ताज़ा खबरें','Latest news');
    renderPrimary();
    if (masthead) q('.wire b').textContent='BREAKING NEWS';
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
    host.replaceChildren(city,...items,anchor('mandi-bhav',t('ਮੰਡੀ ਭਾਅ ਪੜ੍ਹੋ','मंडी भाव देखें','Market rates')+' →'));
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
