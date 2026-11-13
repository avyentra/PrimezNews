// Briefing strip ("बड़ी तस्वीर") as a right-to-left marquee, in the language chosen at the top of the page.
(() => {
  const el = document.getElementById('ticker');
  if (!el) return;

  const TICKER = [
    { hi: 'खेत से शहर तक। पंजाब की हर कहानी, एक जगह।', en: 'From farm to city: every Punjab story, in one place.', pa: 'ਖੇਤ ਤੋਂ ਸ਼ਹਿਰ ਤੱਕ। ਪੰਜਾਬ ਦੀ ਹਰ ਕਹਾਣੀ, ਇੱਕ ਥਾਂ।' },
    { hi: 'आपके जिले के मुद्दे। आपकी ज़िंदगी से जुड़ी बातें।', en: 'Issues from your district. Stories from your daily life.', pa: 'ਤੁਹਾਡੇ ਜ਼ਿਲ੍ਹੇ ਦੇ ਮੁੱਦੇ। ਤੁਹਾਡੀ ਜ਼ਿੰਦਗੀ ਨਾਲ ਜੁੜੀਆਂ ਗੱਲਾਂ।' },
    { hi: 'राजनीति से खेल तक—खबर के साथ उसका संदर्भ भी।', en: 'From politics to sports, every story with its context.', pa: 'ਸਿਆਸਤ ਤੋਂ ਖੇਡਾਂ ਤੱਕ, ਹਰ ਖ਼ਬਰ ਦੇ ਨਾਲ ਉਸਦਾ ਸੰਦਰਭ ਵੀ।' }
  ];
  const currentLanguage = () => (typeof currentLang !== 'undefined' && ['en', 'hi', 'pa'].includes(currentLang) ? currentLang : 'pa');
  const itemsFor = lang => TICKER.map(t => t[lang] || t.hi);

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => window.matchMedia('(max-width: 720px)').matches;
  const SEP = '  •  ';

  // The arrows swap text in app.js, which would wipe the marquee, so take them over.
  ['tickerPrev', 'tickerNext'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = null; });

  el.textContent = '';
  Object.assign(el.style, { display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' });
  const track = document.createElement('span');
  track.style.cssText = 'display:inline-block;will-change:transform';
  el.appendChild(track);

  let copyW = 0, offsets = [], x = 0, hold = false, last = 0, items = itemsFor(currentLanguage());

  function build(keepPosition) {
    const keepX = x;
    items = itemsFor(currentLanguage());
    track.textContent = '';
    const first = items.map(t => { const s = document.createElement('span'); s.textContent = t + SEP; return s; });
    first.forEach(s => track.appendChild(s));
    copyW = first.reduce((a, s) => a + s.getBoundingClientRect().width, 0);
    offsets = first.map((_, i) => first.slice(0, i).reduce((a, s) => a + s.getBoundingClientRect().width, 0));
    const copies = Math.max(2, Math.ceil(el.clientWidth / Math.max(copyW, 1)) + 1);
    for (let c = 1; c < copies; c++) items.forEach(t => { const s = document.createElement('span'); s.textContent = t + SEP; track.appendChild(s); });
    x = keepPosition && keepX ? keepX : el.clientWidth;
  }

  function frame(now) {
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (!hold && !reduceMotion && copyW > 0) {
      x -= (isPhone() ? 45 : 70) * dt;
      while (x <= -copyW) x += copyW;
    }
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(frame);
  }

  // Arrow: jump to the next or previous item's start.
  function jump(dir) {
    if (!copyW) return;
    const pos = -x;
    const base = Math.floor(pos / copyW) * copyW;
    const starts = [];
    for (let m = -1; m <= 2; m++) offsets.forEach(o => starts.push(base + m * copyW + o));
    starts.sort((a, b) => a - b);
    const target = dir > 0 ? starts.find(s => s > pos + 1) : [...starts].reverse().find(s => s < pos - 1);
    if (target !== undefined) x = -target;
  }

  const bar = el.closest('.briefing') || el;
  bar.addEventListener('pointerenter', () => { hold = true; });
  bar.addEventListener('pointerleave', () => { hold = false; });
  bar.addEventListener('touchstart', () => { hold = true; }, { passive: true });
  bar.addEventListener('touchend', () => { setTimeout(() => { hold = false; }, 2000); }, { passive: true });
  document.getElementById('tickerPrev')?.addEventListener('click', () => jump(-1));
  document.getElementById('tickerNext')?.addEventListener('click', () => jump(1));

  // Rebuild in the new language when the reader switches language (top bar buttons or the select).
  const rebuildSoon = () => setTimeout(() => build(true), 0);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.language')) rebuildSoon(); });
  document.getElementById('siteLanguage')?.addEventListener('change', rebuildSoon);

  build(false);
  if ('ResizeObserver' in window) new ResizeObserver(() => build(true)).observe(el);
  requestAnimationFrame(frame);
})();
