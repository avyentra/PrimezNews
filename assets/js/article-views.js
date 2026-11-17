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
      box=document.createElement('p');
      box.dataset.articleViews='';
      box.style.cssText='border-top:1px solid #d9dfe7;padding-top:12px;color:#34435a;font:600 14px/1.5 system-ui,sans-serif';
      host.append(box);
    }
    const lang=document.documentElement.lang;
    const label=({pa:'ਇਸ ਖ਼ਬਰ ਦੇ ਵਿਊਜ਼',hi:'इस खबर के व्यूज़',en:'Article views'})[lang]||'Article views';
    box.textContent=label+' · …';
    try { box.textContent=label+' · '+new Intl.NumberFormat(lang).format(await total(id)); }
    catch { box.textContent=label+' · '+(({pa:'ਫ਼ਿਲਹਾਲ ਉਪਲਬਧ ਨਹੀਂ',hi:'फ़िलहाल उपलब्ध नहीं',en:'Currently unavailable'})[lang]||'Currently unavailable'); }
  }
  window.PrimezViews={mount};
})();
