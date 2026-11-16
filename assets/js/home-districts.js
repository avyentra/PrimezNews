/* ਤੁਹਾਡਾ ਜ਼ਿਲ੍ਹਾ – district chips + 4 latest district stories (home page). */
(function(){
 'use strict';
 const box=document.getElementById('districtNews');if(!box)return;
 const MAIN=[['Ludhiana'],['Amritsar'],['Jalandhar'],['Patiala'],['Bathinda'],['SAS Nagar (Mohali)','Mohali'],['Sangrur'],['Moga']];
 const ALL=["Amritsar","Barnala","Bathinda","Chandigarh","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Malerkotla","Mansa","Moga","Sri Muktsar Sahib","Pathankot","Patiala","Rupnagar","SAS Nagar (Mohali)","Sangrur","SBS Nagar","Tarn Taran"];
 const OTHER=ALL.filter(d=>!MAIN.some(m=>m[0]===d));
 let selected='';
 const lang=()=>typeof currentLang!=='undefined'?currentLang:'pa';
 const idx=()=>({en:0,hi:1,pa:2})[lang()]??2;
 function tr(en){try{const r=languageLookup.get(en);if(r&&r[idx()])return r[idx()];}catch{}return en;}
 const short=d=>d==='SAS Nagar (Mohali)'?'Mohali':d;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
 function ago(s){
  const t=Date.parse(s.published);if(!t)return '';
  const T={pa:['ਮਿੰਟ','ਘੰਟਾ','ਘੰਟੇ','ਦਿਨ','ਪਹਿਲਾਂ','ਹੁਣੇ','ਅੱਜ','ਕੱਲ੍ਹ'],hi:['मिनट','घंटा','घंटे','दिन','पहले','अभी','आज','कल'],en:['min','hour','hours','days','ago','Just now','Today','Yesterday']}[lang()]||[];
  const fmt=()=>window.PrimezLocaleFormatting?.date?window.PrimezLocaleFormatting.date(s.published,lang(),false):'';
  if(/T00:00(:00)?/.test(String(s.published))){const day=Math.floor((new Date().setHours(0,0,0,0)-new Date(t).setHours(0,0,0,0))/86400000);if(day<=0)return T[6];if(day===1)return T[7];if(day<7)return day+' '+T[3]+' '+T[4];return fmt();}
  const min=Math.floor(Math.max(0,Date.now()-t)/60000),hr=Math.floor(min/60);
  if(min<1)return T[5];if(min<60)return min+' '+T[0]+' '+T[4];if(hr<24)return hr+' '+(hr===1?T[1]:T[2])+' '+T[4];const d=Math.floor(hr/24);if(d<7)return d+' '+T[3]+' '+T[4];return fmt();
 }
 const title=s=>typeof heading==='function'?heading(s):(s[lang()]||s.title||s.pa||s.en);
 function pool(){const list=(typeof stories!=='undefined'&&Array.isArray(stories))?stories:[];const seen=new Set();return list.filter(s=>s&&s.id!=='video'&&s.district&&!seen.has(s.id)&&seen.add(s.id)).sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0));}
 function image(s){try{return window.PrimezHomeModel.image(s);}catch{return s.image||'assets/news-farm.webp';}}
 function chip(label,value){const b=node('button',label,'dn-chip'+(selected===value?' active':''));b.type='button';b.setAttribute('aria-pressed',String(selected===value));b.addEventListener('click',()=>{selected=value;render();});return b;}
 function render(){
  const head=node('div',undefined,'dn-head');const h=node('h2',tr('Your district'));h.id='districtNewsTitle';const all=node('a',tr('View all →'),'dn-all');all.href='news/';head.append(h,all);
  const chips=node('div',undefined,'dn-chips');chips.append(chip(tr('All'),''));MAIN.forEach(([v,l])=>chips.append(chip(tr(l||v),v)));
  const more=node('div',undefined,'dn-more');const mb=node('button',OTHER.includes(selected)?tr(short(selected)):tr('More districts'),'dn-chip'+(OTHER.includes(selected)?' active':''));mb.type='button';mb.setAttribute('aria-expanded','false');
  const menu=node('div',undefined,'dn-menu');OTHER.forEach(d=>{const o=node('button',tr(short(d)),selected===d?'active':'');o.type='button';o.addEventListener('click',()=>{selected=d;render();});menu.append(o);});
  mb.addEventListener('click',e=>{e.stopPropagation();const open=more.classList.toggle('open');mb.setAttribute('aria-expanded',String(open));});
  more.append(mb,menu);chips.append(more);
  const grid=node('div',undefined,'dn-grid');const rows=pool().filter(s=>!selected||s.district===selected).slice(0,4);
  if(!rows.length)grid.append(node('p',tr('News from this district is coming soon.'),'dn-empty'));
  rows.forEach(s=>{const a=node('a',undefined,'dn-card');a.href=window.PrimezNewsURLs?window.PrimezNewsURLs.href(s):'news/';
   const pic=node('span',undefined,'dn-img');const img=node('img');img.src=image(s);img.alt=s.photoCaption||title(s);img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{if(!img.dataset.f){img.dataset.f='1';img.src='assets/news-farm.webp';}});pic.append(img);
   a.append(pic,node('span',tr(short(s.district)),'dn-tag'),node('h3',title(s)),node('span',ago(s),'dn-time'));grid.append(a);});
  box.replaceChildren(head,chips,grid);
 }
 document.addEventListener('click',e=>{const m=box.querySelector('.dn-more.open');if(m&&!m.contains(e.target)){m.classList.remove('open');m.querySelector('button')?.setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')box.querySelector('.dn-more.open')?.classList.remove('open');});
 document.addEventListener('primez-home-stories',render);
 document.querySelectorAll('.language').forEach(el=>el.addEventListener('click',()=>setTimeout(render,0)));document.getElementById('siteLanguage')?.addEventListener('change',()=>setTimeout(render,0));
 render();
})();
