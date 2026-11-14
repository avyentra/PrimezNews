/* Public cloud stories and advertisements integrated into the existing homepage. */
(async function () {
 'use strict';
 const api=window.PrimezAPI;if(!api?.configured)return;
 const main=document.querySelector('.hero-section') || document.querySelector('main');if(!main)return;
 const section=document.createElement('section');section.className='wrap cloud-latest';section.style.cssText='margin:28px auto;padding:24px;border:1px solid #dce1eb;border-radius:12px;background:white;color:#101d35';
 const heading=document.createElement('h2');heading.textContent='Latest published stories';
 const all=document.createElement('a');all.href='news.html';all.textContent='View all latest news →';
 const list=document.createElement('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:20px';
 section.append(heading,all,list);main.before(section);
 async function refresh(){
  try{
   const stories=await api.publicStories();list.replaceChildren();
   if(!stories.length){const p=document.createElement('p');p.textContent='No live stories yet.';list.append(p);}
   for(const story of stories.slice(0,6)){
    const article=document.createElement('article'),a=document.createElement('a'),img=document.createElement('img'),h=document.createElement('h3'),p=document.createElement('p');
    a.href='news.html?story='+encodeURIComponent(story.id);img.src=api.image(story.image);img.alt=story.en;img.loading='lazy';img.style.cssText='width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px';h.textContent=story.en;p.textContent=story.summary;a.append(img,h);article.append(a,p);list.append(article);
   }
  }catch{list.textContent='Live stories are temporarily unavailable. Please retry shortly.';}
 }
 await refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);
 try{
  const {data,error}=await api.db().from('advertisements').select('*').eq('enabled',true);if(error)throw error;
  for(const ad of data){if(!api.safeUrl(ad.image))continue;const host=document.querySelector('[data-ad-slot="'+ad.slot+'"]');if(!host)continue;
   const label=document.createElement('small');label.textContent='Advertisement';const img=document.createElement('img');img.src=api.safeUrl(ad.image);img.alt='Advertisement';img.style.cssText='display:block;max-width:100%;height:auto';
   host.replaceChildren(label);if(api.safeUrl(ad.href)){const a=document.createElement('a');a.href=api.safeUrl(ad.href);a.rel='sponsored noopener';a.target='_blank';a.append(img);host.append(a);}else host.append(img);host.hidden=false;
  }
 }catch{/* Existing sample placements remain visible when ads cannot load. */}
})();
