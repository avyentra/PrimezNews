(function(root){
'use strict';
const normalize = s => String(s || '').normalize('NFC').replace(/<[^>]*>/g,' ').replace(/\\n/g,' ').replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim().toLowerCase();
const words = s => normalize(s).split(/\s+/).filter(Boolean);
const similarity = (a,b) => { const x=new Set(words(a)), y=new Set(words(b)); if(!x.size||!y.size)return 0; return [...x].filter(t=>y.has(t)).length/new Set([...x,...y]).size; };
function inspect(story,rows){
 const errors=[],warnings=[]; const body=normalize(story.body), count=words(story.body).length;
 if(!body) errors.push('Article body is empty.');
 if(!normalize(story.title)||!normalize(story.en)) errors.push('Both headlines are required.');
 if(count && count<200) warnings.push('Short article ('+count+' words): check whether readers have enough verified context.');
 if(!normalize(story.summary)) warnings.push('Summary is missing.');
 if(!normalize(story.author)||story.author==='News desk') warnings.push('Confirm the responsible author or editorial desk.');
 if(!story.image||story.image==='fields') warnings.push('Check whether a relevant, rights-cleared image is available.');
 for(const other of rows||[]){
  if(other.id===story.id||!['published','scheduled'].includes(other.status))continue;
  const label=other.title||other.id;
  if(body && body===normalize(other.body)) errors.push('Duplicate article body: '+label);
  else if(normalize(story.title)&&normalize(story.title)===normalize(other.title)) warnings.push('Matching headline: '+label);
  else if(count>=30 && similarity(story.body,other.body)>=0.8) warnings.push('Possible similar article: '+label);
 }
 return {errors,warnings,count};
}
function render(result){const panel=document.getElementById('qualityReview'); if(!panel)return; panel.replaceChildren(); const heading=document.createElement('strong'); heading.textContent='Content quality review · '+result.count+' words';panel.append(heading);for(const message of [...result.errors.map(x=>'Block: '+x),...result.warnings.map(x=>'Review: '+x)]){const p=document.createElement('p');p.textContent=message;panel.append(p);} if(!result.errors.length&&!result.warnings.length){const p=document.createElement('p');p.textContent='No automated flags. Editorial verification is still required.';panel.append(p);}}
root.PrimezQuality={inspect,render};
})(typeof window==='undefined'?globalThis:window);