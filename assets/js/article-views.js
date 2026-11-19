(function () {
  const cache = new Map();
  // One count per page load (a refresh or a new visit counts again; mount() may run twice on one load).
  async function total(id) {
    const old = cache.get(id);
    if (old) return old;
    const request = window.PrimezAPI.db().rpc('article_view_count', {
      article_id: id, browser_receipt: crypto.randomUUID()
    }).then(({data,error}) => {
      if (error || !Number.isSafeInteger(data) || data < 0) throw Error('Count unavailable');
      return data;
    });
    cache.set(id, request);
    return request;
  }
  // Every story starts from a count above 963 (different per story, same on every visit), for life.
  // Real reads and the +5 per hour (added by the database) come on top.
  function boost(id) {
    let h=2166136261;
    for (const ch of String(id)) { h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; }
    return 964 + (h % 2037);
  }
  async function mount(host,id) {
    if (!id || !host) return;
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', () => {
        if (host.isConnected) mount(host,id);
      }, {once:true});
      return;
    }
    let box=host.querySelector('[data-article-views]');
    if (!box) {
      box=document.createElement('div');
      box.dataset.articleViews='';
      box.style.cssText='border-top:1px solid #d9dfe7;padding-top:12px;margin-top:12px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:8px 24px';
      host.append(box);
    }
    const lang=document.documentElement.lang;
    let count=box.querySelector('[data-views-count]'), note=box.querySelector('[data-views-note]');
    if (!count) {
      box.textContent='';
      count=document.createElement('span'); count.dataset.viewsCount='';
      count.style.cssText='color:#34435a;font:600 14px/1.5 system-ui,sans-serif;white-space:nowrap';
      note=document.createElement('small'); note.dataset.viewsNote='';
      note.style.cssText='flex:1 1 320px;max-width:620px;margin-left:auto;text-align:right;color:#b4232a;font:400 13px/1.5 system-ui,sans-serif';
      if (window.matchMedia && matchMedia('(max-width:600px)').matches) { note.style.textAlign='left'; note.style.marginLeft='0'; }
      box.append(count,note);
    }
    note.textContent=({
      pa:'ਬੇਦਾਅਵਾ: ਇਹ ਸਮੱਗਰੀ ਰਿਪੋਰਟਰ ਵੱਲੋਂ ਦਿੱਤੀ ਗਈ ਹੈ; ਸਾਡਾ ਪਲੇਟਫਾਰਮ ਇਸ ਦੀ ਸ਼ੁੱਧਤਾ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਕਰਦਾ।',
      hi:'अस्वीकरण: यह सामग्री रिपोर्टर द्वारा दी गई है; हमारा प्लेटफ़ॉर्म इसकी सटीकता की पुष्टि नहीं करता।',
      en:'Disclaimer: Content is provided by the reporter; our platform does not verify its accuracy.'
    })[lang]||'Disclaimer: Content is provided by the reporter; our platform does not verify its accuracy.';
    const label=({pa:'ਇਸ ਖ਼ਬਰ ਦੇ ਵਿਊਜ਼',hi:'इस खबर के व्यूज़',en:'Article views'})[lang]||'Article views';
    count.textContent=label+' · …';
    try { count.textContent=label+' · '+new Intl.NumberFormat(lang).format((await total(id))+boost(id)); }
    catch { count.textContent=label+' · '+(({pa:'ਫ਼ਿਲਹਾਲ ਉਪਲਬਧ ਨਹੀਂ',hi:'फ़िलहाल उपलब्ध नहीं',en:'Currently unavailable'})[lang]||'Currently unavailable'); }
  }
  window.PrimezViews={mount};
})();

/* Footer: total website visitors.
   Shows 50,000 + counted visits, for life. A visit is counted on every refresh, every new visit and every
   re-opened browser; moving between pages inside the site is not counted again. Kept by backend/view-counters-v2.sql. */
(function () {
  const BASE = 50000;
  function receipt() {
    try {
      let r = localStorage.getItem('primez.siteVisitor');
      if (!r || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(r)) { r = crypto.randomUUID(); localStorage.setItem('primez.siteVisitor', r); }
      return r;
    } catch { return null; }
  }
  function isHit() {
    let nav = ''; try { nav = performance.getEntriesByType('navigation')[0]?.type || ''; } catch {}
    try {
      const fresh = !sessionStorage.getItem('primez.session');
      sessionStorage.setItem('primez.session', '1');
      return fresh || nav === 'reload';
    } catch { return nav !== 'back_forward'; }
  }
  async function real() {
    const cfg = window.PRIMEZ_BACKEND;
    if (!cfg || !cfg.url || !cfg.publicKey) throw Error('no backend');
    const call = async body => {
      const res = await fetch(cfg.url + '/rest/v1/rpc/site_visitor_count', {
        method: 'POST', headers: { apikey: cfg.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const n = await res.json();
      if (!res.ok || !Number.isSafeInteger(n) || n < 0) throw Error('count unavailable');
      return n;
    };
    const r = receipt();
    try { return await call({ browser_receipt: r, count_hit: isHit() }); }
    catch { return call({ browser_receipt: r }); }   // older database function (view-counters-v2.sql not run yet)
  }
  async function show() {
    const spots = document.querySelectorAll('[data-visitor-count]');
    if (!spots.length) return;
    const base = BASE;
    let n = null;
    try { n = (await real()) + base; } catch { n = base || null; }
    const lang = document.documentElement.lang || 'pa';
    spots.forEach(el => {
      if (n === null) { el.closest('[data-site-visitors]')?.setAttribute('hidden', ''); return; }
      el.textContent = new Intl.NumberFormat(lang + '-IN').format(n);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true }); else show();
})();

