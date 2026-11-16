/* Admin dashboard shell: sidebar nav, top search, stats, mobile menu. Story logic stays in cloud-dashboard.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const nav = [...document.querySelectorAll('.ad-nav [data-go]')];
  const closeMenu = () => { document.body.classList.remove('ad-menu-open'); $('adMenu').setAttribute('aria-expanded', 'false'); };
  function mark(name) { nav.forEach(b => b.classList.toggle('active', b.dataset.go === name)); }
  nav.forEach(b => b.addEventListener('click', () => {
    const go = b.dataset.go;
    if (go === 'new') { $('storiesTab')?.click(); $('newStory')?.click(); mark('stories'); }
    else { $(go + 'Tab')?.click(); mark(go); }
    closeMenu();
  }));
  $('storiesTab')?.addEventListener('click', () => mark('stories'));
  $('adsTab')?.addEventListener('click', () => mark('ads'));
  $('topNewStory').addEventListener('click', () => { $('storiesTab')?.click(); $('newStory')?.click(); });
  $('topSearch').addEventListener('input', e => { const s = $('storySearch'); if (!s) return; $('storiesTab')?.click(); s.value = e.target.value; s.dispatchEvent(new Event('input', { bubbles: true })); });
  $('storySearch')?.addEventListener('input', e => { if ($('topSearch').value !== e.target.value) $('topSearch').value = e.target.value; });
  $('adMenu').addEventListener('click', () => { const o = document.body.classList.toggle('ad-menu-open'); $('adMenu').setAttribute('aria-expanded', String(o)); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  /* name in the welcome line once cloud-dashboard fills the profile */
  new MutationObserver(() => { const n = $('userName')?.textContent; if (n) $('helloName').textContent = n; }).observe($('userName'), { childList: true, characterData: true, subtree: true });
  /* stats */
  const ICON = ['ic-doc', 'ic-check', 'ic-clock', 'ic-edit'];
  document.addEventListener('primez-admin-stories', e => {
    const st = e.detail || [], c = k => st.filter(x => x === k).length;
    const data = [['Total stories', st.length], ['Published', c('published')], ['Scheduled', c('scheduled')], ['Drafts', c('draft')]];
    const box = $('adStats');
    box.replaceChildren(...data.map(([label, v], i) => {
      const d = document.createElement('div'); d.className = 'ad-stat s' + i;
      const ic = document.createElement('i'); ic.className = 'ic ' + ICON[i];
      const b = document.createElement('b'); b.textContent = String(v);
      const sm = document.createElement('small'); sm.textContent = label;
      d.append(ic, b, sm); return d;
    }));
    box.hidden = false;
  });
})();

/* ---------- Step buttons: Continue → on Details & Article, Publish now only on the Publish step ---------- */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const actions = document.querySelector('.editor-footer .actions');
  if (!actions || !$('publish')) return;
  const cont = document.createElement('button');
  cont.type = 'button'; cont.id = 'continueStep'; cont.className = 'btn primary continue-step'; cont.textContent = 'Continue →';
  actions.insertBefore(cont, $('publish'));
  cont.addEventListener('click', () => window.PrimezWorkspace?.next());
  function sync(last) {
    $('publish').hidden = !last; cont.hidden = last;
    if ($('nextStep')) $('nextStep').classList.add('ad-hide-next');
  }
  document.addEventListener('primez-step', e => sync(e.detail.last));
  sync(window.PrimezWorkspace?.current?.() === 'publishing');
})();

/* ---------- Success popup with link + share after "Publish now" ---------- */
(function () {
  'use strict';
  const pub = window.PrimezPublication;
  if (!pub || !pub.render) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'pub-pop'; dlg.setAttribute('aria-labelledby', 'pubPopTitle');
  dlg.innerHTML = '<button type="button" class="pub-x" aria-label="Close">×</button>' +
    '<div class="pub-ok" aria-hidden="true">✓</div>' +
    '<h2 id="pubPopTitle">Your news has been published successfully!</h2>' +
    '<p class="pub-pa">ਤੁਹਾਡੀ ਖ਼ਬਰ ਸਫਲਤਾਪੂਰਵਕ ਪ੍ਰਕਾਸ਼ਿਤ ਹੋ ਗਈ ਹੈ।</p>' +
    '<p class="pub-head"></p>' +
    '<label class="pub-link"><span>News link</span><span class="pub-row"><input type="text" readonly><button type="button" class="pub-copy">Copy</button></span></label>' +
    '<a class="pub-open" target="_blank" rel="noopener">Open news ↗</a>' +
    '<p class="pub-share-t">Share on</p>' +
    '<div class="pub-share"></div>' +
    '<p class="pub-tip">Tip: share after ~5 minutes so WhatsApp/Facebook show the big news photo.</p>';
  document.body.append(dlg);
  const q = s => dlg.querySelector(s);
  q('.pub-x').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  q('.pub-copy').onclick = async () => {
    const v = q('.pub-link input').value;
    try { await navigator.clipboard.writeText(v); } catch { q('.pub-link input').select(); document.execCommand && document.execCommand('copy'); }
    q('.pub-copy').textContent = 'Copied ✓'; setTimeout(() => { q('.pub-copy').textContent = 'Copy'; }, 1800);
  };
  function absolute(href) { try { return new URL(href, location.href).href; } catch { return href; } }
  function open(story) {
    const href = (window.PrimezNewsURLs ? (window.PrimezNewsURLs.publicHref || window.PrimezNewsURLs.href)({ ...story, cloudId: story.id }) : 'news.html?story=' + encodeURIComponent(story.id));
    const url = absolute(href), title = story.title || story.en || '';
    const enc = encodeURIComponent(url);
    q('.pub-head').textContent = title;
    q('.pub-link input').value = url;
    q('.pub-open').href = url;
    const links = [
      ['WhatsApp', 'wa', 'https://wa.me/?text=' + encodeURIComponent(url + '\n\n' + title)],
      ['Facebook', 'fb', 'https://www.facebook.com/sharer/sharer.php?u=' + enc],
      ['X', 'x', 'https://twitter.com/intent/tweet?url=' + enc + '&text=' + encodeURIComponent(title)],
      ['Telegram', 'tg', 'https://t.me/share/url?url=' + enc + '&text=' + encodeURIComponent(title)],
      ['LinkedIn', 'in', 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc]
    ];
    const box = q('.pub-share'); box.replaceChildren();
    links.forEach(([name, cls, h]) => { const a = document.createElement('a'); a.className = 'pub-s ' + cls; a.href = h; a.target = '_blank'; a.rel = 'noopener'; a.textContent = name; box.append(a); });
    if (navigator.share) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pub-s more'; b.textContent = 'More…'; b.onclick = () => navigator.share({ url }).catch(() => {}); box.append(b); }
    if (dlg.open) dlg.close();
    dlg.showModal();
  }
  const original = pub.render.bind(pub);
  pub.render = function (story, justSaved = false) {
    original(story, justSaved);
    const live = story && story.status === 'published' && Number.isFinite(Date.parse(story.publish_at)) && Date.parse(story.publish_at) <= Date.now();
    if (justSaved && live) open(story);
  };
  window.PrimezPublishPopup = { open };
})();
