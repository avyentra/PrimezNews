/* Market rates page: live Chandigarh rates (auto-refresh) + official MSP tables. Data: data/market-rates.json, data/msp.json */
(function () {
  'use strict';
  const host = document.getElementById('mandiLive');
  if (!host) return;
  const lang = () => ['pa', 'hi', 'en'].includes(document.documentElement.lang) ? document.documentElement.lang : 'pa';
  const T = (pa, hi, en) => ({ pa, hi, en })[lang()];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const inr = (n, d) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: d == null ? 2 : d });
  const KINDS = [
    ['gold', 'ਸੋਨਾ 24K', 'सोना 24K', 'Gold 24K', 'ਪ੍ਰਤੀ 10 ਗ੍ਰਾਮ', 'प्रति 10 ग्राम', 'per 10 g', '🪙'],
    ['petrol', 'ਪੈਟਰੋਲ', 'पेट्रोल', 'Petrol', 'ਪ੍ਰਤੀ ਲੀਟਰ', 'प्रति लीटर', 'per litre', '⛽'],
    ['diesel', 'ਡੀਜ਼ਲ', 'डीज़ल', 'Diesel', 'ਪ੍ਰਤੀ ਲੀਟਰ', 'प्रति लीटर', 'per litre', '🛢️']
  ];
  let rates = null, msp = null, ok = true, shown = {};
  function ago(iso) {
    const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return T('ਹੁਣੇ', 'अभी', 'just now');
    if (m < 60) return T(m + ' ਮਿੰਟ ਪਹਿਲਾਂ', m + ' मिनट पहले', m + ' min ago');
    const h = Math.round(m / 60);
    return h < 24 ? T(h + ' ਘੰਟੇ ਪਹਿਲਾਂ', h + ' घंटे पहले', h + ' h ago') : T('ਪੁਰਾਣਾ ਰੇਟ', 'पुराना रेट', 'older rate');
  }
  function dateText(d) {
    const x = new Date(d + 'T00:00:00+05:30'); if (isNaN(x)) return d;
    return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  }
  function drawRates() {
    const box = host.querySelector('[data-rates]'); if (!box) return;
    const cards = KINDS.map(([k, pa, hi, en, upa, uhi, uen, icon]) => {
      const q = rates && rates[k], c = el('article', 'mb-card');
      c.append(el('span', 'mb-ico', icon));
      const body = el('div', 'mb-body');
      body.append(el('small', '', T(pa, hi, en) + ' · ' + T('ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़', 'Chandigarh')));
      if (!q || !(q.price > 0)) { body.append(el('b', 'mb-price', '—'), el('span', 'mb-meta', T('ਰੇਟ ਦੀ ਉਡੀਕ', 'दर की प्रतीक्षा', 'Awaiting rate'))); c.append(body); return c; }
      const price = el('b', 'mb-price', inr(q.price));
      if (shown[k] != null && shown[k] !== q.price) { c.classList.add('mb-flash'); }
      shown[k] = q.price;
      body.append(price, el('span', 'mb-unit', T(upa, uhi, uen)));
      if (q.prev > 0 && q.prev !== q.price) {
        const diff = q.price - q.prev, up = diff > 0;
        body.append(el('span', 'mb-chg ' + (up ? 'up' : 'down'), (up ? '▲ ' : '▼ ') + inr(Math.abs(diff)) + ' ' + T('ਪਿਛਲੇ ਰੇਟ ਤੋਂ', 'पिछले रेट से', 'vs previous')));
      }
      const meta = el('span', 'mb-meta', dateText(q.date) + ' · ');
      const a = el('a', '', 'Goodreturns'); a.href = q.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; meta.append(a);
      body.append(meta); c.append(body); return c;
    });
    box.replaceChildren(...cards);
    drawStamp();
  }
  function drawStamp() {
    const s = host.querySelector('[data-stamp]'); if (!s) return;
    const checks = rates ? KINDS.map(([k]) => rates[k] && rates[k].checked).filter(Boolean).sort() : [];
    const last = checks.length ? checks[checks.length - 1] : '';
    s.replaceChildren(el('i', ok ? 'mb-dot' : 'mb-dot off'),
      el('b', '', ok ? T('ਲਾਈਵ', 'लाइव', 'LIVE') : T('ਔਫ਼ਲਾਈਨ', 'ऑफ़लाइन', 'OFFLINE')),
      el('span', '', last ? ' · ' + T('ਆਖ਼ਰੀ ਜਾਂਚ ', 'आख़िरी जाँच ', 'Last checked ') + ago(last) : ' · ' + T('ਹਰ ਘੰਟੇ ਅੱਪਡੇਟ', 'हर घंटे अपडेट', 'Updated every hour')));
  }
  function drawMsp() {
    const box = host.querySelector('[data-msp]'); if (!box || !msp) return;
    box.replaceChildren(...msp.seasons.map(s => {
      const sec = el('section', 'mb-msp'), h = el('h3', '', s[lang()] || s.en);
      const tbl = el('table'), body = el('tbody');
      tbl.append(el('caption', 'mb-sr', s.en));
      const head = el('thead'), hr = el('tr');
      hr.append(el('th', '', T('ਫ਼ਸਲ', 'फसल', 'Crop')), el('th', 'n', T('MSP (₹/ਕੁਇੰਟਲ)', 'MSP (₹/क्विंटल)', 'MSP (₹/quintal)')));
      head.append(hr); tbl.append(head);
      s.crops.forEach(c => { const tr = el('tr'); tr.append(el('td', '', { pa: c[1], hi: c[2], en: c[3] }[lang()]), el('td', 'n', inr(c[4], 0))); body.append(tr); });
      tbl.append(body);
      const src = el('a', 'mb-src', T('ਸਰੋਤ ↗', 'स्रोत ↗', 'Source ↗')); src.href = s.source; src.target = '_blank'; src.rel = 'noopener noreferrer';
      sec.append(h, tbl, src); return sec;
    }));
  }
  async function load() {
    try {
      const r = await fetch('data/market-rates.json', { cache: 'no-cache' });
      if (!r.ok) throw Error('x');
      rates = await r.json(); ok = true;
    } catch { ok = false; }
    drawRates();
  }
  host.innerHTML = '<div class="mb-live" data-stamp></div><div class="mb-grid" data-rates></div><div class="mb-msp-wrap"><h2 class="topic-section-title"><span data-frame-lang="pa">ਫ਼ਸਲਾਂ ਦਾ ਸਰਕਾਰੀ ਘੱਟੋ-ਘੱਟ ਸਮਰਥਨ ਮੁੱਲ (MSP)</span><span data-frame-lang="hi">फसलों का सरकारी न्यूनतम समर्थन मूल्य (MSP)</span><span data-frame-lang="en">Official crop support prices (MSP)</span></h2><div class="mb-msp-grid" data-msp></div></div>';
  load();
  fetch('data/msp.json').then(r => r.ok ? r.json() : null).then(d => { msp = d; drawMsp(); }).catch(() => {});
  setInterval(() => { if (!document.hidden) load(); }, 60000);          // new rates appear without a refresh
  setInterval(drawStamp, 30000);                                          // "x min ago" keeps counting
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  document.addEventListener('primez-language-change', () => { drawRates(); drawMsp(); });
  new MutationObserver(() => { drawRates(); drawMsp(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
