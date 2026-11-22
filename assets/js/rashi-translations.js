/* Complete translations of the keyless curated guidance vocabulary. */
(function(root){'use strict';
 const rows=root.PRIMEZ_LOCALE_ROWS||[],lookup=new Map();for(const row of rows)for(const text of row)lookup.set(text.trim(),row);
 const namesHi=['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
 const namesPa=['ਮੇਖ','ਬ੍ਰਿਖ','ਮਿਥੁਨ','ਕਰਕ','ਸਿੰਘ','ਕੰਨਿਆ','ਤੁਲਾ','ਬ੍ਰਿਸ਼ਚਕ','ਧਨੁ','ਮਕਰ','ਕੁੰਭ','ਮੀਨ'];
 const namesEn=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const planets = {
 "सूर्य": [
  "Sun",
  "ਸੂਰਜ"
 ],
 "चंद्रमा": [
  "Moon",
  "ਚੰਦਰਮਾ"
 ],
 "मंगल": [
  "Mars",
  "ਮੰਗਲ"
 ],
 "बुध": [
  "Mercury",
  "ਬੁੱਧ"
 ],
 "गुरु": [
  "Jupiter",
  "ਗੁਰੂ"
 ],
 "शुक्र": [
  "Venus",
  "ਸ਼ੁੱਕਰ"
 ],
 "शनि": [
  "Saturn",
  "ਸ਼ਨੀ"
 ],
 "राहु": [
  "Rahu",
  "ਰਾਹੂ"
 ],
 "केतु": [
  "Ketu",
  "ਕੇਤੂ"
 ]
};
 const stars = {
 "अश्विनी": [
  "Ashwini",
  "ਅਸ਼ਵਿਨੀ"
 ],
 "भरणी": [
  "Bharani",
  "ਭਰਣੀ"
 ],
 "कृत्तिका": [
  "Krittika",
  "ਕ੍ਰਿਤਿਕਾ"
 ],
 "रोहिणी": [
  "Rohini",
  "ਰੋਹਿਣੀ"
 ],
 "मृगशिरा": [
  "Mrigashira",
  "ਮ੍ਰਿਗਸ਼ਿਰਾ"
 ],
 "आर्द्रा": [
  "Ardra",
  "ਆਰਦਰਾ"
 ],
 "पुनर्वसु": [
  "Punarvasu",
  "ਪੁਨਰਵਸੂ"
 ],
 "पुष्य": [
  "Pushya",
  "ਪੁਸ਼ਯ"
 ],
 "आश्लेषा": [
  "Ashlesha",
  "ਆਸ਼ਲੇਸ਼ਾ"
 ],
 "मघा": [
  "Magha",
  "ਮਘਾ"
 ],
 "पूर्वा फाल्गुनी": [
  "Purva Phalguni",
  "ਪੂਰਵਾ ਫਾਲਗੁਨੀ"
 ],
 "उत्तरा फाल्गुनी": [
  "Uttara Phalguni",
  "ਉੱਤਰਾ ਫਾਲਗੁਨੀ"
 ],
 "हस्त": [
  "Hasta",
  "ਹਸਤ"
 ],
 "चित्रा": [
  "Chitra",
  "ਚਿੱਤਰਾ"
 ],
 "स्वाति": [
  "Swati",
  "ਸਵਾਤੀ"
 ],
 "विशाखा": [
  "Vishakha",
  "ਵਿਸ਼ਾਖਾ"
 ],
 "अनुराधा": [
  "Anuradha",
  "ਅਨੁਰਾਧਾ"
 ],
 "ज्येष्ठा": [
  "Jyeshtha",
  "ਜੇਠਾ"
 ],
 "मूल": [
  "Mula",
  "ਮੂਲ"
 ],
 "पूर्वाषाढ़ा": [
  "Purva Ashadha",
  "ਪੂਰਵਾਸ਼ਾੜ੍ਹਾ"
 ],
 "उत्तराषाढ़ा": [
  "Uttara Ashadha",
  "ਉੱਤਰਾਸ਼ਾੜ੍ਹਾ"
 ],
 "श्रवण": [
  "Shravana",
  "ਸ੍ਰਵਣ"
 ],
 "धनिष्ठा": [
  "Dhanishta",
  "ਧਨਿਸ਼ਠਾ"
 ],
 "शतभिषा": [
  "Shatabhisha",
  "ਸ਼ਤਭਿਸ਼ਾ"
 ],
 "पूर्वा भाद्रपद": [
  "Purva Bhadrapada",
  "ਪੂਰਵਾ ਭਾਦਰਪਦ"
 ],
 "उत्तरा भाद्रपद": [
  "Uttara Bhadrapada",
  "ਉੱਤਰਾ ਭਾਦਰਪਦ"
 ],
 "रेवती": [
  "Revati",
  "ਰੇਵਤੀ"
 ]
};
 const houses = {
 "पहले": [
  "first",
  "ਪਹਿਲੇ"
 ],
 "दूसरे": [
  "second",
  "ਦੂਜੇ"
 ],
 "तीसरे": [
  "third",
  "ਤੀਜੇ"
 ],
 "चौथे": [
  "fourth",
  "ਚੌਥੇ"
 ],
 "पाँचवें": [
  "fifth",
  "ਪੰਜਵੇਂ"
 ],
 "छठे": [
  "sixth",
  "ਛੇਵੇਂ"
 ],
 "सातवें": [
  "seventh",
  "ਸੱਤਵੇਂ"
 ],
 "आठवें": [
  "eighth",
  "ਅੱਠਵੇਂ"
 ],
 "नौवें": [
  "ninth",
  "ਨੌਵੇਂ"
 ],
 "दसवें": [
  "tenth",
  "ਦਸਵੇਂ"
 ],
 "ग्यारहवें": [
  "eleventh",
  "ਗਿਆਰ੍ਹਵੇਂ"
 ],
 "बारहवें": [
  "twelfth",
  "ਬਾਰ੍ਹਵੇਂ"
 ]
};
 const topics = {
 "स्वास्थ्य और व्यक्तित्व": [
  "health and personality",
  "ਸਿਹਤ ਅਤੇ ਸ਼ਖ਼ਸੀਅਤ"
 ],
 "धन, वाणी और परिवार": [
  "money, speech and family",
  "ਧਨ, ਬੋਲਚਾਲ ਅਤੇ ਪਰਿਵਾਰ"
 ],
 "साहस, प्रयास और छोटे भाई-बहन": [
  "initiative, effort and younger siblings",
  "ਹਿੰਮਤ, ਯਤਨ ਅਤੇ ਛੋਟੇ ਭੈਣ-ਭਰਾ"
 ],
 "घर, माता और मन की शांति": [
  "home, mother and peace of mind",
  "ਘਰ, ਮਾਂ ਅਤੇ ਮਨ ਦੀ ਸ਼ਾਂਤੀ"
 ],
 "शिक्षा, रचनात्मकता और प्रेम": [
  "learning, creativity and love",
  "ਸਿੱਖਿਆ, ਰਚਨਾਤਮਕਤਾ ਅਤੇ ਪਿਆਰ"
 ],
 "काम की प्रतिस्पर्धा और दिनचर्या": [
  "competition at work and daily habits",
  "ਕੰਮ ਵਿੱਚ ਮੁਕਾਬਲਾ ਅਤੇ ਰੁਟੀਨ"
 ],
 "साझेदारी और जीवनसाथी": [
  "partnerships and married life",
  "ਭਾਈਵਾਲੀ ਅਤੇ ਜੀਵਨ ਸਾਥੀ"
 ],
 "अचानक बदलाव और जोखिम": [
  "sudden changes and risk",
  "ਅਚਾਨਕ ਬਦਲਾਅ ਅਤੇ ਜੋਖਮ"
 ],
 "भाग्य, यात्रा और बड़ों का मार्गदर्शन": [
  "fortune, travel and guidance from elders",
  "ਕਿਸਮਤ, ਸਫ਼ਰ ਅਤੇ ਵੱਡਿਆਂ ਦੀ ਸਲਾਹ"
 ],
 "करियर और कामकाज": [
  "career and work",
  "ਕਰੀਅਰ ਅਤੇ ਕੰਮਕਾਜ"
 ],
 "आय, लाभ और मित्र": [
  "income, gains and friends",
  "ਆਮਦਨ, ਲਾਭ ਅਤੇ ਦੋਸਤ"
 ],
 "खर्च, विश्राम और यात्रा": [
  "spending, rest and travel",
  "ਖ਼ਰਚ, ਆਰਾਮ ਅਤੇ ਸਫ਼ਰ"
 ]
};
 const days = {
 "सोमवार": [
  "Monday",
  "ਸੋਮਵਾਰ"
 ],
 "मंगलवार": [
  "Tuesday",
  "ਮੰਗਲਵਾਰ"
 ],
 "बुधवार": [
  "Wednesday",
  "ਬੁੱਧਵਾਰ"
 ],
 "गुरुवार": [
  "Thursday",
  "ਵੀਰਵਾਰ"
 ],
 "शुक्रवार": [
  "Friday",
  "ਸ਼ੁੱਕਰਵਾਰ"
 ],
 "शनिवार": [
  "Saturday",
  "ਸ਼ਨੀਵਾਰ"
 ],
 "रविवार": [
  "Sunday",
  "ਐਤਵਾਰ"
 ]
};
 const periods = {
 "यह सप्ताह": [
  "this week",
  "ਇਸ ਹਫ਼ਤੇ"
 ],
 "यह महीना": [
  "this month",
  "ਇਸ ਮਹੀਨੇ"
 ],
 "यह वर्ष": [
  "this year",
  "ਇਸ ਸਾਲ"
 ]
};
 const outcomes = {
 "सतर्कता रखने का समय है": [
  "calls for caution",
  "ਸਾਵਧਾਨ ਰਹਿਣ ਦਾ ਸਮਾਂ ਹੈ"
 ],
 "मिली-जुली स्थिति रहने की संभावना है": [
  "may bring mixed conditions",
  "ਮਿਲੇ-ਜੁਲੇ ਹਾਲਾਤ ਰਹਿ ਸਕਦੇ ਹਨ"
 ],
 "आमतौर पर अनुकूल स्थिति है": [
  "looks generally favourable",
  "ਆਮ ਤੌਰ ਤੇ ਹਾਲਾਤ ਅਨੁਕੂਲ ਹਨ"
 ],
 "स्थिति अनुकूल रहने की संभावना है": [
  "may be favourable",
  "ਹਾਲਾਤ ਅਨੁਕੂਲ ਰਹਿ ਸਕਦੇ ਹਨ"
 ]
};
 const advice = {
 "आत्मविश्वास और मान-सम्मान का साथ मिल सकता है": [
  "confidence and recognition may follow",
  "ਆਤਮਵਿਸ਼ਵਾਸ ਅਤੇ ਮਾਣ ਮਿਲ ਸਕਦਾ ਹੈ"
 ],
 "मन हल्का और उत्साही रह सकता है": [
  "you may feel lighter and more enthusiastic",
  "ਮਨ ਹੌਲਾ ਤੇ ਉਤਸ਼ਾਹੀ ਰਹਿ ਸਕਦਾ ਹੈ"
 ],
 "ऊर्जा और साहस से काम आगे बढ़ सकता है": [
  "energy and courage may help work progress",
  "ਊਰਜਾ ਤੇ ਹਿੰਮਤ ਨਾਲ ਕੰਮ ਅੱਗੇ ਵਧ ਸਕਦਾ ਹੈ"
 ],
 "बातचीत और समझदारी भरे निर्णय सहायक रह सकते हैं": [
  "conversation and thoughtful decisions may help",
  "ਗੱਲਬਾਤ ਅਤੇ ਸੋਚੇ ਸਮਝੇ ਫ਼ੈਸਲੇ ਮਦਦ ਕਰ ਸਕਦੇ ਹਨ"
 ],
 "अनुभवी लोगों की सलाह और शुभ अवसर मिल सकते हैं": [
  "experienced advice and opportunities may arise",
  "ਤਜਰਬੇਕਾਰ ਲੋਕਾਂ ਦੀ ਸਲਾਹ ਤੇ ਚੰਗੇ ਮੌਕੇ ਮਿਲ ਸਕਦੇ ਹਨ"
 ],
 "सौहार्द और सुख-सुविधा का माहौल बन सकता है": [
  "harmony and comfort may follow",
  "ਮੇਲ-ਮਿਲਾਪ ਤੇ ਸੁੱਖ ਮਿਲ ਸਕਦਾ ਹੈ"
 ],
 "अनुशासन और लगातार मेहनत का अच्छा फल मिल सकता है": [
  "steady work and discipline may pay off",
  "ਅਨੁਸ਼ਾਸਨ ਤੇ ਲਗਾਤਾਰ ਮਿਹਨਤ ਫਲ ਦੇ ਸਕਦੀ ਹੈ"
 ],
 "नए अवसर मिल सकते हैं, पर सोच-समझकर आगे बढ़ें": [
  "new opportunities may arise; proceed thoughtfully",
  "ਨਵੇਂ ਮੌਕੇ ਮਿਲ ਸਕਦੇ ਹਨ; ਸੋਚ ਕੇ ਅੱਗੇ ਵਧੋ"
 ],
 "आत्मचिंतन से स्पष्टता मिल सकती है": [
  "reflection may bring clarity",
  "ਆਤਮ-ਚਿੰਤਨ ਨਾਲ ਸਪਸ਼ਟਤਾ ਆ ਸਕਦੀ ਹੈ"
 ],
 "अहंकार और जल्दबाज़ी से बचें": [
  "avoid pride and haste",
  "ਹੰਕਾਰ ਅਤੇ ਕਾਹਲੀ ਤੋਂ ਬਚੋ"
 ],
 "भावनाओं में बहकर फैसले न लें": [
  "avoid decisions driven by emotion",
  "ਭਾਵਨਾਵਾਂ ਵਿੱਚ ਆ ਕੇ ਫ਼ੈਸਲੇ ਨਾ ਲਵੋ"
 ],
 "गुस्से और जल्दबाज़ी से बचें": [
  "avoid anger and haste",
  "ਗੁੱਸੇ ਅਤੇ ਕਾਹਲੀ ਤੋਂ ਬਚੋ"
 ],
 "बातचीत और कागज़ी काम में सावधानी रखें": [
  "take care with conversations and paperwork",
  "ਗੱਲਬਾਤ ਤੇ ਕਾਗਜ਼ੀ ਕੰਮ ਧਿਆਨ ਨਾਲ ਕਰੋ"
 ],
 "बड़े वादों और अति-आत्मविश्वास से बचें": [
  "avoid overconfidence and grand promises",
  "ਵੱਡੇ ਵਾਅਦਿਆਂ ਅਤੇ ਹੱਦੋਂ ਵੱਧ ਭਰੋਸੇ ਤੋਂ ਬਚੋ"
 ],
 "दिखावे और फिजूलखर्ची से बचें": [
  "avoid showy or unnecessary spending",
  "ਦਿਖਾਵੇ ਤੇ ਫ਼ਜ਼ੂਲ ਖ਼ਰਚ ਤੋਂ ਬਚੋ"
 ],
 "धैर्य रखें; काम में देरी संभव है": [
  "be patient; work may be delayed",
  "ਸਬਰ ਰੱਖੋ; ਕੰਮ ਵਿੱਚ ਦੇਰੀ ਹੋ ਸਕਦੀ ਹੈ"
 ],
 "भ्रम या अफ़वाहों पर भरोसा न करें": [
  "verify rumours before believing them",
  "ਅਫ਼ਵਾਹਾਂ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ"
 ],
 "बेचैनी में जल्दबाज़ी न करें": [
  "avoid hasty decisions when restless",
  "ਬੇਚੈਨੀ ਵਿੱਚ ਕਾਹਲੀ ਨਾ ਕਰੋ"
 ]
};
 const details = {
 "करियर में धैर्य रखें; जल्दबाज़ी में बड़ा फैसला न लें और ज़िम्मेदारियाँ साफ़ रखें।": [
  "Be patient at work. Clarify responsibilities before making a major decision.",
  "ਕੰਮ ਵਿੱਚ ਸਬਰ ਰੱਖੋ। ਵੱਡਾ ਫ਼ੈਸਲਾ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਜ਼ਿੰਮੇਵਾਰੀਆਂ ਸਪਸ਼ਟ ਕਰੋ।"
 ],
 "करियर में मिली-जुली स्थिति है; अनुशासन रखकर एक-एक काम पूरा करें।": [
  "Work may be mixed. Finish one task at a time.",
  "ਕੰਮ ਵਿੱਚ ਮਿਲੇ-ਜੁਲੇ ਹਾਲਾਤ ਹੋ ਸਕਦੇ ਹਨ। ਇੱਕ ਵੇਲੇ ਇੱਕ ਕੰਮ ਪੂਰਾ ਕਰੋ।"
 ],
 "सूर्य और शनि के अनुकूल गोचर से करियर में मेहनत का फल और मान-सम्मान मिल सकता है।": [
  "Favourable Sun and Saturn transits may bring recognition for sustained effort.",
  "ਸੂਰਜ ਅਤੇ ਸ਼ਨੀ ਦੇ ਅਨੁਕੂਲ ਗੋਚਰ ਨਾਲ ਮਿਹਨਤ ਦਾ ਫਲ ਤੇ ਮਾਣ ਮਿਲ ਸਕਦਾ ਹੈ।"
 ],
 "आर्थिक निर्णयों में जल्दबाज़ी न करें; बड़े खर्च और निवेश से पहले जोखिम समझें।": [
  "Review risk before large purchases or investments.",
  "ਵੱਡੇ ਖ਼ਰਚ ਜਾਂ ਨਿਵੇਸ਼ ਤੋਂ ਪਹਿਲਾਂ ਜੋਖਮ ਸਮਝੋ।"
 ],
 "धन के मामलों में मिली-जुली स्थिति है; बजट बनाकर चलें और खर्च लिखें।": [
  "Keep a budget and track spending during mixed financial conditions.",
  "ਮਿਲੇ-ਜੁਲੇ ਆਰਥਿਕ ਹਾਲਾਤ ਵਿੱਚ ਬਜਟ ਬਣਾਓ ਅਤੇ ਖ਼ਰਚ ਲਿਖੋ।"
 ],
 "गुरु और शुक्र के अनुकूल गोचर से आय और बचत की स्थिति अच्छी रह सकती है; फिर भी खर्च का हिसाब रखें।": [
  "Jupiter and Venus may favour income and savings. Keep track of expenses.",
  "ਗੁਰੂ ਅਤੇ ਸ਼ੁੱਕਰ ਆਮਦਨ ਤੇ ਬੱਚਤ ਲਈ ਅਨੁਕੂਲ ਹੋ ਸਕਦੇ ਹਨ। ਖ਼ਰਚ ਦਾ ਹਿਸਾਬ ਰੱਖੋ।"
 ],
 "भावनाओं में बहकर कुछ न कहें; पहले सामने वाले की बात समझें।": [
  "Hear the other person out before speaking in the heat of the moment.",
  "ਭਾਵਨਾਵਾਂ ਵਿੱਚ ਬੋਲਣ ਤੋਂ ਪਹਿਲਾਂ ਦੂਜੇ ਦੀ ਗੱਲ ਸੁਣੋ।"
 ],
 "रिश्तों में हल्का उतार-चढ़ाव संभव है; धैर्य से सुनें और बात करें।": [
  "Relationships may fluctuate. Listen and speak patiently.",
  "ਰਿਸ਼ਤਿਆਂ ਵਿੱਚ ਉਤਰਾਅ-ਚੜ੍ਹਾਅ ਹੋ ਸਕਦਾ ਹੈ। ਸਬਰ ਨਾਲ ਸੁਣੋ ਅਤੇ ਗੱਲ ਕਰੋ।"
 ],
 "शुक्र और चंद्रमा अनुकूल हैं; रिश्तों में सौहार्द और खुलकर बात करने का अच्छा समय है।": [
  "Venus and the Moon may favour harmony and open conversation.",
  "ਸ਼ੁੱਕਰ ਤੇ ਚੰਦਰਮਾ ਮੇਲ-ਮਿਲਾਪ ਅਤੇ ਖੁੱਲ੍ਹੀ ਗੱਲਬਾਤ ਲਈ ਅਨੁਕੂਲ ਹੋ ਸਕਦੇ ਹਨ।"
 ],
 "परिवार में मतभेद हो तो शांत होकर बात करें और बड़ों का सम्मान रखें।": [
  "Discuss disagreements calmly and respect older family members.",
  "ਮਤਭੇਦ ਹੋਣ ਤੇ ਸ਼ਾਂਤੀ ਨਾਲ ਗੱਲ ਕਰੋ ਅਤੇ ਵੱਡਿਆਂ ਦਾ ਸਤਿਕਾਰ ਕਰੋ।"
 ],
 "घर में छोटी बातों पर सहमति बनाने के लिए समय निकालें।": [
  "Set aside time to agree on small household matters.",
  "ਘਰ ਦੀਆਂ ਛੋਟੀਆਂ ਗੱਲਾਂ ਉੱਤੇ ਸਹਿਮਤੀ ਬਣਾਉਣ ਲਈ ਸਮਾਂ ਕੱਢੋ।"
 ],
 "चंद्रमा और गुरु अनुकूल हैं; परिवार में सहयोग और शांति का माहौल रह सकता है।": [
  "The Moon and Jupiter may favour cooperation and peace at home.",
  "ਚੰਦਰਮਾ ਤੇ ਗੁਰੂ ਘਰ ਵਿੱਚ ਸਹਿਯੋਗ ਅਤੇ ਸ਼ਾਂਤੀ ਲਈ ਅਨੁਕੂਲ ਹੋ ਸਕਦੇ ਹਨ।"
 ],
 "थकान से बचें और पर्याप्त आराम करें; लगातार परेशानी हो तो योग्य चिकित्सक से सलाह लें।": [
  "Rest adequately. Seek qualified care for persistent symptoms.",
  "ਪੂਰਾ ਆਰਾਮ ਕਰੋ। ਤਕਲੀਫ਼ ਬਣੀ ਰਹੇ ਤਾਂ ਯੋਗ ਡਾਕਟਰ ਨਾਲ ਗੱਲ ਕਰੋ।"
 ],
 "स्वास्थ्य सामान्य रह सकता है; नींद और भोजन का समय नियमित रखें।": [
  "Keep sleep and mealtimes regular.",
  "ਸੌਣ ਅਤੇ ਖਾਣ ਦਾ ਸਮਾਂ ਨਿਯਮਤ ਰੱਖੋ।"
 ],
 "मंगल और शनि अनुकूल हैं; नियमित दिनचर्या से ऊर्जा बनी रह सकती है।": [
  "Mars and Saturn may favour a steady routine and energy.",
  "ਮੰਗਲ ਤੇ ਸ਼ਨੀ ਅਨੁਕੂਲ ਹਨ। ਨਿਯਮਤ ਰੁਟੀਨ ਨਾਲ ਊਰਜਾ ਬਣੀ ਰਹਿ ਸਕਦੀ ਹੈ।"
 ],
 "कुछ मिनट शांत बैठकर गहरी साँस लें और मन को स्थिर करें।": [
  "Sit quietly and breathe deeply for a few minutes.",
  "ਕੁਝ ਮਿੰਟ ਸ਼ਾਂਤ ਬੈਠ ਕੇ ਡੂੰਘੇ ਸਾਹ ਲਵੋ।"
 ],
 "गुस्सा आए तो जवाब देने से पहले दस तक गिनें और हल्का व्यायाम करें।": [
  "Count to ten before replying in anger and try light exercise.",
  "ਗੁੱਸੇ ਵਿੱਚ ਜਵਾਬ ਤੋਂ ਪਹਿਲਾਂ ਦਸ ਤੱਕ ਗਿਣੋ ਅਤੇ ਹਲਕੀ ਕਸਰਤ ਕਰੋ।"
 ],
 "किसी ज़रूरतमंद या बुज़ुर्ग की मदद करें और काम समय पर पूरा करें।": [
  "Help an older person or someone in need and finish work on time.",
  "ਕਿਸੇ ਲੋੜਵੰਦ ਜਾਂ ਬਜ਼ੁਰਗ ਦੀ ਮਦਦ ਕਰੋ ਅਤੇ ਕੰਮ ਸਮੇਂ ਸਿਰ ਮੁਕਾਓ।"
 ],
 "सुबह कुछ देर धूप में टहलें और दिन की योजना लिखें।": [
  "Take a short morning walk in daylight and write your plan.",
  "ਸਵੇਰੇ ਧੁੱਪ ਵਿੱਚ ਥੋੜ੍ਹਾ ਟਹਿਲੋ ਅਤੇ ਦਿਨ ਦੀ ਯੋਜਨਾ ਲਿਖੋ।"
 ],
 "आसपास की सफ़ाई पर थोड़ा समय दें और किसी अपने से अच्छे से बात करें।": [
  "Tidy your surroundings and talk kindly with someone close.",
  "ਆਲੇ-ਦੁਆਲੇ ਸਫ਼ਾਈ ਕਰੋ ਅਤੇ ਕਿਸੇ ਆਪਣੇ ਨਾਲ ਪਿਆਰ ਨਾਲ ਗੱਲ ਕਰੋ।"
 ],
 "ज़रूरी संदेश या कागज़ भेजने से पहले एक बार दोबारा जाँच लें।": [
  "Double-check important messages and documents before sending.",
  "ਜ਼ਰੂਰੀ ਸੁਨੇਹਾ ਜਾਂ ਦਸਤਾਵੇਜ਼ ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਮੁੜ ਜਾਂਚੋ।"
 ],
 "किसी बड़े या शिक्षक से सलाह लें और कुछ नया सीखें।": [
  "Ask an elder or teacher for advice and learn something new.",
  "ਵੱਡੇ ਜਾਂ ਅਧਿਆਪਕ ਦੀ ਸਲਾਹ ਲਵੋ ਅਤੇ ਕੁਝ ਨਵਾਂ ਸਿੱਖੋ।"
 ],
 "अफ़वाहों से दूर रहें; जानकारी की पुष्टि करके ही मानें।": [
  "Verify information before trusting rumours.",
  "ਅਫ਼ਵਾਹ ਮੰਨਣ ਤੋਂ ਪਹਿਲਾਂ ਜਾਣਕਾਰੀ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।"
 ],
 "किसी की मदद करें और दिन की एक अच्छी बात लिखें।": [
  "Help someone and write down one good thing from the day.",
  "ਕਿਸੇ ਦੀ ਮਦਦ ਕਰੋ ਅਤੇ ਦਿਨ ਦੀ ਇੱਕ ਚੰਗੀ ਗੱਲ ਲਿਖੋ।"
 ]
};
 for (const [hi,[en,pa]] of Object.entries(details)) lookup.set(hi,[en,hi,pa]);
 function transit(sentence,lang){
   const i=lang==='en'?0:1;
   const sign=name=>(i===0?namesEn:namesPa)[namesHi.indexOf(name)];
   let m=/^आज चंद्रमा (.+) राशि में (.+) नक्षत्र में रहेगा$/.exec(sentence);
   if(m && sign(m[1]) && stars[m[2]]) return i===0 ? `Today the Moon is in ${sign(m[1])}, in the ${stars[m[2]][i]} nakshatra` : `ਅੱਜ ਚੰਦਰਮਾ ${sign(m[1])} ਰਾਸ਼ੀ ਦੇ ${stars[m[2]][i]} ਨਕਸ਼ਤਰ ਵਿੱਚ ਹੈ`;
   m=/^दिन में चंद्रमा (.+) राशि में प्रवेश करेगा$/.exec(sentence);
   if(m && sign(m[1])) return i===0 ? `The Moon enters ${sign(m[1])} later today` : `ਦਿਨ ਵਿੱਚ ਚੰਦਰਮਾ ${sign(m[1])} ਰਾਸ਼ੀ ਵਿੱਚ ਦਾਖਲ ਹੋਵੇਗਾ`;
   m=/^आज (.+) है$/.exec(sentence);
   if(m && days[m[1]]) return i===0 ? 'Today is '+days[m[1]][i] : 'ਅੱਜ '+days[m[1]][i]+' ਹੈ';
   m=/^कुल मिलाकर (यह सप्ताह|यह महीना|यह वर्ष) (.+)$/.exec(sentence);
   if(m && outcomes[m[2]]) return i===0 ? `Overall, ${periods[m[1]][i]} ${outcomes[m[2]][i]}` : `ਕੁੱਲ ਮਿਲਾ ਕੇ ${periods[m[1]][i]} ${outcomes[m[2]][i]}`;
   m=/^(.+) आपकी चंद्र राशि से (.+) भाव में है, (?:जो (.+) के लिए अनुकूल माना जाता है; |इसलिए (.+?) में )(.+)$/.exec(sentence);
   if(!m || !planets[m[1]] || !houses[m[2]] || !topics[m[3]||m[4]] || !advice[m[5]]) return null;
   const planet=planets[m[1]][i], house=houses[m[2]][i], topic=topics[m[3]||m[4]][i], reading=advice[m[5]][i];
   return i===0 ? `${planet} is in the ${house} house from your Moon sign. Regarding ${topic}, ${reading}` : `${planet} ਤੁਹਾਡੀ ਚੰਦਰ ਰਾਸ਼ੀ ਤੋਂ ${house} ਭਾਵ ਵਿੱਚ ਹੈ। ${topic} ਦੇ ਮਾਮਲੇ ਵਿੱਚ ${reading}`;
 }
 function text(value,lang){return lookup.get(String(value).trim())?.[{en:0,hi:1,pa:2}[lang]]??String(value);}
 function guidance(value,lang){
  if(lang==='hi')return value;
  const found=/^(आज|इस सप्ताह|इस महीने|इस वर्ष) (.+?) राशि के लिए सामान्य मार्गदर्शन: (.+)$/u.exec(value);
  if(!found){
    const translated=String(value).split('।').map(s=>s.trim()).filter(Boolean).map(s=>transit(s,lang));
    if(translated.length && translated.every(Boolean)) return translated.join(lang==='en'?'. ':'। ')+(lang==='en'?'.':'।');
    return text(value,lang);
  }
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
