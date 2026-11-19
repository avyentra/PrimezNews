/* Admin dashboard shell: sidebar nav, top search, stats, mobile menu. Story logic stays in cloud-dashboard.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const nav = [...document.querySelectorAll('.ad-nav [data-go]')];
  const closeMenu = () => { document.body.classList.remove('ad-menu-open'); $('adMenu').setAttribute('aria-expanded', 'false'); };
  function mark(name) { nav.forEach(b => b.classList.toggle('active', b.dataset.go === name)); }
  nav.forEach(b => b.addEventListener('click', () => {
    const go = b.dataset.go;
    /* Dashboard: newsroom-home.js listens on #homeTab, shows #homePanel and re-loads the stories from the database */
    if (go === 'home') { $('homeTab')?.click(); mark('home'); closeMenu(); return; }
  if (go === 'recent') { $('storiesTab')?.click(); openRecent(); return; }
    if (go === 'new') { $('storiesTab')?.click(); $('newStory')?.click(); mark('new'); }
    else { $(go + 'Tab')?.click(); mark(go); }
    closeMenu();
  }));
  $('storiesTab')?.addEventListener('click', () => mark('stories'));
  /* Recent news drawer (opens from the sidebar) */
  const recentBtn = document.querySelector('.ad-nav [data-go="recent"]');
  function openRecent() { document.body.classList.add('show-recent'); recentBtn?.setAttribute('aria-expanded', 'true'); closeMenu(); setTimeout(() => $('storySearch')?.focus(), 60); }
  function closeRecent() { document.body.classList.remove('show-recent'); recentBtn?.setAttribute('aria-expanded', 'false'); }
  $('closeRecent')?.addEventListener('click', closeRecent);
  $('storyList')?.addEventListener('click', e => { if (e.target.closest('.story-row')) setTimeout(closeRecent, 0); });
  $('newStory')?.addEventListener('click', closeRecent);
  document.addEventListener('click', e => { if (document.body.classList.contains('show-recent') && !e.target.closest('.stories-rail, .ad-nav, #topSearch, .ad-search')) closeRecent(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRecent(); });
  $('topSearch').addEventListener('focus', () => { if ($('topSearch').value) openRecent(); });
  $('topSearch').addEventListener('input', () => openRecent());
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
    if ($('recentCount')) { $('recentCount').textContent = String(st.length); $('recentCount').hidden = !st.length; }
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
    '<p class="pub-wait" role="status"></p>';
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
    const href = (window.PrimezNewsURLs ? (window.PrimezNewsURLs.publicHref || window.PrimezNewsURLs.href)({ ...story, cloudId: story.id }) : 'news/?story=' + encodeURIComponent(story.id));
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
    waitUntilReady(url);
  }
  /* Share only after the article page AND its share photo are live, so WhatsApp/Facebook
     never cache a link without the photo. Checks every 8 s for up to 10 minutes. */
  let token = 0;
  function setReady(state, text) {
    dlg.classList.toggle('is-wait', state === 'wait');
    dlg.classList.toggle('is-ready', state === 'ready');
    q('.pub-wait').textContent = text;
    dlg.querySelectorAll('.pub-s, .pub-copy').forEach(b => { b.toggleAttribute('aria-disabled', state === 'wait'); b.tabIndex = state === 'wait' ? -1 : 0; });
  }
  async function pageReady(url) {
    const u = new URL(url);
    if (u.origin !== location.origin) return null;               // can only check on the live site
    const r = await fetch(u.pathname + '?check=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return false;
    const html = await r.text();
    const m = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (!m) return false;
    const img = new URL(m[1], location.href);
    if (img.origin !== location.origin) return true;
    const ir = await fetch(img.pathname + '?check=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    return ir.ok;
  }
  async function waitUntilReady(url) {
    const mine = ++token, started = Date.now();
    if (!/\/news\/[^/]+\/$/.test(new URL(url).pathname)) { setReady('ready', ''); return; }
    setReady('wait', '⏳ Preparing the news page and share photo (can take up to 10 min). Sharing unlocks automatically…');
    while (mine === token && dlg.open) {
      let ok = null;
      try { ok = await pageReady(url); } catch { ok = false; }
      if (mine !== token) return;
      if (ok === null) { setReady('ready', 'Tip: share 2–3 minutes after publishing so WhatsApp/Facebook show the big photo.'); return; }
      if (ok) { setReady('ready', '✓ Page and photo are live — ready to share.'); return; }
      if (Date.now() - started > 600000) { setReady('ready', 'Page is still being prepared. For the big photo on WhatsApp/Facebook, share after 10–15 minutes.'); return; }
      await new Promise(r => setTimeout(r, 8000));
    }
  }
  dlg.addEventListener('close', () => { token++; });
  dlg.addEventListener('click', e => { const t = e.target.closest('.pub-s, .pub-copy'); if (t && dlg.classList.contains('is-wait')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  const original = pub.render.bind(pub);
  pub.render = function (story, justSaved = false) {
    original(story, justSaved);
    const live = story && story.status === 'published' && Number.isFinite(Date.parse(story.publish_at)) && Date.parse(story.publish_at) <= Date.now();
    if (justSaved && live) open(story);
  };
  window.PrimezPublishPopup = { open };
})();

/* Primary category: choosing one also ticks it under Categories */
document.getElementById('primaryCategory')?.addEventListener('change', e => {
  const box = document.querySelector('#categories input[value="' + CSS.escape(e.target.value) + '"]');
  if (box && !box.checked) box.checked = true;
});

/* ---------- Profile settings page ---------- */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('settingsPanel'); if (!panel) return;
  const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  function markNav(name) { document.querySelectorAll('.ad-nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === name)); }
  function show() {
    ['storiesPanel', 'adsPanel'].forEach(id => { if ($(id)) $(id).hidden = true; });
    document.querySelector('.workspace-top') && (document.querySelector('.workspace-top').hidden = true);
    const hp = $('homePanel'); if (hp) hp.hidden = true; document.body.classList.remove('nh-mode');
    panel.hidden = false; markNav('settings');
    $('setName').value = $('userName').textContent || '';
    $('setEmail').value = $('userEmail').textContent || '';
    $('setAvatar').textContent = initials($('setName').value);
    $('profileMsg').textContent = $('passMsg').textContent = '';
    document.body.classList.remove('ad-menu-open', 'show-recent');
  }
  function hide() { if (panel.hidden) return; panel.hidden = true; const t = document.querySelector('.workspace-top'); if (t) t.hidden = false; const hp = $('homePanel'); if ($('storiesPanel') && $('adsPanel') && $('storiesPanel').hidden && $('adsPanel').hidden && !(hp && !hp.hidden)) $('storiesPanel').hidden = false; }
  $('openSettings').addEventListener('click', show);
  document.querySelector('.ad-nav [data-go="settings"]')?.addEventListener('click', e => { e.stopImmediatePropagation(); show(); }, true);
  ['storiesTab', 'adsTab'].forEach(id => $(id)?.addEventListener('click', hide));
  document.querySelectorAll('.ad-nav [data-go]:not([data-go="settings"])').forEach(b => b.addEventListener('click', hide));
  $('topNewStory')?.addEventListener('click', hide);
  $('setName').addEventListener('input', () => { $('setAvatar').textContent = initials($('setName').value); });
  const db = () => window.PrimezAPI.db();
  async function busy(btn, msgEl, fn) {
    if (btn.disabled) return; btn.disabled = true; msgEl.className = 'set-msg'; msgEl.textContent = 'Saving…';
    try { await fn(); } catch (err) { msgEl.className = 'set-msg err'; msgEl.textContent = err?.message || 'Could not save. Try again.'; }
    finally { btn.disabled = false; }
  }
  $('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('setName').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { $('setName').reportValidity(); $('profileMsg').className = 'set-msg err'; $('profileMsg').textContent = 'Enter your name (at least 2 letters).'; return; }
    busy($('saveProfile'), $('profileMsg'), async () => {
      const r = await db().auth.updateUser({ data: { full_name: name } }); if (r.error) throw r.error;
      $('userName').textContent = name; $('userInitials').textContent = initials(name); $('helloName').textContent = name;
      $('profileMsg').className = 'set-msg ok'; $('profileMsg').textContent = '✓ Profile saved.';
    });
  });
  $('passwordForm').addEventListener('submit', e => {
    e.preventDefault();
    const a = $('setPass').value, b = $('setPass2').value;
    if (a.length < 8) { $('passMsg').className = 'set-msg err'; $('passMsg').textContent = 'Use at least 8 characters.'; return; }
    if (a !== b) { $('passMsg').className = 'set-msg err'; $('passMsg').textContent = 'Both passwords must match.'; return; }
    busy($('savePass'), $('passMsg'), async () => {
      const r = await db().auth.updateUser({ password: a }); if (r.error) throw r.error;
      $('passwordForm').reset(); $('passMsg').className = 'set-msg ok'; $('passMsg').textContent = '✓ Password updated.';
    });
  });
  $('settingsLogout').addEventListener('click', () => $('logout').click());
})();

/* ---------- Sidebar: "New story" lights up while the editor holds a new story ---------- */
(function () {
  'use strict';
  const heading = document.getElementById('editorHeading');
  const nav = [...document.querySelectorAll('.ad-nav [data-go]')];
  if (!heading || !nav.length) return;
  function sync() {
    const active = nav.find(b => b.classList.contains('active'));
    const now = active ? active.dataset.go : 'stories';
    if (now !== 'stories' && now !== 'new') return;          // Ads / Settings stay as they are
    const want = heading.textContent.trim() === 'New story' ? 'new' : 'stories';
    nav.forEach(b => b.classList.toggle('active', b.dataset.go === want));
  }
  new MutationObserver(sync).observe(heading, { childList: true, characterData: true, subtree: true });
  document.getElementById('topNewStory')?.addEventListener('click', () => setTimeout(sync, 0));
  sync();
})();

