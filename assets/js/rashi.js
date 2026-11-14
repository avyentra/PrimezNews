(function () {
 'use strict';
 const signs = [['मेष','♈'],['वृषभ','♉'],['मिथुन','♊'],['कर्क','♋'],['सिंह','♌'],['कन्या','♍'],['तुला','♎'],['वृश्चिक','♏'],['धनु','♐'],['मकर','♑'],['कुंभ','♒'],['मीन','♓']];
 const dates = ['21 मार्च – 19 अप्रैल','20 अप्रैल – 20 मई','21 मई – 20 जून','21 जून – 22 जुलाई','23 जुलाई – 22 अगस्त','23 अगस्त – 22 सितंबर','23 सितंबर – 22 अक्टूबर','23 अक्टूबर – 21 नवंबर','22 नवंबर – 21 दिसंबर','22 दिसंबर – 19 जनवरी','20 जनवरी – 18 फरवरी','19 फरवरी – 20 मार्च'];
 const el = id => document.getElementById(id);
 const query = new URLSearchParams(location.search).get('sign');
 const selected = /^(?:[0-9]|1[01])$/.test(query || '') ? Number(query) : 0;
 const unavailable = 'इस अवधि का राशिफल अभी उपलब्ध नहीं है।';
 const dateText = date => date.toLocaleDateString('hi-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const zodiacPaths = [
 'M12 21V8C12-1 1 1 3 8l3 6 M12 8C12-1 23 1 21 8l-3 6',
 'M5 2c0 7 14 7 14 0 M19 14a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 'M4 2c5 3 11 3 16 0 M4 22c5-3 11-3 16 0 M8 4v16 M16 4v16',
 'M3 8c5-6 13-6 18 0 M3 16c5 6 13 6 18 0 M10 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 'M9 16c-8-2-8 7-3 6 7-1 1-12 2-17 2-7 13-2 9 5l-4 8c-2 6 6 5 8 1',
 'M3 5v15 M3 8c0-6 6-6 6 0v12 M9 8c0-6 6-6 6 0v12 M15 8c0-6 6-6 6 0v8c0 4-5 5-7 7',
 'M3 21h18 M3 15h5a6 6 0 1 1 8 0h5',
 'M2 5v15 M2 8c0-6 6-6 6 0v12 M8 8c0-6 6-6 6 0v9c0 5 6 5 8 1 M19 15l3 3-3 3',
 'M3 21 21 3 M12 3h9v9 M5 10l9 9',
 'M2 6l3-2 5 16 M8 4c9-6 2 15 9 16 9 2 4-11-3-8',
 'M2 7l4-3 4 5 4-5 4 5 4-3 M2 17l4-3 4 5 4-5 4 5 4-3',
 'M4 2c7 4 7 16 0 20 M20 2c-7 4-7 16 0 20 M2 12h20'
 ];
 function zodiac(index) { const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.35');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',zodiacPaths[index]);svg.append(path);return svg; }
 el('signSymbol').replaceChildren(zodiac(selected));
 el('signTitle').textContent = signs[selected][0]+' राशिफल';
 el('signDate').textContent = dates[selected];
 el('pageDate').textContent = dateText(new Date());
 document.title = signs[selected][0]+' राशिफल आज | PrimezNews';
 signs.forEach((sign,index) => {
  const a = document.createElement('a'); a.href = 'rashi.html?sign='+index; a.className = 'zodiac-tile'+(index===selected?' active':'');
  if (index===selected) a.setAttribute('aria-current','page');
  const icon = document.createElement('span'); icon.className = 'zodiac-symbol'; icon.append(zodiac(index)); icon.setAttribute('aria-hidden','true');
  const label = document.createElement('span'); label.className = 'zodiac-name'; label.textContent = sign[0]; a.append(icon,label); el('signLinks').append(a);
 });
 const tabs = [...document.querySelectorAll('[role=tab]')];
 function activate(tab) { tabs.forEach(t => { const active=t===tab; t.setAttribute('aria-selected',String(active)); t.tabIndex=active?0:-1; el(t.getAttribute('aria-controls')).hidden=!active; }); }
 tabs.forEach((tab,index) => {
  tab.addEventListener('click',()=>activate(tab));
  tab.addEventListener('keydown',event => { let next; if(event.key==='ArrowRight')next=(index+1)%tabs.length; if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length; if(event.key==='Home')next=0; if(event.key==='End')next=tabs.length-1; if(next!==undefined){event.preventDefault();activate(tabs[next]);tabs[next].focus();} });
 });
 const paths = {
 career:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 11v3h4v-3',
 money:'M3 6c0-2 10-2 10 0s-10 2-10 0v5c0 2 10 2 10 0V6 M3 11v5c0 2 7 2 10 1 M16 10c0-2 6-2 6 0s-6 2-6 0v9c0 2 6 2 6 0v-9 M16 15c0 2 6 2 6 0',
 love:'M12 21 3 12C-2 6 7 1 12 7c5-6 14-1 9 5z',
 family:'M2 11 12 2l10 9 M5 9v12h5v-7h4v7h5V9',
 health:'M12 21 3 12C-2 6 7 1 12 7c5-6 14-1 9 5z M3 12h5l2-5 4 10 2-5h5',
 remedy:'M3 13h18c0 10-18 10-18 0z M12 3c-5 5-5 7 0 9 5-2 5-4 0-9z'
 };
 function icon(key) { const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[key]);svg.append(path);return svg; }
 const colors = {'नारंगी':'#f68b24','पीला':'#f4d35e','लाल':'#d94d45','हरा':'#528461','नीला':'#4c78bd','सफेद':'#ffffff','गुलाबी':'#e699b4','बैंगनी':'#9360b7','काला':'#252632','सुनहरा':'#cda752','भूरा':'#966f4f','आसमानी':'#86c8df'};
 function renderDetails(details) {
  el('detailList').replaceChildren();
  [['career','करियर'],['money','धन'],['love','प्रेम'],['family','परिवार'],['health','स्वास्थ्य'],['remedy','उपाय']].forEach(([key,label]) => {
   if(details[key]===undefined || details[key]===null || details[key]==='') return;
   const card=document.createElement('section');card.className='detail-topic';const copy=document.createElement('div');const h=document.createElement('h3');h.textContent=label;const p=document.createElement('p');p.textContent=String(details[key]);copy.append(h,p);card.append(icon(key),copy);el('detailList').append(card);
  });
  el('luckyDetails').replaceChildren();
  [['lucky_number','शुभ अंक'],['lucky_color','शुभ रंग'],['lucky_time','शुभ समय']].forEach(([key,label])=>{
   if(details[key]===undefined || details[key]===null || details[key]==='')return;
   const row=document.createElement('p');row.className='lucky-row';const name=document.createElement('span');name.textContent=label;const value=document.createElement('span');value.className='lucky-value';value.textContent=String(details[key]);
   if(key==='lucky_color' && colors[details[key]]){const swatch=document.createElement('span');swatch.className='color-swatch';swatch.style.backgroundColor=colors[details[key]];swatch.setAttribute('aria-hidden','true');value.append(swatch);}
   row.append(name,value);el('luckyDetails').append(row);
  });
  if(!el('luckyDetails').children.length){const p=document.createElement('p');p.className='rashi-muted';p.textContent='शुभ संकेत अभी उपलब्ध नहीं हैं।';el('luckyDetails').append(p);}
 }
 fetch('data/rashifal/latest.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Unavailable');return response.json();}).then(data=>{
  const sign=data.signs?.[signs[selected][0]];if(!sign)throw new Error('Missing sign');
  ['daily','weekly','monthly','yearly'].forEach(period=>{el('x-'+period).textContent=typeof sign[period]==='string'&&sign[period].trim()?sign[period]:unavailable;});
  renderDetails(sign.details || {});
  if(/^\d{4}-\d{2}-\d{2}$/.test(data.date||'')){const date=new Date(data.date+'T12:00:00+05:30');if(Number.isFinite(date.getTime()))el('pageDate').textContent=dateText(date);}
  el('genNote').textContent=data.generated_by || 'स्रोत की जानकारी उपलब्ध नहीं है।';
 }).catch(()=>{['daily','weekly','monthly','yearly'].forEach(period=>{el('x-'+period).textContent=unavailable;});renderDetails({});el('genNote').textContent='डेटा लोड नहीं हो सका। कृपया कुछ देर बाद फिर कोशिश करें।';});
 const toggle=document.querySelector('.menu-toggle'),links=el('navLinks');
 if(toggle && links)toggle.addEventListener('click',()=>{const open=!links.classList.contains('open');links.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));});
})();
