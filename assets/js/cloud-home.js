/* Published stories occupy the existing hero, never a separate injected block. */
(function(){
 'use strict';
 const api=window.PrimezAPI,model=window.PrimezHomeModel;
 const hero=document.querySelector('.hero-grid');if(!hero||!model)return;
 const seed=stories.slice();let live=[];
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
 const title=s=>typeof heading==='function'?heading(s):s.title||s.en;
 const href=s=>window.PrimezNewsURLs.href(s);
 function photo(s,cls){const img=node('img',undefined,cls);img.src=model.image(s);img.alt=s.photoCaption||s.en||s.title;img.decoding='async';img.loading='lazy';img.addEventListener('error',()=>{if(!img.dataset.fallback){img.dataset.fallback='true';img.src='assets/news-farm.webp';}});return img;}
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
 function render(){
  if(new URLSearchParams(location.search).has('story'))return;
  const selected=model.select(live,seed);stories.splice(0,stories.length,...selected,...seed.filter(s=>s.id==="video"));
  if(!selected.length)return;const [lead,...rest]=selected;
  const article=node('article',undefined,'lead-story');const cover=link(lead,'lead-image');const img=photo(lead);img.loading='eager';img.fetchPriority='high';const badges=node('span',undefined,'lead-badges');badges.append(node('span','SPECIAL REPORT','image-tag'),node('span',lead.district,'image-location'));cover.append(img,badges);article.append(cover);
  const content=node('div',undefined,'lead-content');const meta=node('div',undefined,'story-meta');meta.append(node('span',category(lead),'category-tag'),node('span',date(lead)));const headingLink=link(lead,'headline-button');headingLink.append(splitTitle(title(lead)));const byline=node('div',undefined,'byline');byline.append(node('span','PN','avatar'),node('span',lead.author||lead.source||'Primez Newsroom'),(()=>{const t=node('small',ago(lead));t.setAttribute('data-no-translate','');t.title=date(lead);return t;})());content.append(meta,headingLink,node('p',lead.summary),byline);article.append(content);
  const secondary=node('div',undefined,'secondary-stories');rest.slice(0,2).forEach(s=>{const card=node('article',undefined,'secondary-card');const cover=link(s,'secondary-image');cover.append(photo(s),node('span',category(s),'category-image'));const h=link(s,'headline-button');h.append(node('h3',title(s)));const foot=node('div',undefined,'card-foot');foot.append(node('span',date(s),'read-time'),node('span',s.author||s.source||'Primez Newsroom','card-author'));card.append(cover,h,node('p',s.summary,'secondary-summary'),foot);secondary.append(card);});
  const aside=node('aside',undefined,'latest-panel side-v2');/* Right column (design): 300x250 ad on top, then ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ list with time */const ad=node('div',undefined,'hero-side-ad');ad.dataset.adSlot='home-hero-side';const ph=node('div',undefined,'ad-ph');ph.append(node('small','ਇਸ਼ਤਿਹਾਰ · Advertisement'),node('b','300 × 250'),node('span','DIPR Punjab · Fixed property (first scroll)'));ad.append(ph);const box=node('div',undefined,'side-latest');const top=node('div',undefined,'latest-title');top.append(node('h2','Latest news'));const desk=node('div',undefined,'home-news-desk side-list');/* last 5 news by posting time */[...new Map(stories.filter(x=>x&&x.id!=='video').map(x=>[x.id,x])).values()].sort((x,y)=>(Date.parse(y.published)||0)-(Date.parse(x.published)||0)).slice(0,5).forEach(s=>{const a=link(s,'side-row');const tm=node('time',stamp(s));tm.title=date(s);a.append(tm,node('h3',title(s)));desk.append(a);});const all=node('a','Explore all stories →','text-link');all.href='#latest';box.append(top,desk,all);aside.append(ad,box);hero.replaceChildren(article,secondary,aside);
  renderFeed();if(typeof translatePage==='function')translatePage();document.dispatchEvent(new CustomEvent('primez-home-stories'));
 }
 window.PrimezHome={render};render();
 document.querySelectorAll('.language').forEach(el=>el.addEventListener('click',render));document.getElementById('siteLanguage')?.addEventListener('change',render);
 async function refresh(){if(!api?.configured)return;try{const result=await api.publicStories();live=Array.isArray(result)?result:[];render();}catch{/* Keep the last successful result or dated curated briefs. */}}
 refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 if(api?.configured)(async()=>{try{const{data,error}=await api.db().from('advertisements').select('*').eq('enabled',true);if(error)throw error;for(const ad of data){if(!api.safeUrl(ad.image))continue;const host=[...document.querySelectorAll('[data-ad-slot]')].find(el=>el.dataset.adSlot===ad.slot);if(!host)continue;const label=node('small','Advertisement'),img=node('img');img.src=api.safeUrl(ad.image);img.alt='Advertisement';img.style.cssText='display:block;max-width:100%;height:auto';host.replaceChildren(label);if(api.safeUrl(ad.href)){const a=node('a');a.href=api.safeUrl(ad.href);a.rel='sponsored noopener';a.target='_blank';a.append(img);host.append(a);}else host.append(img);host.hidden=false;}}catch{/* Retain configured advertisement placements. */}})();
})();
