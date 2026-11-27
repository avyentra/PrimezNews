/* Published stories occupy the existing hero, never a separate injected block. */
(function(){
 'use strict';
 const api=window.PrimezAPI,model=window.PrimezHomeModel;
 const hero=document.querySelector('.hero-grid');if(!hero||!model)return;
 const seed=stories.slice();let live=[];
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
 const title=s=>typeof heading==='function'?heading(s):s.title||s.en;
 const href=s=>window.PrimezNewsURLs.href(s);
 function photo(s,cls){const img=node('img',undefined,cls);img.decoding='async';img.loading='lazy';img.alt=s.photoCaption||s.en||s.title;img.src=model.image(s);img.addEventListener('error',()=>{if(!img.dataset.fallback){img.dataset.fallback='true';img.src='assets/images/news-farm.webp';}});return img;}
 function link(s,cls){const a=node('a',undefined,cls);a.href=href(s);return a;}
 const category=s=>typeof label==='function'?label(s.category):s.category;
 function date(s){return window.PrimezLocaleFormatting.date(s.published,currentLang,false);}
 /* Time since the news was posted (e.g. "2 ਘੰਟੇ ਪਹਿਲਾਂ"). Stories without a real time (00:00) show days. */
 function ago(s){
  const t=Date.parse(s.published);if(!t)return date(s);
  const L={pa:{m:'ਮਿੰਟ',h1:'ਘੰਟਾ',h:'ਘੰਟੇ',d:'ਦਿਨ',ago:'ਪਹਿਲਾਂ',now:'ਹੁਣੇ',today:'ਅੱਜ',yday:'ਕੱਲ੍ਹ'},
           hi:{m:'मिनट',h1:'घंटा',h:'घंटे',d:'दिन',ago:'पहले',now:'अभी',today:'आज',yday:'कल'},
           en:{m:'min',h1:'hour',h:'hours',d:'days',ago:'ago',now:'Just now',today:'Today',yday:'Yesterday'}}[currentLang]||null;
  const T=L||{m:'ਮਿੰਟ',h1:'ਘੰਟਾ',h:'ਘੰਟੇ',d:'ਦਿਨ',ago:'ਪਹਿਲਾਂ',now:'ਹੁਣੇ',today:'ਅੱਜ',yday:'ਕੱਲ੍ਹ'};
  const diff=Math.max(0,Date.now()-t),min=Math.floor(diff/60000),hr=Math.floor(min/60);
  const midnight=/T00:00(:00)?/.test(String(s.published));
  if(midnight){const day=Math.floor((new Date().setHours(0,0,0,0)-new Date(t).setHours(0,0,0,0))/86400000);
   if(day<=0)return T.today;if(day===1)return T.yday;if(day<7)return day+' '+T.d+' '+T.ago;return date(s);}
  if(min<1)return T.now;if(min<60)return min+' '+T.m+' '+T.ago;
  if(hr<24)return hr+' '+(hr===1?T.h1:T.h)+' '+T.ago;
  const d=Math.floor(hr/24);if(d<7)return d+' '+T.d+' '+T.ago;return date(s);
 }
 /* Lead headline: second half in gold (design) */
 function splitTitle(t){const h=node('h2');const w=String(t||'').split(' ');if(w.length<4){h.textContent=t;return h;}const cut=Math.ceil(w.length*0.55);h.append(document.createTextNode(w.slice(0,cut).join(' ')+' '),node('span',w.slice(cut).join(' '),'hl-accent'));return h;}
 /* Short posting time for the side list: today → 12:45, else date */
 function stamp(s){const t=Date.parse(s.published);if(!t)return date(s);const d=new Date(t),now=new Date();const real=!/T00:00(:00)?/.test(String(s.published));
  if(real&&d.toDateString()===now.toDateString())return d.toLocaleTimeString(currentLang==='en'?'en-IN':'en-GB',{hour:'2-digit',minute:'2-digit',hour12:currentLang==='en'});return date(s);}
 let slideAt=0,slideTimer=0;/* lead slider position survives the 60-second refresh */
 function render(){
  if(new URLSearchParams(location.search).has('story'))return;
  const selected=model.select(live,seed);stories.splice(0,stories.length,...selected,...seed.filter(s=>s.id==="video"));
  if(!selected.length)return;const [lead,...rest]=selected;
  /* Lead slider: newest story first, then more top stories (not the 2 cards beside it). Photo with arrows, headline + "ਪੂਰਾ ਵੇਰਵਾ" below. */
  const slides=[lead,...rest.slice(2,6)].filter(Boolean);if(slideAt>=slides.length)slideAt=0;
  const article=node('article',undefined,'lead-story lead-slider');article.setAttribute('aria-roledescription','carousel');article.setAttribute('aria-label','Top stories');
  const frame=node('div',undefined,'ls-frame');const track=node('div',undefined,'ls-track');
  slides.forEach((s,k)=>{const a=link(s,'ls-slide');a.setAttribute('aria-roledescription','slide');a.setAttribute('aria-label',(k+1)+' / '+slides.length);if(k!==slideAt){a.setAttribute('aria-hidden','true');a.tabIndex=-1;}const img=photo(s);if(k===slideAt){img.loading='eager';img.fetchPriority='high';}const tags=node('span',undefined,'ls-tags');tags.append(node('span',k===0?'SPECIAL REPORT':category(s),'ls-tag'),node('span',s.district,'ls-place'));a.append(img,tags);track.append(a);});
  const icons=node('span',undefined,'ls-icons');icons.setAttribute('aria-hidden','true');icons.innerHTML='<i><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></i><i><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></i>';
  const prev=node('button',undefined,'ls-arrow ls-prev');prev.type='button';prev.setAttribute('aria-label','Previous story');prev.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const next=node('button',undefined,'ls-arrow ls-next');next.type='button';next.setAttribute('aria-label','Next story');next.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const dots=node('div',undefined,'ls-dots');slides.forEach((s,k)=>{const d=node('button');d.type='button';d.setAttribute('aria-label','Story '+(k+1));d.onclick=()=>go(k);dots.append(d);});
  frame.append(track,icons);if(slides.length>1)frame.append(prev,next,dots);article.append(frame);
  const content=node('div',undefined,'ls-content');const headingLink=link(lead,'ls-headline');const byline=node('div',undefined,'ls-foot');const by=node('span',undefined,'ls-by');const more=link(lead,'ls-more');content.append(headingLink,node('p',undefined,'ls-summary'),byline);byline.append(by);article.append(content);const list=node('div',undefined,'ls-list');list.setAttribute('aria-label','More top stories');slides.forEach((s,k)=>{const b=node('button',undefined,'ls-item');b.type='button';const im=photo(s);im.alt='';const t=node('span',title(s));b.append(im,t);b.onclick=()=>go(k,true);list.append(b);});if(slides.length>1)article.append(list);
  function go(k,user){slideAt=(k+slides.length)%slides.length;const s=slides[slideAt];track.style.transform='translateX('+(-100*slideAt)+'%)';[...track.children].forEach((a,n)=>{if(n===slideAt){a.removeAttribute('aria-hidden');a.removeAttribute('tabindex');}else{a.setAttribute('aria-hidden','true');a.tabIndex=-1;}});[...dots.children].forEach((d,n)=>d.setAttribute('aria-current',n===slideAt?'true':'false'));article.querySelectorAll('.ls-item').forEach((b,n)=>{b.hidden=n===slideAt;});headingLink.href=more.href=href(s);headingLink.replaceChildren(splitTitle(title(s)));content.querySelector('.ls-summary').textContent=s.summary||'';by.replaceChildren(node('span','PN','avatar'),node('span',s.author||s.source||'Primez Newsroom'),(()=>{const t=node('small',ago(s));t.setAttribute('data-no-translate','');t.title=date(s);return t;})());if(user)restart();}
  function restart(){clearInterval(slideTimer);if(slides.length>1&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)slideTimer=setInterval(()=>{if(!document.hidden&&!article.matches(':hover,:focus-within'))go(slideAt+1);},6000);}
  prev.onclick=()=>go(slideAt-1,true);next.onclick=()=>go(slideAt+1,true);
  article.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')go(slideAt-1,true);else if(e.key==='ArrowRight')go(slideAt+1,true);});
  let sx=null;frame.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});frame.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>40)go(slideAt+(dx<0?1:-1),true);},{passive:true});
  go(slideAt);restart();
  const secondary=node('div',undefined,'secondary-stories');rest.slice(0,2).forEach(s=>{const card=node('article',undefined,'secondary-card');const cover=link(s,'secondary-image');cover.append(photo(s),node('span',category(s),'category-image'));const h=link(s,'headline-button');h.append(node('h3',title(s)));const foot=node('div',undefined,'card-foot');foot.append(node('span',date(s),'read-time'),node('span',s.author||s.source||'Primez Newsroom','card-author'));card.append(cover,h,node('p',s.summary,'secondary-summary'),foot);secondary.append(card);});
  const aside=node('aside',undefined,'latest-panel side-v2');/* Right column (design): 300x250 ad on top, then ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ list with time */const ad=node('div',undefined,'hero-side-ad');ad.dataset.adSlot='home-hero-side';ad.hidden=true;const box=node('div',undefined,'side-latest');const top=node('div',undefined,'latest-title');top.append(node('h2','Latest news'));const desk=node('div',undefined,'home-news-desk side-list');/* last 5 news by posting time */[...new Map(stories.filter(x=>x&&x.id!=='video').map(x=>[x.id,x])).values()].sort((x,y)=>(Date.parse(y.published)||0)-(Date.parse(x.published)||0)).slice(0,5).forEach(s=>{const a=link(s,'side-row');const tm=node('time',stamp(s));tm.title=date(s);a.append(tm,node('h3',title(s)));desk.append(a);});const all=node('a','Explore all stories →','text-link');all.href='#latest';box.append(top,desk,all);aside.append(ad,box);hero.replaceChildren(article,secondary,aside);
  renderFeed();if(typeof translatePage==='function')translatePage();document.dispatchEvent(new CustomEvent('primez-home-stories'));
 }
 window.PrimezHome={render};render();
 document.querySelectorAll('.language').forEach(el=>el.addEventListener('click',render));document.getElementById('siteLanguage')?.addEventListener('change',render);
 async function refresh(){if(!api?.configured)return;try{const result=await api.publicStories();live=Array.isArray(result)?result:[];render();}catch{/* Keep the last successful result or dated curated briefs. */}}
 refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 /* Ads are re-applied after every render: the home hero box (home-hero-side) is rebuilt on each refresh/language change. */
 let homeAds=[];function applyAds(){for(const ad of homeAds){if(!api.safeUrl(ad.image))continue;const host=[...document.querySelectorAll('[data-ad-slot]')].find(el=>el.dataset.adSlot===ad.slot);if(!host)continue;const label=node('small','Advertisement'),img=node('img');img.decoding='async';img.loading='lazy';img.src=api.safeUrl(ad.image);img.alt='Advertisement';img.style.cssText='display:block;max-width:100%;height:auto';host.replaceChildren(label);if(api.safeUrl(ad.href)){const a=node('a');a.href=api.safeUrl(ad.href);a.rel='sponsored noopener';a.target='_blank';a.append(img);host.append(a);}else host.append(img);host.hidden=false;}}
 document.addEventListener('primez-home-stories',applyAds);
 if(api?.configured)(async()=>{try{const{data,error}=await api.db().from('advertisements').select('*').eq('enabled',true);if(error)throw error;homeAds=Array.isArray(data)?data:[];applyAds();}catch{/* Retain configured advertisement placements. */}})();
})();

