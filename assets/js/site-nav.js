// Public masthead controls. Relative links resolve through the article template's base.
(() => {
  const host = document.querySelector('primez-site-nav');
  if (!host) return;
  const root = host.attachShadow({mode:'open'});
  const home = 'index.html', category = key => 'home-v2.html?category=' + key;
  const search = term => home + '?headerSearch=' + encodeURIComponent(term);
  const sections = [
    [home,'⌂','⌂','⌂'], [category('Punjab'),'ਪੰਜਾਬ','पंजाब','Punjab'],
    [category('Agriculture'),'ਖੇਤੀਬਾੜੀ','कृषि','Agriculture'],['https://www.pgrkam.com/','ਰੁਜ਼ਗਾਰ','रोज़गार','Jobs'],
    ['rashi.html','ਰਾਸ਼ੀਫਲ','राशिफल','Horoscope'],[category('Sports'),'ਖੇਡਾਂ','खेल','Sports'],
    [category('Politics'),'ਸਿਆਸਤ','राजनीति','Politics'],[search('ਸਿਹਤ'),'ਸਿਹਤ ਤੇ ਸੁੰਦਰਤਾ','स्वास्थ्य व सौंदर्य','Health & Beauty'],
    [search('NRI'),'NRI ਖ਼ਬਰਾਂ','NRI खबरें','NRI News'],[home+'#videos','ਵੀਡੀਓ','वीडियो','Video']
  ];
  const more = [
    ['https://agmarknet.gov.in/','▥','ਮੰਡੀ ਭਾਅ','मंडी भाव','Market rates','ਅੱਜ ਦੇ ਫ਼ਸਲਾਂ ਦੇ ਰੇਟ','आज के फसल भाव','Crop prices'],
    ['https://sgpc.net/','▤','ਹੁਕਮਨਾਮਾ','हुकमनामा','Hukamnama','ਸ੍ਰੀ ਦਰਬਾਰ ਸਾਹਿਬ ਤੋਂ','श्री दरबार साहिब से','From Sri Darbar Sahib'],
    ['https://www.myscheme.gov.in/','⌂','ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ','सरकारी योजनाएँ','Government schemes','ਸਕੀਮਾਂ ਅਤੇ ਅਪਲਾਈ ਕਰਨ ਦਾ ਤਰੀਕਾ','योजनाएँ और आवेदन','Schemes and applications'],
    [category('Education'),'◇','ਸਿੱਖਿਆ','शिक्षा','Education','ਸਕੂਲ, ਕਾਲਜ ਅਤੇ ਨਤੀਜੇ','स्कूल, कॉलेज और नतीजे','Schools, colleges and results'],
    [category('Crime'),'⬡','ਅਪਰਾਧ ਤੇ ਸੁਰੱਖਿਆ','अपराध व सुरक्षा','Crime & Safety','ਪੁਲਿਸ ਅਤੇ ਅਦਾਲਤ ਦੀਆਂ ਖ਼ਬਰਾਂ','पुलिस और अदालत की खबरें','Police and court news'],
    ['dharm.html','♧','ਆਸਥਾ ਤੇ ਸੱਭਿਆਚਾਰ','आस्था व संस्कृति','Faith & Culture','ਗੁਰਪੁਰਬ, ਤਿਉਹਾਰ ਅਤੇ ਵਿਰਾਸਤ','पर्व, त्योहार और विरासत','Festivals and heritage']
  ];
  root.innerHTML = `<link rel="stylesheet" href="assets/css/public-navigation.css"><nav><button class="mobile" aria-expanded="false" aria-controls="sections">☰ <span></span></button><div id="sections"></div><a class="live" href="news.html">◉ LIVE</a><button class="more" aria-controls="panel" aria-expanded="false"></button><button class="search" aria-label="Search" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></button><div id="panel" hidden><div class="cols"></div><footer></footer></div></nav><div class="wire"><div><b></b><div class="headlines"></div></div></div><div class="market"><div></div></div>`;
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
    if(date)date.textContent=new Intl.DateTimeFormat(lang+'-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());
    mobile.querySelector('span').textContent=t('ਮੀਨੂ','मेन्यू','Menu');trigger.textContent=t('ਹੋਰ','और','More')+' ⌄';
    const links=sections.map(([url,...names])=>anchor(url,t(...names)));links[0].setAttribute('aria-label',t('ਮੁੱਖ ਪੰਨਾ','होम','Home'));
    q('#sections').replaceChildren(...links);
    q('.cols').replaceChildren();
    for(let n=0;n<2;n++){
      const col=document.createElement('section'),heading=document.createElement('strong');
      heading.textContent=n?t('ਹੋਰ ਸ਼੍ਰੇਣੀਆਂ','अन्य श्रेणियाँ','More sections'):t('ਰੋਜ਼ਾਨਾ ਜਾਣਕਾਰੀ','रोज़ाना जानकारी','Daily information');col.append(heading);
      for(const [url,icon,pa,hi,en,...desc] of more.slice(n*3,n*3+3)){
        const a=anchor(url,''),symbol=document.createElement('i'),name=document.createElement('b'),detail=document.createElement('small');
        symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');name.textContent=t(pa,hi,en);detail.textContent=t(...desc);name.append(detail);a.append(symbol,name);col.append(a);
      }
      q('.cols').append(col);
    }
    q('footer').replaceChildren(anchor('contact.html',t('ਆਪਣੀ ਖ਼ਬਰ ਭੇਜੋ','अपनी खबर भेजें','Tell your story')+' →'),anchor('advertise.html',t('ਇਸ਼ਤਿਹਾਰ ਦਿਓ','विज्ञापन दें','Advertise')+' →'));
    q('.wire b').textContent=t('ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ','ताज़ा खबरें','Latest news');
    renderRates();
    renderHeadlines();
  }
  let stories=[];
  function renderHeadlines(){
    /* ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ: headlines move right → left (marquee); hover pauses */const box=q('.headlines'),list=stories.slice(0,8),make=(dup)=>list.map(s=>{const a=anchor('news/'+encodeURIComponent(s.slug)+'/',s[locale()]||s.title||s.pa);if(dup){a.tabIndex=-1;a.setAttribute('aria-hidden','true')}return a});if(list.length){const track=document.createElement('span');track.className='marquee';track.append(...make(false),...make(true));box.replaceChildren(track);box.classList.add('moving');requestAnimationFrame(()=>{const w=track.scrollWidth/2;track.style.setProperty('--dur',Math.max(20,Math.round(w/60))+'s')})}else{box.classList.remove('moving');box.replaceChildren()}
    if(!stories.length)q('.headlines').append(anchor('news.html',t('ਸਾਰੀਆਂ ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ ਪੜ੍ਹੋ','सभी ताज़ा खबरें पढ़ें','Read the latest news')));
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
    const dateFormat=new Intl.DateTimeFormat(locale()+'-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
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
