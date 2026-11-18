/* Newsroom "My dashboard" home (admin.html #homePanel).
   Reads real data only: stories, reporter reports, join requests and ads. Editing still happens in cloud-dashboard.js. */
(function () {
  'use strict';
  const api = window.PrimezAPI, $ = id => document.getElementById(id);
  const panel = $('homePanel');
  if (!panel || !api) return;

  const IST = 19800000;
  const istDay = t => new Date(Date.parse(t) + IST).toISOString().slice(0, 10);
  const today = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
  const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const time = t => new Date(t).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
  const ago = t => { const m = Math.round((Date.now() - Date.parse(t)) / 60000); if (!(m >= 0)) return ''; if (m < 1) return 'Just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); return d === 1 ? 'Yesterday' : d + ' days ago'; };
  const when = s => { if (s.status === 'draft') return 'Draft · ' + ago(s.updated_at); const t = s.publish_at; if (!t) return ''; const d = istDay(t); return d === today() ? time(t) : d === addDays(today(), -1) ? 'Yesterday ' + time(t) : new Date(t).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }); };
  const initials = t => String(t || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const live = s => s.status !== 'draft' && s.publish_at && Date.parse(s.publish_at) <= Date.now();
  const stateOf = s => s.status === 'draft' ? 'draft' : live(s) ? 'published' : 'scheduled';
  const STATE = { published: ['Published', 'nh-p-green'], scheduled: ['Scheduled', 'nh-p-blue'], draft: ['Draft', 'nh-p-grey'] };
  const SLOTS = [['home-hero-side', 'Home hero', 28, 24], ['left-skin', 'Left skin', 10, 30], ['right-skin', 'Right skin', 10, 30], ['top-leaderboard', 'Top leader', 40, 7], ['after-headlines', 'After headlines', 40, 7], ['news-sidebar', 'News sidebar', 28, 24], ['before-video', 'Before videos', 28, 24], ['after-video', 'After videos', 40, 7]];
  const BAR = ['#14233a', '#3b5a8a', '#3b5a8a', '#6f8bb5', '#9fb1cc'];

  /* tiny element helper: text always goes in as textContent (never HTML) */
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'style') n.style.cssText = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  }
  const svg = (d, size = 16) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s; };

  let filter = 'all', loading = false, timer = 0, first = true;

  function markNav(name) { document.querySelectorAll('.ad-nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === name)); }
  function show() {
    panel.hidden = false;
    ['storiesPanel', 'adsPanel'].forEach(id => { if ($(id)) $(id).hidden = true; });
    document.body.classList.add('nh-mode'); document.body.classList.remove('show-recent');
    markNav('home'); load();
    clearInterval(timer); timer = setInterval(() => { if (!panel.hidden && !document.hidden) load(); }, 60000);
  }
  function hide() { panel.hidden = true; document.body.classList.remove('nh-mode'); clearInterval(timer); }
  $('homeTab')?.addEventListener('click', show);
  $('storiesTab')?.addEventListener('click', hide);
  $('adsTab')?.addEventListener('click', hide);
  /* open the dashboard first, once the newsroom has loaded its stories (= access confirmed) */
  document.addEventListener('primez-admin-stories', () => { if (first) { first = false; setTimeout(show, 0); } else if (!panel.hidden) load(); });
  /* if the newsroom finished loading before this script ran, open the dashboard now (or as soon as access is confirmed) */
  const ws = $('workspace');
  const ready = () => ws && !ws.hidden && window.PrimezNewsroom;
  if (ready()) { first = false; setTimeout(show, 0); }
  else if (ws) { const mo = new MutationObserver(() => { if (first && ready()) { first = false; mo.disconnect(); setTimeout(show, 0); } }); mo.observe(ws, { attributes: true, attributeFilter: ['hidden'] }); }

  const newStory = () => { $('topNewStory')?.click(); markNav('new'); };
  const openStory = id => { if (window.PrimezNewsroom?.open(id)) markNav(''); };

  async function safe(p, fallback) { try { const r = await p; if (r && r.error) return fallback; return r && 'data' in r ? (r.data ?? fallback) : (r ?? fallback); } catch { return fallback; } }

  async function load() {
    if (loading) return; loading = true;
    try {
      const db = api.db();
      const [rows, reports, apps, ads] = await Promise.all([
        window.PrimezNewsroom ? Promise.resolve(window.PrimezNewsroom.rows()) : safe(api.stories(), []),
        safe(db.from('journalist_reports').select('id,headline,status,submitted_at,district,journalist_applications(name,district)').in('status', ['submitted', 'in_review']).order('submitted_at', { ascending: false }).limit(8), []),
        safe(db.from('journalist_applications').select('user_id,name,district,submitted_at').eq('status', 'pending').order('submitted_at', { ascending: false }).limit(8), []),
        safe(api.ads(), [])
      ]);
      const recent = [...rows].sort((a, b) => Date.parse(b.publish_at || b.updated_at) - Date.parse(a.publish_at || a.updated_at));
      const reads = {};
      await Promise.all(recent.filter(live).slice(0, 8).map(async s => { const n = await safe(db.rpc('article_view_count', { article_id: s.id }), null); if (typeof n === 'number') reads[s.id] = n; }));
      render(rows, recent, reports, apps, ads, reads);
    } finally { loading = false; }
  }

  function render(rows, recent, reports, apps, ads, reads) {
    const t = today(), y = addDays(t, -1);
    const pub = rows.filter(live);
    const pubToday = pub.filter(s => istDay(s.publish_at) === t).length, pubYest = pub.filter(s => istDay(s.publish_at) === y).length;
    const sched = rows.filter(s => stateOf(s) === 'scheduled').sort((a, b) => Date.parse(a.publish_at) - Date.parse(b.publish_at));
    const drafts = rows.filter(s => s.status === 'draft').sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const oldest = drafts.length ? drafts.reduce((m, s) => Date.parse(s.updated_at) < Date.parse(m.updated_at) ? s : m) : null;
    const waiting = reports.length + apps.length;
    const diff = pubToday - pubYest;

    const stat = (label, value, color, sub, cls) => h('div', { class: 'nh-card nh-stat' + (cls ? ' ' + cls : '') }, h('span', { class: 'nh-cap' }, label), h('strong', { class: 'nh-num', style: 'color:' + color }, String(value)), h('small', {}, sub));

    // recent stories table
    const counts = { all: recent.length, published: recent.filter(s => stateOf(s) === 'published').length, scheduled: sched.length, draft: drafts.length };
    const shown = recent.filter(s => filter === 'all' || stateOf(s) === filter).slice(0, 8);
    const chip = (k, label) => h('button', { type: 'button', class: 'nh-chip', 'aria-pressed': String(filter === k), onclick: () => { filter = k; render(rows, recent, reports, apps, ads, reads); } }, label + ' ', h('span', { class: 'nh-num' }, String(counts[k])));
    const table = h('table', { class: 'nh-table' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Story'), h('th', {}, 'Category'), h('th', {}, 'Status'), h('th', { style: 'text-align:right' }, 'Reads'), h('th', {}, h('span', { class: 'nh-sr' }, 'Edit')))),
      h('tbody', {}, shown.length ? shown.map(s => { const st = stateOf(s); return h('tr', {},
        h('td', {}, h('div', { class: 'nh-story' }, h('img', { src: api.image(s.image), alt: '', loading: 'lazy' }), h('div', {}, h('strong', { class: 'nh-gb' }, s.title || s.en), h('span', {}, [s.district, when(s)].filter(Boolean).join(' · '))))),
        h('td', {}, h('span', { class: 'nh-pill nh-p-soft' }, s.category)),
        h('td', {}, h('span', { class: 'nh-pill ' + STATE[st][1] }, STATE[st][0])),
        h('td', { class: 'nh-num', style: 'text-align:right;font-weight:800' }, s.id in reads ? reads[s.id].toLocaleString('en-IN') : '—'),
        h('td', { style: 'text-align:right' }, h('button', { type: 'button', class: 'nh-sm', onclick: () => openStory(s.id) }, 'Edit'))); })
        : h('tr', {}, h('td', { colspan: '5', class: 'nh-empty' }, 'No stories here yet.'))));

    // waiting for you
    const wItems = [
      ...reports.map(r => ({ ini: initials(r.journalist_applications?.name), title: r.headline, sub: 'Report · ' + [r.journalist_applications?.name, r.journalist_applications?.district || r.district].filter(Boolean).join(' · '), cta: 'Review', cls: 'red' })),
      ...apps.map(a => ({ ini: initials(a.name), title: a.name, sub: 'Join request · ' + (a.district || ''), cta: 'View proof', cls: 'gold' }))
    ].slice(0, 6);

    // ads
    const adMap = Object.fromEntries(ads.map(a => [a.slot, a]));
    const adCount = { live: 0, paused: 0, empty: 0 };
    const slotEls = SLOTS.map(([slot, label, w, hh]) => { const a = adMap[slot], k = !a ? 'empty' : a.enabled ? 'live' : 'paused'; adCount[k]++; return h('div', { class: 'nh-slot nh-' + k, title: label + ' · ' + k }, h('i', { style: `width:${w}px;height:${hh}px` }), h('span', {}, label)); });

    // categories this week
    const weekAgo = addDays(t, -6), byCat = {};
    pub.filter(s => istDay(s.publish_at) >= weekAgo).forEach(s => { byCat[s.category] = (byCat[s.category] || 0) + 1; });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5), cmax = Math.max(1, ...cats.map(c => c[1]));

    // drafts progress
    const step = s => { const body = String(s.body || '').trim().length > 0, img = s.image && s.image !== 'fields'; return body && img ? [100, 'Ready to publish'] : body ? [66, 'Step 2 of 3 · add photo'] : [33, 'Step 1 of 3 · write article']; };

    const dateLine = new Date(Date.now() + IST).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    panel.replaceChildren(
      h('section', { class: 'nh-hello' },
        h('div', {}, h('span', {}, dateLine), h('h1', {}, "Today's newsroom")),
        h('div', { class: 'nh-quick' },
          h('button', { type: 'button', class: 'nh-sm', disabled: !drafts.length, onclick: () => drafts[0] && openStory(drafts[0].id) }, 'Continue last draft'),
          h('button', { type: 'button', class: 'nh-sm', onclick: newStory }, svg('M12 5v14M5 12h14', 14), 'Write new story'),
          h('a', { class: 'nh-sm', href: './', target: '_blank', rel: 'noopener' }, 'Open website ↗'))),
      h('section', { class: 'nh-stats', 'aria-label': 'Today' },
        stat('Published today', pubToday, '#17633a', diff > 0 ? diff + ' more than yesterday' : diff < 0 ? -diff + ' fewer than yesterday' : 'Same as yesterday'),
        stat('Scheduled', sched.length, '#1f3d6b', sched[0] ? 'Next at ' + (istDay(sched[0].publish_at) === t ? time(sched[0].publish_at) : when(sched[0])) : 'Nothing scheduled'),
        stat('Drafts', drafts.length, '#14233a', oldest ? 'Oldest from ' + ago(oldest.updated_at).toLowerCase() : 'No drafts'),
        stat('Waiting for you', waiting, '#6e4206', reports.length + ' reports · ' + apps.length + ' join requests', 'nh-warm')),
      h('section', { class: 'nh-grid' },
        h('div', { class: 'nh-card nh-flush nh-main' },
          h('div', { class: 'nh-head' }, h('h2', {}, 'Recent stories'), h('div', { class: 'nh-chips' }, chip('all', 'All'), chip('published', 'Published'), chip('scheduled', 'Scheduled'), chip('draft', 'Drafts'))),
          h('div', { class: 'nh-scroll' }, table)),
        h('div', { class: 'nh-side' },
          h('div', { class: 'nh-card' },
            h('div', { class: 'nh-head' }, h('h2', {}, 'Waiting for you'), waiting ? h('span', { class: 'nh-pill nh-p-gold' }, waiting + ' new') : null),
            wItems.length ? wItems.map(w => h('div', { class: 'nh-wait' }, h('span', { class: 'nh-av nh-' + w.cls }, w.ini), h('div', {}, h('strong', { class: 'nh-gb' }, w.title), h('span', {}, w.sub)), h('a', { class: 'nh-sm', href: 'join-newsroom#review' }, w.cta)))
              : h('p', { class: 'nh-empty' }, 'All caught up. Nothing waiting.')),
          h('div', { class: 'nh-card' },
            h('div', { class: 'nh-head' }, h('h2', {}, 'Ad slots'), h('button', { type: 'button', class: 'nh-link', onclick: () => $('adsTab')?.click() }, 'Manage →')),
            h('div', { class: 'nh-slots' }, slotEls),
            h('div', { class: 'nh-legend' }, h('span', {}, h('i', { style: 'background:#2f8f5b' }), 'Live ' + adCount.live), h('span', {}, h('i', { style: 'background:#d9ad4e' }), 'Paused ' + adCount.paused), h('span', {}, h('i', { style: 'background:#b8bfcd' }), 'Empty ' + adCount.empty))))),
      h('section', { class: 'nh-card nh-two' },
        h('div', { class: 'nh-col' },
          h('div', { class: 'nh-head' }, h('h2', {}, 'Stories this week'), h('span', { class: 'nh-cap' }, 'By category')),
          cats.length ? cats.map(([c, n], i) => h('div', { class: 'nh-bar' }, h('div', {}, h('b', {}, c), h('span', { class: 'nh-num' }, n + (n === 1 ? ' story' : ' stories'))), h('div', { class: 'nh-track' }, h('i', { style: `width:${Math.round(n / cmax * 100)}%;background:${BAR[i]}` }))))
            : h('p', { class: 'nh-empty' }, 'No stories published in the last 7 days.')),
        h('div', { class: 'nh-col' },
          h('div', { class: 'nh-head' }, h('h2', {}, 'Continue a draft'), h('span', { class: 'nh-cap' }, drafts.length + (drafts.length === 1 ? ' draft' : ' drafts'))),
          drafts.length ? drafts.slice(0, 3).map(d => { const [p, label] = step(d); return h('div', { class: 'nh-draft' }, h('div', {}, h('strong', { class: 'nh-gb' }, d.title || d.en), h('div', { class: 'nh-prog' }, h('div', { class: 'nh-track' }, h('i', { style: `width:${p}%` })), h('span', {}, label))), h('button', { type: 'button', class: 'nh-sm nh-dark', onclick: () => openStory(d.id) }, 'Continue')); })
            : h('p', { class: 'nh-empty' }, 'No drafts. ', h('button', { type: 'button', class: 'nh-link', onclick: newStory }, 'Write a new story →')))),
      h('p', { class: 'nh-foot' }, 'Updated ' + time(Date.now()) + ' · refreshes every minute')
    );
  }
})();
