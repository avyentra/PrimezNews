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
 function render(){
  if(new URLSearchParams(location.search).has('story'))return;
  const selected=model.select(live,seed);stories.splice(0,stories.length,...selected,...seed.filter(s=>s.id==="video"));
  if(!selected.length)return;const [lead,...rest]=selected;
  const article=node('article',undefined,'lead-story');const cover=link(lead,'lead-image');const img=photo(lead);img.loading='eager';img.fetchPriority='high';cover.append(img,node('span',lead.cloudId?'NEWSROOM':'NEWS BRIEF','image-tag'),node('span',lead.district,'image-location'));article.append(cover);
  const content=node('div',undefined,'lead-content');const meta=node('div',undefined,'story-meta');meta.append(node('span',category(lead),'category-tag'),node('span',date(lead)));const headingLink=link(lead,'headline-button');headingLink.append(node('h2',title(lead)));const byline=node('div',undefined,'byline');byline.append(node('span','PN','avatar'),node('span',lead.author||lead.source||'Primez Newsroom'),node('small',lead.minutes+' min read'));content.append(meta,headingLink,node('p',lead.summary),byline);article.append(content);
  const secondary=node('div',undefined,'secondary-stories');rest.slice(0,2).forEach(s=>{const card=node('article',undefined,'secondary-card');const cover=link(s,'secondary-image');cover.append(photo(s),node('span',category(s),'category-image'));const h=link(s,'headline-button');h.append(node('h3',title(s)));card.append(cover,h,node('p',s.summary,'secondary-summary'),node('span',date(s)+' · '+(s.author||s.source||'Primez Newsroom'),'read-time'));secondary.append(card);});
  const aside=node('aside',undefined,'latest-panel');const top=node('div',undefined,'latest-title');top.append(node('h2','The news desk'),node('span','QUICK READS'));const desk=node('div',undefined,'home-news-desk');rest.slice(2,7).forEach((s,i)=>{const a=link(s,'desk-item');const copy=node('div');copy.append(node('small',category(s)),node('h3',title(s)));a.append(node('span',String(i+1).padStart(2,'0')),copy);desk.append(a);});const all=node('a','Explore all stories →','text-link');all.href='#latest';aside.append(top,desk,all);hero.replaceChildren(article,secondary,aside);
  renderFeed();if(typeof translatePage==='function')translatePage();document.dispatchEvent(new CustomEvent('primez-home-stories'));
 }
 window.PrimezHome={render};render();
 document.querySelectorAll('.language').forEach(el=>el.addEventListener('click',render));document.getElementById('siteLanguage')?.addEventListener('change',render);
 async function refresh(){if(!api?.configured)return;try{const result=await api.publicStories();live=Array.isArray(result)?result:[];render();}catch{/* Keep the last successful result or dated curated briefs. */}}
 refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 if(api?.configured)(async()=>{try{const{data,error}=await api.db().from('advertisements').select('*').eq('enabled',true);if(error)throw error;for(const ad of data){if(!api.safeUrl(ad.image))continue;const host=[...document.querySelectorAll('[data-ad-slot]')].find(el=>el.dataset.adSlot===ad.slot);if(!host)continue;const label=node('small','Advertisement'),img=node('img');img.src=api.safeUrl(ad.image);img.alt='Advertisement';img.style.cssText='display:block;max-width:100%;height:auto';host.replaceChildren(label);if(api.safeUrl(ad.href)){const a=node('a');a.href=api.safeUrl(ad.href);a.rel='sponsored noopener';a.target='_blank';a.append(img);host.append(a);}else host.append(img);host.hidden=false;}}catch{/* Retain configured advertisement placements. */}})();
})();
