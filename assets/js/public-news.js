(async function () {
 'use strict';
 const api = window.PrimezAPI, box = document.getElementById('newsContent'), message = document.getElementById('newsMessage');
 const node = (tag,text,cls) => {const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const id = new URLSearchParams(location.search).get('story');
 const headline=s=>window.PrimezLanguage?.get()==='en'?s.en:(s.pa||s.title||s.en);
 async function render() {
  if (!api.configured) {message.textContent='The live newsroom is not connected yet. Visit the homepage for the design preview.';return;}
  try {
   const stories = await api.publicStories();box.replaceChildren();
   if(id) {
    const s=stories.find(s=>s.id===id);
    if(!s){message.textContent='This story is unavailable, unpublished or not yet due.';return;}
    document.title=headline(s)+' | Primez';document.getElementById('pageHeading').textContent=headline(s);document.getElementById('backToNews').hidden=false;box.className='article card';
    box.append(node('p',s.summary),node('p',s.author+' · '+s.district+' · '+new Date(s.publish_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST','muted'));
    const image=node('img');image.src=api.image(s.image);image.alt=headline(s);image.className='article-image';box.append(image);
    s.body.split(/\n\s*\n/).filter(Boolean).forEach(text=>box.append(node('p',text)));
   }else{
    for(const s of stories){const card=node('article',null,'card'),a=node('a',null),img=node('img');img.src=api.image(s.image);img.alt=headline(s);img.loading='lazy';a.href='news.html?story='+encodeURIComponent(s.id);a.append(img,node('h2',headline(s)));card.append(a,node('small',s.category+' · '+s.district),node('p',s.summary));box.append(card);}
   }
   message.textContent=stories.length?'':'No stories have been published yet.';
  } catch { message.textContent='News could not be loaded. Please try again shortly.'; }
 }
 document.addEventListener('primez-language-change',render);
 await render();
 // Scheduled availability is enforced by Postgres time/RLS, not this timer.
 // Polling simply refreshes the already-open page when new stories become due.
 setInterval(()=>{if(!document.hidden)render();},60000);
})();
