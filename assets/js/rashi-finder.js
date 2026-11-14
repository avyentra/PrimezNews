(function(){
 'use strict';
 const api=window.PrimezRashiCalculator,el=id=>document.getElementById(id);
 const cities=[
 ['Abohar / अबोहर','Asia/Kolkata'],['Fazilka / फाजिल्का','Asia/Kolkata'],['Chandigarh / चंडीगढ़','Asia/Kolkata'],['Mohali / मोहाली','Asia/Kolkata'],['Ludhiana / लुधियाना','Asia/Kolkata'],['Amritsar / अमृतसर','Asia/Kolkata'],['Jalandhar / जालंधर','Asia/Kolkata'],['Patiala / पटियाला','Asia/Kolkata'],['Bathinda / बठिंडा','Asia/Kolkata'],['Ferozepur / फिरोजपुर','Asia/Kolkata'],['Moga / मोगा','Asia/Kolkata'],['Faridkot / फरीदकोट','Asia/Kolkata'],['Sangrur / संगरूर','Asia/Kolkata'],['Barnala / बरनाला','Asia/Kolkata'],['Mansa / मानसा','Asia/Kolkata'],['Muktsar / मुक्तसर','Asia/Kolkata'],['Hoshiarpur / होशियारपुर','Asia/Kolkata'],['Kapurthala / कपूरथला','Asia/Kolkata'],['Pathankot / पठानकोट','Asia/Kolkata'],['Gurdaspur / गुरदासपुर','Asia/Kolkata'],['Malerkotla / मलेरकोटला','Asia/Kolkata'],['Rupnagar / रूपनगर','Asia/Kolkata'],['Delhi / दिल्ली','Asia/Kolkata'],['Mumbai / मुंबई','Asia/Kolkata'],['Bengaluru / बेंगलुरु','Asia/Kolkata'],['Chennai / चेन्नई','Asia/Kolkata'],['Kolkata / कोलकाता','Asia/Kolkata'],['Jaipur / जयपुर','Asia/Kolkata'],['Pune / पुणे','Asia/Kolkata'],['Hyderabad / हैदराबाद','Asia/Kolkata'],['Ahmedabad / अहमदाबाद','Asia/Kolkata'],['Lucknow / लखनऊ','Asia/Kolkata'],['Shimla / शिमला','Asia/Kolkata'],['Jammu / जम्मू','Asia/Kolkata'],['Srinagar / श्रीनगर','Asia/Kolkata'],['London','Europe/London'],['Toronto','America/Toronto'],['Vancouver','America/Vancouver'],['New York','America/New_York'],['Los Angeles','America/Los_Angeles'],['Chicago','America/Chicago'],['Sydney','Australia/Sydney'],['Melbourne','Australia/Melbourne'],['Perth','Australia/Perth'],['Dubai','Asia/Dubai'],['Singapore','Asia/Singapore'],['Auckland','Pacific/Auckland'],['Kathmandu','Asia/Kathmandu'],['Lahore','Asia/Karachi'],['Dhaka','Asia/Dhaka'],['Paris','Europe/Paris'],['Berlin','Europe/Berlin']
 ];
 cities.forEach(([name])=>{const option=document.createElement('option');option.value=name;el('birthPlaces').append(option);});
 [...new Set(cities.map(city=>city[1]))].forEach(zone=>{const option=document.createElement('option');option.value=zone;el('birthZones').append(option);});
 api.SOUNDS.forEach((sound,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=sound.hi+' / '+sound.roman+' · '+api.SIGNS[sound.sign];el('nameSound').append(option);});
 const normalize=s=>s.trim().normalize('NFC').toLowerCase();
 el('finderName').oninput=()=>{el('nameResult').hidden=true;const matches=api.suggest(el('finderName').value);el('nameSound').value=matches.length===1?String(matches[0]):'';el('nameFeedback').textContent=matches.length>1?'पहली ध्वनि अस्पष्ट है। नीचे सही हिंदी ध्वनि चुनें।':'';};
 el('nameSound').onchange=()=>{el('nameResult').hidden=true;};
 el('birthPlace').oninput=()=>{el('birthResult').hidden=true;el('birthOccurrence').value='';el('occurrenceField').hidden=true;const name=normalize(el('birthPlace').value);const city=cities.find(([label])=>label.split(' / ').some(part=>normalize(part)===name)||normalize(label)===name);el('birthZone').value=city?city[1]:'';};
 function result(container,heading,description,indices){
  container.replaceChildren();const h=document.createElement('h3');h.textContent=heading;const p=document.createElement('p');p.textContent=description;container.append(h,p);
  indices.forEach(index=>{const a=document.createElement('a');a.className='finder-view';a.href='rashi.html?sign='+index;a.textContent=api.SIGNS[index]+' का राशिफल देखें ↗';container.append(a);});container.hidden=false;
 }
 el('nameRashiForm').onsubmit=event=>{event.preventDefault();el('nameFeedback').textContent='';el('nameResult').hidden=true;try{if(!el('finderName').value.trim())throw new Error('अपना पहला नाम भरें।');const found=api.nameSign(el('nameSound').value);result(el('nameResult'),'नाम राशि: '+found.name,'पुष्टि की गई पहली ध्वनि: '+found.sound+'। यह पारंपरिक नाम-ध्वनि mapping है, जन्म की चंद्र राशि नहीं।',[found.index]);}catch(error){el('nameFeedback').textContent=error.message;}};
 ['birthDate','birthTime','birthZone'].forEach(id=>el(id).addEventListener('input',()=>{el('birthOccurrence').value='';el('occurrenceField').hidden=true;el('birthResult').hidden=true;}));
 el('birthRashiForm').onsubmit=event=>{
  event.preventDefault();el('birthFeedback').textContent='';el('birthResult').hidden=true;
  try{
   if(!el('birthPlace').value.trim())throw new Error('जन्मस्थान भरें।');
   if(!el('birthZone').value.trim())throw new Error('सूची से जन्मस्थान चुनें, या उसका सही IANA time zone भरें। भारत के लिए Asia/Kolkata है।');
   const dates=api.utcForLocal(el('birthDate').value,el('birthTime').value,el('birthZone').value.trim());
   el('occurrenceField').hidden=dates.length<2;
   if(dates.length>1&&!el('birthOccurrence').value)throw new Error('DST के कारण यह समय दो बार आया था। पहली या दूसरी बार चुनें।');
   const date=dates.length>1?dates[Number(el('birthOccurrence').value)]:dates[0];
   if(!date||date.getTime()>Date.now())throw new Error('जन्म समय भविष्य में नहीं हो सकता।');
   const found=api.moon(date);
   if(found.boundary){const other=(found.index+(found.degree<0.05?11:1))%12;result(el('birthResult'),'राशि सीमा के पास: '+found.name+' / '+api.SIGNS[other],'इस समय चंद्रमा राशि-सीमा के बहुत पास है। जन्म समय और सटीक Lahiri ephemeris से पुष्टि करें; एक निश्चित राशि बताना उचित नहीं होगा।',[found.index,other]);}
   else result(el('birthResult'),'चंद्र राशि: '+found.name,'Geocentric Moon · Lahiri का अनुमानित अयनांश। समय-क्षेत्र: '+el('birthZone').value.trim()+'। चंद्र स्थिति: '+found.degree.toFixed(2)+'° '+found.name+'।',[found.index]);
  }catch(error){el('birthFeedback').textContent=error.message||'जानकारी जाँचें और फिर कोशिश करें।';}
 };
 const tabs=[el('finderNameTab'),el('finderBirthTab')];
 function show(index){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;el(i===0?'nameFinderPanel':'birthFinderPanel').hidden=i!==index;});}
 tabs.forEach((tab,i)=>{tab.onclick=()=>show(i);tab.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-i;show(next);tabs[next].focus();}};});
})();
