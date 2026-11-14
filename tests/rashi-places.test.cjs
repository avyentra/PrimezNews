const {test}=require('node:test');const assert=require('node:assert/strict');const {resolve}=require('../assets/js/rashi-places.js');
const cities=[['Abohar / अबोहर','Asia/Kolkata'],['London','Europe/London'],['Toronto','America/Toronto']];
test('recognised birthplace resolves zone from English, Hindi and Punjabi labels',()=>{for(const name of ['Abohar',' Abohar ','अबोहर','ਅਬੋਹਰ','Abohar / अबोहर'])assert.equal(resolve(name,cities,[['Abohar','अबोहर','ਅਬੋਹਰ']])[1],'Asia/Kolkata');assert.equal(resolve('London',cities)[1],'Europe/London');});
test('unknown or partial places cannot silently use the previous city time zone',()=>{for(const name of ['','Abo','Unknown village','London Ontario'])assert.equal(resolve(name,cities),null);});
