/* Selection is shared by the homepage renderer and regression tests. */
(function(root){
 'use strict';
 function select(published,seed,now=Date.now()){
  const live=(published||[]).filter(s=>s&&s.id&&['published','scheduled'].includes(s.status)&&Number.isFinite(Date.parse(s.publish_at))&&Date.parse(s.publish_at)<=now).sort((a,b)=>Date.parse(b.publish_at)-Date.parse(a.publish_at)||Date.parse(b.updated_at||b.publish_at)-Date.parse(a.updated_at||a.publish_at));
  const seen=new Set();return [...live.map(s=>({...s,cloudId:s.id,minutes:Math.max(1,Math.ceil(String(s.body||'').length/1000)),type:'NEWSROOM',published:s.publish_at})),...(seed||[]).filter(s=>s.id!=="video")].filter(s=>!seen.has(s.id)&&seen.add(s.id));
 }
 function image(story){const value=String(story.image||'');try{const u=new URL(value);if(u.protocol==='https:')return u.href;}catch{}return /^[a-z0-9-]+$/i.test(value)?'assets/'+value+'.webp':'assets/news-farm.webp';}
 const model={select,image};if(typeof module==='object'&&module.exports)module.exports=model;else root.PrimezHomeModel=model;
})(typeof window==='object'?window:globalThis);
