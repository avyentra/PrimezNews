/* Complete translations of the keyless curated guidance vocabulary. */
(function(root){'use strict';
 const rows=root.PRIMEZ_LOCALE_ROWS||[],lookup=new Map();for(const row of rows)for(const text of row)lookup.set(text.trim(),row);
 const namesHi=['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
 const namesPa=['ਮੇਖ','ਬ੍ਰਿਖ','ਮਿਥੁਨ','ਕਰਕ','ਸਿੰਘ','ਕੰਨਿਆ','ਤੁਲਾ','ਬ੍ਰਿਸ਼ਚਕ','ਧਨੁ','ਮਕਰ','ਕੁੰਭ','ਮੀਨ'];
 const namesEn=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 function text(value,lang){return lookup.get(String(value).trim())?.[{en:0,hi:1,pa:2}[lang]]??String(value);}
 function guidance(value,lang){
  if(lang==='hi')return value;
  const found=/^(आज|इस सप्ताह|इस महीने|इस वर्ष) (.+?) राशि के लिए सामान्य मार्गदर्शन: (.+)$/u.exec(value);
  if(!found)return text(value,lang);
  const index=namesHi.indexOf(found[2]);if(index<0)return text(value,lang);
  const sentences=found[3].split('।').map(s=>s.trim()).filter(Boolean);
  // Unknown future provider copy stays in its original language, rather than pretending to be translated.
  if(sentences.some(s=>!lookup.has(s)&&!lookup.has(s+'।')))return value;
  const parts=sentences.map(s=>text(lookup.has(s)?s:s+'।',lang).replace(/[।.]$/u,''));
  const period=({आज:['Today','ਅੱਜ'],'इस सप्ताह':['This week','ਇਸ ਹਫ਼ਤੇ'],'इस महीने':['This month','ਇਸ ਮਹੀਨੇ'],'इस वर्ष':['This year','ਇਸ ਸਾਲ']})[found[1]][lang==='en'?0:1];
  return lang==='en'?`${period} · ${namesEn[index]} · General guidance: ${parts.join('. ')}.`:`${period} ${namesPa[index]} ਰਾਸ਼ੀ ਲਈ ਆਮ ਮਾਰਗਦਰਸ਼ਨ: ${parts.join('। ')}।`;
 }
 root.PrimezRashiTranslations={text,guidance};
})(window);
