/* Topic pages (jobs, health-beauty, nri, videos, mandi-bhav, hukamnama, sarkari-yojana):
   shows related news (seed + published cloud stories) filtered by keywords / category. */
(function () {
  'use strict';
  const main = document.querySelector('main[data-topic]');
  if (!main) return;
  const box = document.getElementById('topicNews');
  const baseKeys = (main.dataset.keywords || '').split('|').map(k => k.trim().toLowerCase()).filter(Boolean);
  let keys = baseKeys;
  const cats = (main.dataset.categories || '').split('|').filter(Boolean);
  const lang = () => (window.PrimezLanguage && window.PrimezLanguage.get()) || document.documentElement.lang || 'pa';
  const pick = (pa, hi, en) => ({ pa, hi, en })[lang()] || pa;
  const node = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const title = s => (lang() === 'en' ? s.en : lang() === 'hi' ? (s.hi || s.title) : s.pa) || s.pa || s.title || s.en || '';
  const DIST = { Amritsar: ['ਅੰਮ੍ਰਿਤਸਰ', 'अमृतसर'], Bathinda: ['ਬਠਿੰਡਾ', 'बठिंडा'], Chandigarh: ['ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़'], Jalandhar: ['ਜਲੰਧਰ', 'जालंधर'], Ludhiana: ['ਲੁਧਿਆਣਾ', 'लुधियाना'], Patiala: ['ਪਟਿਆਲਾ', 'पटियाला'], Mohali: ['ਮੋਹਾਲੀ', 'मोहाली'], 'SAS Nagar (Mohali)': ['ਮੋਹਾਲੀ', 'मोहाली'], Sangrur: ['ਸੰਗਰੂਰ', 'संगरूर'], Moga: ['ਮੋਗਾ', 'मोगा'], Fazilka: ['ਫ਼ਾਜ਼ਿਲਕਾ', 'फाजिल्का'], Gurdaspur: ['ਗੁਰਦਾਸਪੁਰ', 'गुरदासपुर'], Mansa: ['ਮਾਨਸਾ', 'मानसा'], Pathankot: ['ਪਠਾਨਕੋਟ', 'पठानकोट'] };
  const dist = d => !d ? '' : lang() === 'en' ? d.replace('SAS Nagar (Mohali)', 'Mohali') : (DIST[d] || [d, d])[lang() === 'hi' ? 1 : 0];
  function ago(iso) {
    const t = Date.parse(iso); if (!t) return '';
    const day = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
    if (day <= 0) return pick('ਅੱਜ', 'आज', 'Today'); if (day === 1) return pick('ਕੱਲ੍ਹ', 'कल', 'Yesterday');
    if (day < 7) return day + ' ' + pick('ਦਿਨ ਪਹਿਲਾਂ', 'दिन पहले', 'days ago');
    const M = { pa: ['ਜਨਵਰੀ','ਫ਼ਰਵਰੀ','ਮਾਰਚ','ਅਪ੍ਰੈਲ','ਮਈ','ਜੂਨ','ਜੁਲਾਈ','ਅਗਸਤ','ਸਤੰਬਰ','ਅਕਤੂਬਰ','ਨਵੰਬਰ','ਦਸੰਬਰ'], hi: ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'], en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
    const d = new Date(t); return d.getDate() + ' ' + (M[lang()] || M.pa)[d.getMonth()];
  }
  function image(s) {
    try { if (window.PrimezAPI && window.PrimezAPI.image) return window.PrimezAPI.image(s.image); } catch {}
    return /^https:\/\//.test(s.image || '') ? s.image : 'assets/images/' + (/^[a-z0-9-]+$/.test(s.image || '') ? s.image : 'news-farm') + '.webp';
  }
  let rows = [];
  function matches(s) {
    if (!s || s.id === 'video') return false;
    if (cats.length && (cats.includes(s.category) || (s.categories || []).some(c => cats.includes(c)))) return true;
    if (!keys.length) return !cats.length;
    const text = [s.pa, s.title, s.en, s.hi, s.summary, s.body, s.district].join(' ').toLowerCase();
    return keys.some(k => text.includes(k));
  }
  function render() {
    if (!box) return;
    const list = rows.filter(matches).slice(0, 12);
    box.replaceChildren();
    if (!list.length) {
      const empty = node('div', 'topic-empty');
      empty.append(node('p', '', pick('ਇਸ ਵਿਸ਼ੇ ਦੀਆਂ ਖ਼ਬਰਾਂ ਜਲਦੀ ਇੱਥੇ ਆਉਣਗੀਆਂ।', 'इस विषय की खबरें जल्द यहाँ आएँगी।', 'News on this topic will appear here soon.')));
      const a = node('a', 'topic-more', pick('ਸਾਰੀਆਂ ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ ਵੇਖੋ →', 'सभी ताज़ा खबरें देखें →', 'See all latest news →')); a.href = 'news/';
      empty.append(a); box.append(empty); return;
    }
    list.forEach(s => {
      const a = node('a', 'topic-card');
      a.href = window.PrimezNewsURLs ? window.PrimezNewsURLs.href({ ...s, cloudId: s.cloudId }) : 'news/';
      const pic = node('span', 'topic-img'); const img = node('img'); img.src = image(s); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.onerror = () => { if (!img.dataset.f) { img.dataset.f = '1'; img.src = 'assets/images/news-farm.webp'; } };
      pic.append(img);
      const body = node('span', 'topic-body');
      if (s.district) body.append(node('span', 'topic-tag', dist(s.district)));
      body.append(node('h3', '', title(s)), node('time', '', ago(s.publish_at || s.published)));
      a.append(pic, body); box.append(a);
    });
  }
  async function load() {
    const seed = (window.PRIMEZ_SEED_STORIES || []).map(s => ({ ...s }));
    rows = seed; render();
    try {
      if (window.PrimezAPI && window.PrimezAPI.configured) {
        const cloud = await window.PrimezAPI.publicStories();
        const seen = new Set();
        rows = [...(cloud || []).map(s => ({ ...s, cloudId: s.id, pa: s.pa || s.title })), ...seed]
          .filter(s => !seen.has(s.id) && seen.add(s.id))
          .sort((a, b) => (Date.parse(b.publish_at || b.published) || 0) - (Date.parse(a.publish_at || a.published) || 0));
        render();
      }
    } catch { /* offline or backend unavailable: seed stories stay */ }
  }
  document.addEventListener('primez-language-change', render);
  /* topic chips (e.g. Health & Beauty): filter the news list by a sub-topic */
  document.querySelectorAll('.hb-chip[data-keys]').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('.hb-chip[data-keys]').forEach(c => { const on = c === chip; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
    const k = chip.dataset.keys.split('|').map(x => x.trim().toLowerCase()).filter(Boolean);
    keys = k.length ? k : baseKeys; render();
    const title = document.getElementById('topicNews'); if (title && window.innerWidth < 1000) title.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  /* tip of the day: a different tip each day, same for every visitor that day */
  document.querySelectorAll('[data-daily]').forEach(list => {
    const items = [...list.children]; if (!items.length) return;
    const now = new Date(Date.now() + 330 * 60000), day = Math.floor((now - new Date(Date.UTC(now.getUTCFullYear(), 0, 0))) / 86400000);
    items.forEach((li, i) => { li.hidden = i !== day % items.length; });
  });
  /* market rates (mandi-bhav page) */
  const rates = document.getElementById('topicRates');
  if (rates) {
    fetch('data/market-rates.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return;
      const items = [['gold', 'ਸੋਨਾ 24K', 'सोना 24K', 'Gold 24K', '/10 g'], ['petrol', 'ਪੈਟਰੋਲ', 'पेट्रोल', 'Petrol', '/L'], ['diesel', 'ਡੀਜ਼ਲ', 'डीज़ल', 'Diesel', '/L']];
      const draw = () => {
        rates.replaceChildren(...items.filter(([k]) => data[k]).map(([k, pa, hi, en, unit]) => {
          const d = data[k]; const card = node('div', 'rate-card');
          const price = '₹' + Number(d.price).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + unit;
          card.append(node('small', '', pick(pa, hi, en) + ' · ' + pick('ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़', 'Chandigarh')), node('b', '', price), node('span', '', d.date + ' · Goodreturns'));
          return card;
        }));
      };
      draw(); document.addEventListener('primez-language-change', draw);
    }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();

/* Health blog: topic filter on the list page (#fitness works as a link) and "copy link" on posts */
(function () {
  'use strict';
  const chips = [...document.querySelectorAll('[data-blog-tag]')];
  const cards = [...document.querySelectorAll('.bl .bl-card[data-tag]')];
  function show(tag) {
    chips.forEach(c => { const on = c.dataset.blogTag === tag; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
    let visible = 0;
    cards.forEach(c => { const on = !tag || c.dataset.tag === tag; c.hidden = !on; if (on) visible++; });
    const empty = document.getElementById('blogEmpty'); if (empty) empty.hidden = visible > 0;
  }
  if (chips.length) {
    chips.forEach(c => c.addEventListener('click', () => { show(c.dataset.blogTag); try { history.replaceState(null, '', c.dataset.blogTag ? '#' + c.dataset.blogTag : location.pathname); } catch {} }));
    const start = decodeURIComponent(location.hash.slice(1));
    if (start && chips.some(c => c.dataset.blogTag === start)) show(start);
  }
  document.querySelectorAll('.bl-copy').forEach(btn => btn.addEventListener('click', async () => {
    const url = btn.closest('.bl-share')?.dataset.url || location.href;
    try { await navigator.clipboard.writeText(url); } catch { const t = document.createElement('textarea'); t.value = url; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
    const old = btn.innerHTML; btn.textContent = '✓ Copied'; setTimeout(() => { btn.innerHTML = old; }, 1600);
  }));
})();
