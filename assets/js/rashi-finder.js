(function(){
 'use strict';
 const api=window.PrimezRashiCalculator,el=id=>document.getElementById(id);
 const cities=[
 ['Abohar / अबोहर','Asia/Kolkata'],['Fazilka / फाजिल्का','Asia/Kolkata'],['Chandigarh / चंडीगढ़','Asia/Kolkata'],['Mohali / मोहाली','Asia/Kolkata'],['Ludhiana / लुधियाना','Asia/Kolkata'],['Amritsar / अमृतसर','Asia/Kolkata'],['Jalandhar / जालंधर','Asia/Kolkata'],['Patiala / पटियाला','Asia/Kolkata'],['Bathinda / बठिंडा','Asia/Kolkata'],['Ferozepur / फिरोजपुर','Asia/Kolkata'],['Moga / मोगा','Asia/Kolkata'],['Faridkot / फरीदकोट','Asia/Kolkata'],['Sangrur / संगरूर','Asia/Kolkata'],['Barnala / बरनाला','Asia/Kolkata'],['Mansa / मानसा','Asia/Kolkata'],['Muktsar / मुक्तसर','Asia/Kolkata'],['Hoshiarpur / होशियारपुर','Asia/Kolkata'],['Kapurthala / कपूरथला','Asia/Kolkata'],['Pathankot / पठानकोट','Asia/Kolkata'],['Gurdaspur / गुरदासपुर','Asia/Kolkata'],['Malerkotla / मलेरकोटला','Asia/Kolkata'],['Rupnagar / रूपनगर','Asia/Kolkata'],['Delhi / दिल्ली','Asia/Kolkata'],['Mumbai / मुंबई','Asia/Kolkata'],['Bengaluru / बेंगलुरु','Asia/Kolkata'],['Chennai / चेन्नई','Asia/Kolkata'],['Kolkata / कोलकाता','Asia/Kolkata'],['Jaipur / जयपुर','Asia/Kolkata'],['Pune / पुणे','Asia/Kolkata'],['Hyderabad / हैदराबाद','Asia/Kolkata'],['Ahmedabad / अहमदाबाद','Asia/Kolkata'],['Lucknow / लखनऊ','Asia/Kolkata'],['Shimla / शिमला','Asia/Kolkata'],['Jammu / जम्मू','Asia/Kolkata'],['Srinagar / श्रीनगर','Asia/Kolkata'],['London','Europe/London'],['Toronto','America/Toronto'],['Vancouver','America/Vancouver'],['New York','America/New_York'],['Los Angeles','America/Los_Angeles'],['Chicago','America/Chicago'],['Sydney','Australia/Sydney'],['Melbourne','Australia/Melbourne'],['Perth','Australia/Perth'],['Dubai','Asia/Dubai'],['Singapore','Asia/Singapore'],['Auckland','Pacific/Auckland'],['Kathmandu','Asia/Kathmandu'],['Lahore','Asia/Karachi'],['Dhaka','Asia/Dhaka'],['Paris','Europe/Paris'],['Berlin','Europe/Berlin'],['Tarn Taran / तरन तारन','Asia/Kolkata'],['SBS Nagar / नवांशहर','Asia/Kolkata']
 ];
 cities.forEach(([name])=>{const option=document.createElement('option');const translated=(window.PRIMEZ_LOCALE_ROWS||[]).find(row=>row[0]===name.split(' / ')[0]);option.value=translated?name.split(' / ')[0]+' / '+translated[2]:name;el('birthPlaces').append(option);});

 api.SOUNDS.forEach((sound,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=sound.hi+' / '+sound.roman+' · '+api.SIGNS[sound.sign];el('nameSound').append(option);});
 const localized=(pa,hi,en)=>({pa,hi,en}[window.PrimezLanguage?.get()||'pa']);
 const findCity=()=>window.PrimezRashiPlaces.resolve(el('birthPlace').value,cities,window.PRIMEZ_LOCALE_ROWS||[]);
 const signName=index=>{const hi=api.SIGNS[index];const row=(window.PRIMEZ_LOCALE_ROWS||[]).find(r=>r[1]===hi);return row?row[{en:0,hi:1,pa:2}[window.PrimezLanguage?.get()||'pa']]:hi;};
 function selectBelow(index,scroll=true){if(window.PrimezRashiView)window.PrimezRashiView.select(index,scroll);}

 el('finderName').oninput=()=>{el('nameResult').hidden=true;const matches=api.suggest(el('finderName').value);el('nameSound').value=matches.length===1?String(matches[0]):'';el('nameFeedback').textContent=matches.length>1?'पहली ध्वनि अस्पष्ट है। नीचे सही हिंदी ध्वनि चुनें।':'';};
 el('nameSound').onchange=()=>{el('nameResult').hidden=true;};
 function placeChanged(){el('birthResult').hidden=true;el('birthFeedback').textContent='';el('birthOccurrence').value='';el('occurrenceField').hidden=true;const city=findCity();el('birthZone').value=city?city[1]:'';el('birthLocationNote').textContent=city?localized('ਸਥਾਨ ਪਛਾਣ ਲਿਆ ਗਿਆ। ਸਮਾਂ-ਖੇਤਰ ਆਪਣੇ ਆਪ ਸੈੱਟ ਹੈ।','स्थान पहचान लिया गया। समय-क्षेत्र अपने आप सेट है।','Location recognised. Its time zone is set automatically.'):'';}
 el('birthPlace').oninput=placeChanged;el('birthPlace').onchange=placeChanged;
 el('birthName').oninput=()=>{el('birthResult').hidden=true;};

 function result(container,heading,description,indices){
  container.replaceChildren();const h=document.createElement('h3');h.textContent=heading;const p=document.createElement('p');p.textContent=description;container.append(h,p);
  indices.forEach(index=>{const a=document.createElement('a');a.className='finder-view';a.href='rashi.html?sign='+index;a.textContent=signName(index)+localized(' ਦਾ ਰਾਸ਼ੀਫਲ ਵੇਖੋ ↓',' का राशिफल देखें ↓',' horoscope ↓');a.addEventListener('click',event=>{if(window.PrimezRashiView){event.preventDefault();selectBelow(index);}});container.append(a);});container.hidden=false;
 }
 el('nameRashiForm').onsubmit=event=>{event.preventDefault();el('nameFeedback').textContent='';el('nameResult').hidden=true;try{if(!el('finderName').value.trim())throw new Error('अपना पहला नाम भरें।');const found=api.nameSign(el('nameSound').value);result(el('nameResult'),'नाम राशि: '+found.name,'पुष्टि की गई पहली ध्वनि: '+found.sound+'। यह पारंपरिक नाम-ध्वनि mapping है, जन्म की चंद्र राशि नहीं।',[found.index]);selectBelow(found.index);}catch(error){el('nameFeedback').textContent=error.message;}};
 ['birthDate','birthTime'].forEach(id=>el(id).addEventListener('input',()=>{el('birthOccurrence').value='';el('occurrenceField').hidden=true;el('birthResult').hidden=true;}));
 el('birthRashiForm').onsubmit=event=>{
  event.preventDefault();el('birthFeedback').textContent='';el('birthResult').hidden=true;
  try{
   if(!el('birthName').value.trim())throw new Error(localized('ਆਪਣਾ ਨਾਮ ਭਰੋ।','अपना नाम भरें।','Enter your name.'));
   if(!el('birthPlace').value.trim())throw new Error(localized('ਜਨਮ ਸਥਾਨ ਭਰੋ।','जन्मस्थान भरें।','Enter your birthplace.'));
   const city=findCity();el('birthZone').value=city?city[1]:'';
   if(!el('birthZone').value.trim())throw new Error(localized('ਦਿੱਤੀ ਸੂਚੀ ਤੋਂ ਪਛਾਣਿਆ ਜਨਮ ਸਥਾਨ ਚੁਣੋ। ਅਣਪਛਾਤੇ ਸਥਾਨ ਦਾ ਸਮਾਂ-ਖੇਤਰ ਨਹੀਂ ਮੰਨਿਆ ਜਾ ਸਕਦਾ।','सूची से पहचाना गया जन्मस्थान चुनें। अनजान स्थान का समय-क्षेत्र अनुमान से नहीं चुना जाएगा।','Choose a recognised birthplace from the list. A time zone cannot be guessed for an unknown place.'));
   const dates=api.utcForLocal(el('birthDate').value,el('birthTime').value,el('birthZone').value.trim());
   el('occurrenceField').hidden=dates.length<2;
   if(dates.length>1&&!el('birthOccurrence').value)throw new Error(localized('DST ਕਰਕੇ ਇਹ ਸਮਾਂ ਦੋ ਵਾਰ ਆਇਆ ਸੀ। ਪਹਿਲੀ ਜਾਂ ਦੂਜੀ ਵਾਰ ਚੁਣੋ।','DST के कारण यह समय दो बार आया था। पहली या दूसरी बार चुनें।','This clock time occurred twice because of DST. Choose the first or second occurrence.'));
   const date=dates.length>1?dates[Number(el('birthOccurrence').value)]:dates[0];
   if(!date||date.getTime()>Date.now())throw new Error(localized('ਜਨਮ ਸਮਾਂ ਭਵਿੱਖ ਵਿੱਚ ਨਹੀਂ ਹੋ ਸਕਦਾ।','जन्म समय भविष्य में नहीं हो सकता।','The birth time cannot be in the future.'));
   const found=api.moon(date);
   if(found.boundary){const other=(found.index+(found.degree<0.05?11:1))%12;result(el('birthResult'),localized('ਰਾਸ਼ੀ-ਸੀਮਾ ਦੇ ਨੇੜੇ: ','राशि सीमा के पास: ','Near a sign boundary: ')+signName(found.index)+' / '+signName(other),localized('ਚੰਦਰਮਾ ਰਾਸ਼ੀ-ਸੀਮਾ ਦੇ ਬਹੁਤ ਨੇੜੇ ਹੈ। ਜਨਮ ਸਮਾਂ ਅਤੇ ਸਹੀ Lahiri ephemeris ਨਾਲ ਪੁਸ਼ਟੀ ਕਰੋ; ਇੱਕ ਪੱਕੀ ਰਾਸ਼ੀ ਆਪਣੇ ਆਪ ਨਹੀਂ ਚੁਣੀ ਗਈ।','चंद्रमा राशि-सीमा के पास है। जन्म समय और सटीक Lahiri ephemeris से पुष्टि करें; एक निश्चित राशि अपने आप नहीं चुनी गई।','The Moon is very close to a sign boundary. Confirm the birth time with a precise Lahiri ephemeris; one definite sign has not been selected automatically.'),[found.index,other]);}
   else {result(el('birthResult'),localized('ਚੰਦਰ ਰਾਸ਼ੀ: ','चंद्र राशि: ','Moon sign: ')+signName(found.index),el('birthName').value.trim()+' · '+localized('ਤੁਹਾਡੇ ਜਨਮ ਵੇਰਵਿਆਂ ਅਨੁਸਾਰ ਹੇਠਾਂ ਰਾਸ਼ੀ ਚੁਣ ਦਿੱਤੀ ਗਈ ਹੈ। ਨਤੀਜਾ ਅਨੁਮਾਨਿਤ Lahiri ਗਣਨਾ ਹੈ।','आपके जन्म विवरण के अनुसार नीचे राशि चुन दी गई है। परिणाम अनुमानित Lahiri गणना है।','The sign below is selected from your birth details using an approximate Lahiri calculation.'),[found.index]);selectBelow(found.index);}
  }catch(error){el('birthFeedback').textContent=error.message||'जानकारी जाँचें और फिर कोशिश करें।';}
 };
 const tabs=[el('finderNameTab'),el('finderBirthTab')];
 function show(index){if(index===1&&!el('birthName').value)el('birthName').value=el('finderName').value;if(index===0&&!el('finderName').value)el('finderName').value=el('birthName').value;tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;el(i===0?'nameFinderPanel':'birthFinderPanel').hidden=i!==index;});}
 tabs.forEach((tab,i)=>{tab.onclick=()=>show(i);tab.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-i;show(next);tabs[next].focus();}};});
})();
