/* Resolve the selected supported city locally; never guess a time zone. */
(function(root){'use strict';const normalize=s=>String(s||'').trim().normalize('NFC').toLowerCase().replace(/\s+/g,' ');
 function resolve(input,cities,translations=[]){const q=normalize(input);if(!q)return null;return cities.find(([label])=>{const parts=label.split(' / ');const translated=translations.find(row=>normalize(row[0])===normalize(parts[0]));return [...parts,label,...(translated||[]),...(translated?[parts[0]+' / '+translated[2]]:[])].some(alias=>normalize(alias)===q);})||null;}
 const api={resolve};if(typeof module==='object'&&module.exports)module.exports=api;else root.PrimezRashiPlaces=api;
})(typeof window==='object'?window:globalThis);
