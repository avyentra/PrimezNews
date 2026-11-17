// Each article gets its own random receipt, so visits cannot be linked across articles.
(function () {
  const cache = new Map();
  function receiptFor(id) {
    const key = 'primez.articleView.' + id;
    try {
      let receipt = localStorage.getItem(key);
      if (!receipt || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(receipt)) {
        receipt = crypto.randomUUID();
        localStorage.setItem(key, receipt);
      }
      return receipt;
    } catch { return null; }
  }
  async function total(id) {
    const old = cache.get(id);
    if (old && Date.now() - old.time < 55000) return old.request;
    const request = window.PrimezAPI.db().rpc('article_view_count', {
      article_id: id, browser_receipt: receiptFor(id)
    }).then(({data,error}) => {
      if (error || !Number.isSafeInteger(data) || data < 0) throw Error('Count unavailable');
      return data;
    });
    cache.set(id, {time: Date.now(), request});
    return request;
  }
  // Launch period (till 17 Feb 2027): every story shows a starting count above 963,
  // different for each story but the same on every visit. Real reader views are added on top.
  const BOOST_UNTIL=Date.parse('2027-02-17T23:59:59+05:30');
  function boost(id) {
    if (Date.now() > BOOST_UNTIL) return 0;
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
   Launch period (till 17 Feb 2027): shows 50,000 + real visitors. After that only real visitors.
   Real visitors = one count per browser, kept in Supabase by backend/site-visitors.sql. */
(function () {
  const BASE = 50000, BASE_UNTIL = Date.parse('2027-02-17T23:59:59+05:30');
  function receipt() {
    try {
      let r = localStorage.getItem('primez.siteVisitor');
      if (!r || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(r)) { r = crypto.randomUUID(); localStorage.setItem('primez.siteVisitor', r); }
      return r;
    } catch { return null; }
  }
  async function real() {
    const cfg = window.PRIMEZ_BACKEND;
    if (!cfg || !cfg.url || !cfg.publicKey) throw Error('no backend');
    const res = await fetch(cfg.url + '/rest/v1/rpc/site_visitor_count', {
      method: 'POST', headers: { apikey: cfg.publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ browser_receipt: receipt() })
    });
    const n = await res.json();
    if (!res.ok || !Number.isSafeInteger(n) || n < 0) throw Error('count unavailable');
    return n;
  }
  async function show() {
    const spots = document.querySelectorAll('[data-visitor-count]');
    if (!spots.length) return;
    const base = Date.now() <= BASE_UNTIL ? BASE : 0;
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

