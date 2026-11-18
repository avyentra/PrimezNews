/* Advertisements page: placement cards, live preview, GIF support.
   Saving still happens in cloud-dashboard.js (same form, same fields); this file only improves the view. */
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  const panel = el('adsPanel'), list = el('adsSlots'), select = el('adSlot');
  if (!panel || !list || !select || !window.PrimezAPI) return;
  const SLOTS = {
    'home-hero-side': ['Home hero box', 'Home page, top right beside main news', '300 × 250', [40, 34]],
    'top-leaderboard': ['Top leaderboard', 'Every page, below the header', '970 × 90', [64, 8]],
    'left-skin': ['Left skin', 'Desktop, left side of page', '160 × 600', [16, 60]],
    'right-skin': ['Right skin', 'Desktop, right side of page', '160 × 600', [16, 60]],
    'after-headlines': ['After headlines', 'Home page, after top news', '728 × 90', [60, 9]],
    'news-sidebar': ['News sidebar', 'Every story page, beside the article', '300 × 250', [40, 34]],
    'before-video': ['Before videos', 'Home page, above the video section', '300 × 250', [40, 34]],
    'after-video': ['After videos', 'Home page, below the video section', '728 × 90', [60, 9]]
  };
  let ads = [], loaded = false, objectUrl = '';
  const isGif = url => /\.gif(\?|$)/i.test(url || '');
  const state = ad => !ad ? ['empty', 'Empty'] : ad.enabled ? ['live', 'Live'] : ['off', 'Paused'];
  const info = slot => SLOTS[slot] || [slot, '', '', [40, 20]];

  function node(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function render() {
    list.replaceChildren();
    const counts = { live: 0, off: 0, empty: 0 };
    [...select.options].map(o => o.value).forEach(slot => {
      const ad = ads.find(a => a.slot === slot), [key, label] = state(ad), [name, where, size, shape] = info(slot);
      counts[key]++;
      const b = node('button', 'ads-slot'); b.type = 'button'; b.dataset.slot = slot;
      b.setAttribute('aria-pressed', String(select.value === slot));
      const frame = node('span', 'frame');
      if (ad && window.PrimezAPI.safeUrl(ad.image)) {
        const img = node('img'); img.src = ad.image; img.alt = ''; img.loading = 'lazy'; frame.append(img);
        if (isGif(ad.image)) frame.append(node('span', 'gif', 'GIF'));
      } else {
        const s = node('i', 'shape'); s.style.width = shape[0] + 'px'; s.style.height = shape[1] + 'px'; frame.append(s);
      }
      const row = node('span', 'row1'); row.append(node('strong', '', name), node('span', 'ads-tag ' + key, label));
      const meta = node('small', '', where + ' · ' + size);
      b.append(frame, row, meta);
      b.addEventListener('click', () => { select.value = slot; select.dispatchEvent(new Event('change')); if (window.innerWidth < 1100) el('cloudAdForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      list.append(b);
    });
    const sum = el('adsSummary'); sum.replaceChildren();
    [['live', '#2f8f5b', 'Live'], ['off', '#d9ad4e', 'Paused'], ['empty', '#b8bfcd', 'Empty']].forEach(([k, c, t]) => {
      const s = node('span'); const d = node('i'); d.style.background = c; s.append(d, document.createTextNode(t + ' ' + counts[k])); sum.append(s);
    });
    head();
  }

  function head() {
    const slot = select.value, ad = ads.find(a => a.slot === slot), [name, where, size] = info(slot), [key, label] = state(ad);
    el('adSlotTitle').textContent = name;
    el('adSlotMeta').textContent = [where, size].filter(Boolean).join(' · ');
    const st = el('adSlotState'); st.className = 'ads-state ads-tag ' + key; st.textContent = label;
    list.querySelectorAll('.ads-slot').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.slot === slot)));
    preview(ad ? ad.image : '', ad && isGif(ad.image));
    el('adFileName').textContent = 'Drop a file here · JPG / PNG / WebP made light automatically · GIF up to 3 MB keeps its animation';
  }

  function preview(src, gif) {
    const img = el('adPreview');
    img.hidden = !src; if (src) img.src = src; else img.removeAttribute('src');
    el('adPreviewEmpty').hidden = !!src;
    el('adGifTag').hidden = !gif;
  }

  async function load() {
    try { ads = await window.PrimezAPI.ads() || []; loaded = true; } catch { /* access message is shown by the dashboard */ }
    render();
  }

  select.addEventListener('change', () => setTimeout(head, 0));
  el('adFile').addEventListener('change', () => {
    const f = el('adFile').files[0];
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ''; }
    if (!f) { head(); return; }
    const okType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type);
    el('adFileName').textContent = okType ? f.name + ' · ' + (f.size / 1024 / 1024).toFixed(2) + ' MB · not saved yet' : 'Use a JPG, PNG, WebP or GIF file.';
    if (okType) { objectUrl = URL.createObjectURL(f); preview(objectUrl, f.type === 'image/gif'); }
  });
  const drop = el('adDrop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, () => drop.classList.add('over')));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));

  // After cloud-dashboard.js saves (or fails), refresh the cards and colour the message.
  const fb = el('adFeedback');
  new MutationObserver(() => {
    const t = fb.textContent || '';
    fb.classList.toggle('err', !!t && !/saved/i.test(t));
    if (/saved/i.test(t)) load();
  }).observe(fb, { childList: true, characterData: true, subtree: true });

  // Load when the Advertisements page is first opened.
  new MutationObserver(() => { if (!panel.hidden && !loaded) load(); else if (!panel.hidden) render(); })
    .observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  if (!panel.hidden) load();
})();
