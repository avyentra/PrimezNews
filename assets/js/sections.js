/* Homepage Rashifal and culture sections. Shared editorial-preview story list. */
(function () {
 'use strict';
 const signs=['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined&&text!==null)el.textContent=String(text);if(cls)el.className=cls;return el;};
 const grid=document.getElementById('zodiacGrid');
 if(grid){
  grid.replaceChildren();
  signs.forEach((name,index)=>{const a=node('a',null,'zodiac-tile');a.href='rashi.html?sign='+index;const symbol=node('span',null,'zodiac-symbol');symbol.setAttribute('aria-hidden','true');if(window.PrimezHomeZodiac)symbol.append(window.PrimezHomeZodiac(index));a.append(symbol,node('span',name,'zodiac-name'));grid.append(a);});
  const more=document.getElementById('showAllSigns');if(more)more.onclick=()=>{const expanded=more.getAttribute('aria-expanded')!=='true';more.setAttribute('aria-expanded',String(expanded));grid.classList.toggle('expanded',expanded);more.textContent=expanded?'कम राशियाँ दिखाएँ ↑':'सभी 12 राशियाँ देखें →';};
 }
 const date=document.getElementById('rashiHomeDate');if(date)date.textContent=new Date().toLocaleDateString('hi-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'long',year:'numeric'});
 const faith=document.getElementById('faithGrid');
 if(!faith || typeof stories==='undefined')return;
 faith.replaceChildren();
 const items=stories.filter(s=>s.category==='Faith');
 if(!items.length){faith.append(node('p','इस श्रेणी की खबरें जल्द आएँगी।','faith-empty'));return;}
 const title=story=>typeof heading==='function'?heading(story):story.title;
 const storyButton=(story,cls)=>{const button=node('button',null,cls+' story-open');button.type='button';button.dataset.story=story.id;return button;};
 function image(src,alt,cls){const img=node('img',null,cls);img.src=src;img.alt=alt;img.loading='lazy';img.decoding='async';return img;}
 const main=node('div',null,'faith-main'),lead=items[0],leadButton=storyButton(lead,'faith-lead');
 const leadImage=image(window.PrimezHomeModel.image(lead),'प्रतीकात्मक तस्वीर','faith-lead-image');leadImage.width=1200;leadImage.height=800;
 const leadCopy=node('div',null,'faith-lead-copy');leadCopy.append(node('span','आस्था और विरासत','faith-tag'),node('h3',title(lead)),node('span',lead.district+' · '+lead.minutes+' मिनट पढ़ें','faith-meta'));
 leadButton.append(leadImage,leadCopy);main.append(leadButton);
 const rest=items.slice(1,3);
 if(rest.length){const secondary=node('div',null,'faith-secondary');rest.forEach((story,index)=>{const button=storyButton(story,'faith-compact');const photo=window.PrimezHomeModel.image(story);const alt='प्रतीकात्मक तस्वीर';const img=image(photo,alt,'faith-compact-image');img.width=160;img.height=120;const copy=node('span',null,'faith-compact-copy');copy.append(node('h3',title(story)),node('span',story.district+' · '+story.minutes+' मिनट','faith-meta'));button.append(img,copy);secondary.append(button);});main.append(secondary);}
 faith.append(main);
 const others=stories.filter(s=>s.category!=='Faith').slice(0,6);
 faith.classList.toggle('single',!others.length);
 if(others.length){const aside=node('aside',null,'faith-others');const h=node('h3','अन्य खबरें','faith-others-title');const list=node('ol');others.forEach((story,index)=>{const li=node('li'),button=storyButton(story,'faith-quick-link');button.append(node('span',String(index+1).padStart(2,'0'),'faith-num'),node('span',title(story),'faith-quick-title'));li.append(button);list.append(li);});const all=node('a','सभी खबरें देखें →','faith-view-all');all.href='#latest';aside.append(h,list,all);faith.append(aside);}
})();
