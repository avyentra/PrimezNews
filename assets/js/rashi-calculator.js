/* Browser-only geocentric Moon calculation. Astronomy Engine 2.1.19 (MIT).
 * Mean Lahiri J2000 anchor + IAU 2006 general precession; remove nutation
 * from true-ecliptic Moon longitude. This is an approximate Lahiri model.
 * Flag 0.05 degree boundaries; do not claim exact chart-level precision.
 */
(function(root){
 'use strict';
 const SIGNS=['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
 const GROUPS=[
 [['चू','chu'],['चे','che'],['चो','cho'],['ला','la'],['ली','li'],['लू','lu'],['ले','le'],['लो','lo'],['अ / आ','a']],
 [['इ / ई','i'],['उ / ऊ','u'],['ए','e'],['ओ','o'],['वा','va'],['वी','vi'],['वू','vu'],['वे','ve'],['वो','vo']],
 [['का','ka'],['की','ki'],['कू','ku'],['घ','gha'],['ङ','nga'],['छ','chha'],['के','ke'],['को','ko'],['हा','ha']],
 [['ही','hi'],['हू','hu'],['हे','he'],['हो','ho'],['डा','da'],['डी','di'],['डू','du'],['डे','de'],['डो','do']],
 [['मा','ma'],['मी','mi'],['मू','mu'],['मे','me'],['मो','mo'],['टा','ta'],['टी','ti'],['टू','tu'],['टे','te']],
 [['टो','to'],['पा','pa'],['पी','pi'],['पू','pu'],['ष / श','sha'],['ण','na'],['ठ','tha'],['पे','pe'],['पो','po']],
 [['रा','ra'],['री','ri'],['रू','ru'],['रे','re'],['रो','ro'],['ता','ta'],['ती','ti'],['तू','tu'],['ते','te']],
 [['तो','to'],['ना','na'],['नी','ni'],['नू','nu'],['ने','ne'],['नो','no'],['या','ya'],['यी','yi'],['यू','yu']],
 [['ये','ye'],['यो','yo'],['भा','bha'],['भी','bhi'],['भू','bhu'],['धा','dha'],['फा','pha'],['ढा','dha'],['भे','bhe']],
 [['भो','bho'],['जा','ja'],['जी','ji'],['खी','khi'],['खू','khu'],['खे','khe'],['खो','kho'],['गा','ga'],['गी','gi']],
 [['गू','gu'],['गे','ge'],['गो','go'],['सा','sa'],['सी','si'],['सू','su'],['से','se'],['सो','so'],['दा','da']],
 [['दी','di'],['दू','du'],['थ','tha'],['झ','jha'],['ञ','nya'],['दे','de'],['दो','do'],['चा','cha'],['ची','chi']]
 ];
 const SOUNDS=GROUPS.flatMap((group,sign)=>group.map(([hi,roman])=>({hi,roman,sign})));
 function suggest(name){
  const first=String(name||'').trim().split(/\s+/)[0].normalize('NFC');if(!first)return [];
  let matches=[];
  if(/^[a-z]/i.test(first)){
   const input=first.toLowerCase().replace(/aa/g,'a').replace(/ee/g,'i').replace(/oo/g,'u');
   matches=SOUNDS.map((sound,index)=>({sound,index})).filter(({sound})=>input.startsWith(sound.roman));
   const max=Math.max(0,...matches.map(({sound})=>sound.roman.length));matches=matches.filter(({sound})=>sound.roman.length===max);
  }else{
   // A short vowel/inherent vowel in a written name shares its naming sound.
   const normalized=first.replace(/ि/g,'ी').replace(/ु/g,'ू').replace(/़/g,'');
   const short={'म':'मा','प':'पा','र':'रा','न':'ना','त':'ता','ट':'टा','द':'दा','ड':'डा','ज':'जा','क':'का','ग':'गा','स':'सा','भ':'भा','ध':'धा','ल':'ला','व':'वा','य':'या','च':'चा'};
   let syllable=normalized.match(/^(?:भ|ध|ख|घ|फ|छ|झ|ठ|ढ|[क-ह])(?:ा|ी|ू|ृ|े|ै|ो|ौ)?/)?.[0] || normalized[0];
   syllable=short[syllable]||syllable;
   matches=SOUNDS.map((sound,index)=>({sound,index})).filter(({sound})=>sound.hi.split(' / ').includes(syllable));
  }
  return matches.map(({index})=>index);
 }
 function nameSign(soundIndex){const sound=SOUNDS[Number(soundIndex)];if(!sound || soundIndex==='')throw new Error('नाम की पहली ध्वनि चुनें।');return {index:sound.sign,name:SIGNS[sound.sign],sound:sound.hi};}
 function localParts(date,zone){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const out={};parts.forEach(p=>{if(p.type!=='literal')out[p.type]=Number(p.value);});return out;}
 function utcForLocal(day,time,zone){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^\d{2}:\d{2}$/.test(time))throw new Error('सही जन्म तारीख और समय भरें।');
  const [y,m,d]=day.split('-').map(Number),[h,min]=time.split(':').map(Number);const base=Date.UTC(y,m-1,d,h,min);
  if(y<1900||y>2100||h>23||min>59||new Date(base).toISOString().slice(0,16)!==day+'T'+time)throw new Error('1900–2100 के बीच सही तारीख और समय भरें।');
  try{localParts(new Date(base),zone);}catch{throw new Error('जन्मस्थान का सही IANA time zone चुनें।');}
  const offsets=new Set();for(let delta=-36;delta<=36;delta+=6){const sample=base+delta*3600000,p=localParts(new Date(sample),zone);offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-sample);}
  const dates=[];for(const offset of offsets){const date=new Date(base-offset),p=localParts(date,zone);if(p.year===y&&p.month===m&&p.day===d&&p.hour===h&&p.minute===min&&p.second===0)dates.push(date);}
  dates.sort((a,b)=>a-b);if(!dates.length)throw new Error('इस स्थान पर यह स्थानीय समय DST बदलाव के कारण मौजूद नहीं था। सही समय जाँचें।');return dates;
 }
 function moon(date,engine=root.Astronomy){
  if(!engine)throw new Error('Calculation library लोड नहीं हुई। पेज फिर खोलें।');
  if(!(date instanceof Date)||!Number.isFinite(date.getTime())||date.getUTCFullYear()<1900||date.getUTCFullYear()>2100)throw new Error('जन्म तारीख 1900–2100 के बीच होनी चाहिए।');
  const time=engine.MakeTime(date),t=time.tt/36525;
  const precession=(5028.796195*t+1.1054348*t*t+0.00007964*t**3-0.000023857*t**4-0.0000000383*t**5)/3600;
  const ayanamsa=23.857092353+precession;
  const tropical=engine.EclipticGeoMoon(time).lon;
  const nutation=engine.e_tilt(time).dpsi/3600;
  const longitude=((tropical-nutation-ayanamsa)%360+360)%360,index=Math.floor(longitude/30),degree=longitude%30;
  return {index,name:SIGNS[index],longitude,degree,ayanamsa,boundary:Math.min(degree,30-degree)<0.05};
 }
 const api={SIGNS,SOUNDS,suggest,nameSign,utcForLocal,moon};root.PrimezRashiCalculator=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
