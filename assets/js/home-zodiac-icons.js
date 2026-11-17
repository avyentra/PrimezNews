/* Original zodiac geometry shared with the Rashi page. */
(function(){
'use strict';
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
window.PrimezHomeZodiac = zodiac;
})();
