// Briefing strip ("बड़ी तस्वीर") as a right-to-left marquee. Loads after locale.js so translated text is measured.
(() => {
  const el = document.getElementById('ticker');
  if (!el || typeof tickerItems === 'undefined' || !tickerItems.length) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => window.matchMedia('(max-width: 720px)').matches;
  const SEP = '  •  ';
  const items = tickerItems;

  // Take over the arrows from app.js (they used to swap text, which would wipe the marquee).
  ['tickerPrev', 'tickerNext'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = null; });

  el.textContent = '';
  Object.assign(el.style, { display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' });
  const track = document.createElement('span');
  track.style.cssText = 'display:inline-block;will-change:transform';
  el.appendChild(track);

  let copyW = 0, offsets = [], x = 0, hold = false, last = 0;

  function build() {
    const keepX = x;
    track.textContent = '';
    const first = items.map(t => { const s = document.createElement('span'); s.textContent = t + SEP; return s; });
    first.forEach(s => track.appendChild(s));
    copyW = first.reduce((a, s) => a + s.getBoundingClientRect().width, 0);
    offsets = first.map((_, i) => first.slice(0, i).reduce((a, s) => a + s.getBoundingClientRect().width, 0));
    // Repeat the set enough times to fill the strip, so the loop never shows a gap.
    const copies = Math.max(2, Math.ceil(el.clientWidth / Math.max(copyW, 1)) + 1);
    for (let c = 1; c < copies; c++) items.forEach(t => { const s = document.createElement('span'); s.textContent = t + SEP; track.appendChild(s); });
    x = keepX || el.clientWidth;
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

  build();
  if ('ResizeObserver' in window) new ResizeObserver(() => build()).observe(el);
  requestAnimationFrame(frame);
})();