/* Desktop side ads: start under the market strip, then glide up and stay stuck at the top while scrolling */
(function(){
  const root=document.documentElement;
  function place(){
    if(innerWidth<1440){root.style.removeProperty('--skin-start');return}
    const m=document.querySelector('primez-site-nav');
    const base=m?m.getBoundingClientRect().bottom+scrollY+14:190;
    root.style.setProperty('--skin-start',Math.max(12,base-scrollY)+'px');
  }
  addEventListener('scroll',place,{passive:true});addEventListener('resize',place);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',place);else place();
  setTimeout(place,800);
})();

/* Move the Chandigarh / gold / petrol market strip below the top-news block (it lives in the nav's shadow DOM, so it gets its own shadow host + stylesheet) */
(function(){
  let done=false;
  function mv(){
    if(done)return;
    const nav=document.querySelector('primez-site-nav'),h=document.querySelector('.hero-section');
    const m=nav&&nav.shadowRoot&&nav.shadowRoot.querySelector('.market');
    if(!m||!h)return;
    const host=document.createElement('div');host.className='wrap market-moved';host.style.cssText='margin-top:26px;margin-bottom:6px;display:block;border-radius:14px;overflow:hidden';
    const sr=host.attachShadow({mode:'open'});
    const l=document.createElement('link');l.rel='stylesheet';l.href='assets/css/public-navigation.css?v=20261118a';
    const st=document.createElement('style');st.textContent='.market{border-radius:0}';
    sr.append(l,st,m);h.after(host);nav.style.minHeight='0';done=true;
    window.dispatchEvent(new Event('resize'));
  }
  mv();
  const mo=new MutationObserver(mv);mo.observe(document.body,{childList:true,subtree:true});
  const t=setInterval(()=>{mv();if(done)clearInterval(t)},400);
  setTimeout(()=>{mo.disconnect();clearInterval(t)},15000);
})();
