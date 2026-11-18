/* Super Admin (owner) panel. Every permission is enforced in SQL (backend/super-admin.sql);
   this page only shows what the database allows a super admin to read and change. */
(function () {
  'use strict';
  const api = window.PrimezAPI, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Math.round(+n || 0).toLocaleString('en-IN');
  const inr = n => '₹ ' + num(n);
  const short = n => { n = +n || 0; return n >= 1e7 ? (n / 1e7).toFixed(1) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)); };
  const IST = 19800000;
  const today = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const diffDays = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const dLabel = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const istDay = ts => new Date(Date.parse(ts) + IST).toISOString().slice(0, 10);
  const ago = ts => { if (!ts) return 'Never'; const m = Math.round((Date.now() - Date.parse(ts)) / 60000); if (m < 1) return 'Just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); return d === 1 ? 'Yesterday' : d + ' days ago'; };
  const initials = s => String(s || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const ICON = {
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa2b5" stroke-width="2.4" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    tick: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>'
  };
  const SLOTS = {
    'home-hero-side': ['Home hero box', 'Home, top right beside main news', '300×250'],
    'top-leaderboard': ['Top leaderboard', 'Every page, below header', '970×90'],
    'left-skin': ['Left skin', 'Desktop, left side', '160×600'],
    'right-skin': ['Right skin', 'Desktop, right side', '160×600'],
    'after-headlines': ['After headlines', 'Home, after top news', '728×90'],
    'news-sidebar': ['News sidebar', 'Every story page', '300×250'],
    'before-video': ['Before videos', 'Home, video section', '300×250'],
    'after-video': ['After videos', 'Home, video section', '728×90']
  };
  const MENU = [
    ['home-v2?category=Punjab', 'Punjab', 'Main menu'], ['home-v2?category=Agriculture', 'Agriculture', 'Main menu'], ['jobs', 'Jobs', 'Main menu'],
    ['rashi', 'Horoscope', 'Main menu'], ['home-v2?category=Sports', 'Sports', 'Main menu'], ['home-v2?category=Politics', 'Politics', 'Main menu'],
    ['health-beauty', 'Health & Beauty', 'Main menu'], ['nri', 'NRI News', 'Main menu'], ['videos', 'Videos', 'Main menu'],
    ['health-blog/', 'Health blog', 'More menu'], ['mandi-bhav', 'Market rates', 'More menu'], ['hukamnama', 'Hukamnama', 'More menu'],
    ['sarkari-yojana', 'Government schemes', 'More menu'], ['home-v2?category=Education', 'Education', 'More menu'], ['home-v2?category=Crime', 'Crime & Safety', 'More menu'],
    ['dharm', 'Faith & Culture', 'More menu'], ['home-v2?category=Business', 'Business', 'More menu'], ['home-v2?category=National', 'National', 'More menu'],
    ['home-v2?category=World', 'World', 'More menu'], ['home-v2?category=Entertainment', 'Entertainment', 'More menu'], ['home-v2?category=Weather', 'Weather', 'More menu'],
    ['home-v2?category=Technology', 'Technology', 'More menu']
  ];
  const ROLE = {
    super: ['Super admin', 'p-navy'], admin: ['Admin', 'p-blue'], editor: ['Editor', 'p-purple'],
    journalist: ['Journalist', 'p-grey'], pending: ['Join request', 'p-gold'], blocked: ['Blocked', 'p-red'], none: ['No access', 'p-grey']
  };
  const SRC_COLORS = { DIPR: '#14233a', AdSense: '#d9ad4e', 'Local ad': '#8fb7e8', Other: '#b8bfcd' };

  let me = null, view = '', range = '30', timer = 0, teamFilter = 'all', teamQuery = '';
  const db = () => api.db();
  async function q(p) { const r = await p; if (r.error) throw r.error; return r.data; }
  const rpc = (fn, args) => q(db().rpc(fn, args || {}));
  const setting = (rows, key, fallback) => { const r = (rows || []).find(s => s.key === key); return r ? r.value : fallback; };

  function toast(text, err) {
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = text;
    document.body.append(t); setTimeout(() => t.remove(), 3600);
  }
  const fail = e => toast((e && e.message) || 'Something went wrong. Please try again.', true);
  function dialog(html, actions) {
    $('dlgBody').innerHTML = html;
    const acts = $('dlgActs'); acts.querySelectorAll('[data-extra]').forEach(b => b.remove());
    (actions || []).forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (a.cls || ''); b.dataset.extra = ''; b.textContent = a.label; if (a.disabled) b.disabled = true; b.onclick = () => a.run(b); acts.prepend(b); });
    $('dlg').showModal();
  }
  $('dlgClose').onclick = () => $('dlg').close();

  function gate(html, warn) { $('gate').innerHTML = html; $('gate').className = 'notice' + (warn ? ' warn' : ''); $('gate').hidden = false; $('view').hidden = true; }
  function header(kicker, title, extra) {
    return `<header class="head"><button type="button" class="sa-menu" data-menu aria-label="Open menu" aria-controls="saSide">${ICON.menu}</button><div class="title"><span>${kicker}</span><h1>${title}</h1></div>${extra || ''}</header>`;
  }
  function paint(html) { const v = $('view'); v.innerHTML = html; v.hidden = false; $('gate').hidden = true; v.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => document.body.classList.toggle('menu-open')); }
  function loading(title) { paint(header('Super admin', esc(title)) + '<p class="notice">Loading…</p>'); }

  /* ---------- charts ---------- */
  function linePath(vals, w, h, max, pad, count) {
    const n = count || vals.length; if (!vals.length) return { d: '', pts: [] };
    const step = n > 1 ? w / (n - 1) : 0, m = max || 1;
    const pts = vals.map((v, i) => [i * step, h - pad - (v / m) * (h - pad * 2)]);
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
    return { d, pts };
  }
  function spark(vals, color, fill) {
    if (!vals.length || vals.every(v => !v)) return `<svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:40px;display:block"><path d="M0 36H200" stroke="#e3e6ee" stroke-width="2"/></svg>`;
    const l = linePath(vals, 200, 40, Math.max(...vals) * 1.08, 4);
    return `<svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:40px;display:block"><path d="${l.d} L200 40 L0 40 Z" fill="${fill}"/><path d="${l.d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function ring(pct) {
    const c = 2 * Math.PI * 50, v = Math.max(0, Math.min(1, pct)) * c;
    return `<svg width="112" height="112" viewBox="0 0 120 120" role="img" aria-label="Monthly target ${Math.round(pct * 100)} percent reached" style="flex:none"><circle cx="60" cy="60" r="50" fill="none" stroke="#eef0f5" stroke-width="12"/><circle cx="60" cy="60" r="50" fill="none" stroke="#d9ad4e" stroke-width="12" stroke-linecap="round" stroke-dasharray="${v.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="60" text-anchor="middle" font-family="Manrope, system-ui, sans-serif" font-weight="800" font-size="24" fill="#14233a">${Math.round(pct * 100)}%</text><text x="60" y="78" text-anchor="middle" font-family="Manrope, system-ui, sans-serif" font-weight="600" font-size="11" fill="#5f6880">target</text></svg>`;
  }

  /* ---------- ranges ---------- */
  function windows() {
    const t = today();
    if (range === 'month') {
      const start = t.slice(0, 8) + '01', prevEnd = addDays(start, -1), prevStart = prevEnd.slice(0, 8) + '01';
      const len = diffDays(start, addDays(start.slice(0, 5) + String(+start.slice(5, 7) % 12 + 1).padStart(2, '0') + '-01', 0)) || 31;
      const monthLen = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate();
      return { name: 'this month', from: start, to: t, prevFrom: prevStart, prevTo: prevEnd, slots: monthLen || len };
    }
    const n = range === '7' ? 7 : 30;
    return { name: 'last ' + n + ' days', from: addDays(t, -(n - 1)), to: t, prevFrom: addDays(t, -(2 * n - 1)), prevTo: addDays(t, -n), slots: n };
  }
  function series(map, from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(+map[d] || 0); return out; }
  const mapOf = rows => Object.fromEntries((rows || []).map(r => [r.d, +r.n || 0]));
  const sum = a => a.reduce((x, y) => x + y, 0);
  function trend(cur, prev) {
    if (!prev && !cur) return ['—', 'p-grey'];
    if (!prev) return ['New', 'p-green'];
    const p = Math.round((cur - prev) / prev * 100);
    return [(p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '%', p >= 0 ? 'p-green' : 'p-red'];
  }

  /* ---------- OVERVIEW ---------- */
  async function overview(silent) {
    if (!silent) loading('Today\'s control room');
    const w = windows(), since = addDays(today(), -75);
    const [o, earn, ads, camps, settings, stories, rates, rashi] = await Promise.all([
      rpc('super_admin_overview'),
      q(db().from('earnings').select('earned_on,source,amount').gte('earned_on', addDays(today(), -400))),
      api.ads().catch(() => []),
      q(db().from('ad_campaigns').select('*').gte('ends_on', addDays(today(), -60))).catch(() => []),
      q(db().from('site_settings').select('key,value')).catch(() => []),
      q(db().from('stories').select('id,status,publish_at').gte('publish_at', new Date(Date.parse(since)).toISOString())).catch(() => []),
      fetch('data/market-rates.json', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch('data/rashifal/latest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    if (view !== 'overview') return;
    const t = today();
    // earnings (cumulative)
    const eDay = {}; earn.forEach(e => { eDay[e.earned_on] = (eDay[e.earned_on] || 0) + (+e.amount || 0); });
    const cur = series(eDay, w.from, w.to), prev = series(eDay, w.prevFrom, w.prevTo);
    const cum = a => { let s = 0; return a.map(v => (s += v)); };
    const cc = cum(cur), pc = cum(prev), max = Math.max(1, ...cc, ...pc) * 1.12, slots = Math.max(w.slots, pc.length, cc.length);
    const W = 700, H = 200, curL = linePath(cc, W, H, max, 12, slots), prevL = linePath(pc, W, H, max, 12, slots);
    const last = curL.pts[curL.pts.length - 1] || [0, H];
    const curTotal = sum(cur), prevTotal = sum(prev), [eT, eC] = trend(curTotal, prevTotal);
    // month target + sources
    const mStart = t.slice(0, 8) + '01', monthTotal = earn.filter(e => e.earned_on >= mStart).reduce((s, e) => s + (+e.amount || 0), 0);
    const target = +setting(settings, 'earnings_target', 0) || 0;
    const monthLen = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate(), left = monthLen - +t.slice(8, 10);
    const bySrc = {}; earn.filter(e => e.earned_on >= w.from && e.earned_on <= w.to).forEach(e => { bySrc[e.source] = (bySrc[e.source] || 0) + (+e.amount || 0); });
    const srcRows = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
    // traffic
    const pv = mapOf(o.pageviews_daily), vis = mapOf(o.visitors_daily), rd = mapOf(o.views_daily);
    const pvC = series(pv, w.from, w.to), pvP = series(pv, w.prevFrom, w.prevTo);
    const viC = series(vis, w.from, w.to), viP = series(vis, w.prevFrom, w.prevTo);
    const rdC = series(rd, w.from, w.to), rdP = series(rd, w.prevFrom, w.prevTo);
    const stDay = {}; stories.filter(s => s.status !== 'draft' && s.publish_at && Date.parse(s.publish_at) <= Date.now()).forEach(s => { const d = istDay(s.publish_at); stDay[d] = (stDay[d] || 0) + 1; });
    const stC = series(stDay, w.from, w.to), stP = series(stDay, w.prevFrom, w.prevTo);
    const kpi = (label, cur, prev, sub, color, fill) => { const [tt, tc] = trend(sum(cur), sum(prev)); return `<div class="card kpi"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="cap">${label}</span><span class="pill ${tc}">${tt}</span></div><strong class="num">${num(sum(cur))}</strong>${spark(cur, color, fill)}<small>${sub}</small></div>`; };
    // tasks
    const liveAds = ads.filter(a => a.enabled).length, empty = Object.keys(SLOTS).length - ads.length;
    const active = camps.filter(c => c.starts_on <= t && c.ends_on >= t).sort((a, b) => a.ends_on.localeCompare(b.ends_on));
    const soon = active[0];
    const task = (n, title, note, href, bg, ink) => `<a class="task" href="${href}"><b style="background:${bg};color:${ink}">${esc(n)}</b><span><strong>${title}</strong><small>${note}</small></span>${ICON.chev}</a>`;
    // health
    const health = [];
    health.push(['Database', 'Connected', '#2f8f5b', '#d9f0e2']);
    const ratesDate = rates && (rates.gold && rates.gold.date);
    health.push(['Market rates', ratesDate ? dLabel(ratesDate) : 'No data', ratesDate === t ? '#2f8f5b' : '#d08a12', ratesDate === t ? '#d9f0e2' : '#fbe7c8']);
    const rDate = rashi && (rashi.date || rashi.day || (rashi.generated_at || '').slice(0, 10));
    health.push(['Rashifal', rDate ? dLabel(String(rDate).slice(0, 10)) : (rashi ? 'Ready' : 'No data'), rashi ? '#2f8f5b' : '#d08a12', rashi ? '#d9f0e2' : '#fbe7c8']);
    const lastPub = stories.filter(s => s.status !== 'draft' && s.publish_at && Date.parse(s.publish_at) <= Date.now()).map(s => s.publish_at).sort().pop();
    health.push(['Last story', lastPub ? ago(lastPub) : 'None in 75 days', lastPub ? '#2f8f5b' : '#d08a12', lastPub ? '#d9f0e2' : '#fbe7c8']);
    health.push(['Ads live', liveAds + ' of ' + Object.keys(SLOTS).length, liveAds ? '#2f8f5b' : '#d08a12', liveAds ? '#d9f0e2' : '#fbe7c8']);
    const name = (me.user_metadata && me.user_metadata.full_name) || 'Owner';
    const dateLine = new Date(Date.now() + IST).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const seg = `<div class="seg" role="group" aria-label="Time range">${[['7', '7 days'], ['30', '30 days'], ['month', 'This month']].map(([k, l]) => `<button type="button" data-range="${k}" aria-pressed="${range === k}">${l}</button>`).join('')}</div>`;
    const live = `<span class="pill p-green" title="Updates every 30 seconds"><span class="dot" style="background:#2f8f5b;margin-right:6px;vertical-align:middle"></span>Live · ${num(o.online_now || 0)} online now</span>`;
    const topRows = (o.top || []).map((s, i) => `<div class="top-row"><span class="rk">${i + 1}</span><div class="tt"><span class="gb">${esc(s.title || s.en)}</span><small>${esc([s.author, s.district].filter(Boolean).join(' · '))}</small></div><div style="text-align:right"><strong class="num">${short(s.views)}</strong><div style="font-size:11.5px;color:#5f6880">reads</div></div></div>`).join('') || '<p class="empty">No reads counted yet.</p>';
    const dmax = Math.max(1, ...(o.districts || []).map(d => +d.n));
    const distRows = (o.districts || []).slice(0, 6).map((d, i) => `<div class="bar-row"><div><span style="font-weight:600">${esc(d.name)}</span><span class="num muted">${num(d.n)} stories</span></div><div class="bar"><i style="width:${(d.n / dmax * 100).toFixed(0)}%;background:${['#14233a', '#3b5a8a', '#3b5a8a', '#6f8bb5', '#6f8bb5', '#9fb1cc'][i]}"></i></div></div>`).join('') || '<p class="empty">No published stories yet.</p>';
    const totalSrc = sum(srcRows.map(r => r[1])) || 1;

    paint(header('Sat Sri Akal, ' + esc(name) + ' · ' + esc(dateLine), "Today's control room", seg + live + `<button type="button" class="btn" id="refreshNow" aria-label="Refresh now">${ICON.refresh}</button>`) + `
      <section class="tasks" aria-label="To-do">
        ${task(o.pending_applications || 0, 'Join requests', 'Journalists to approve', '#team', '#fdf6e8', '#6e4206')}
        ${task(o.reports_waiting || 0, 'Reports waiting', 'Journalist news for the desk', 'join-newsroom#review', '#fdf0f0', '#a3262d')}
        ${task(Math.max(0, empty), 'Empty ad slots', 'Room for new ads', '#ads', '#e8eef8', '#1f3d6b')}
        ${soon ? task(diffDays(t, soon.ends_on), esc(soon.client), 'days left · ' + esc(soon.kind) + ' campaign', '#ads', '#e3f4ea', '#17633a') : task('0', 'Active campaigns', 'Add a DIPR or local campaign', '#ads', '#e3f4ea', '#17633a')}
      </section>
      <section class="grid">
        <div class="hero s8">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px;align-items:flex-start;position:relative;z-index:1">
            <div style="display:flex;flex-direction:column;gap:6px"><span class="cap">Total earnings · ${w.name}</span><strong class="hero-big num">${inr(curTotal)}</strong><span class="hero-sub"><span style="color:${eC === 'p-red' ? '#ffb4b4' : '#7fe0a8'};font-weight:800">${eT}</span> vs previous period · ${inr(prevTotal)}</span></div>
            <div class="legend"><span><i style="background:#e7c27a"></i>This period</span><span><i style="background:transparent;border-top:2px dashed #7d8aa5;height:0"></i>Previous period</span></div>
          </div>
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Earnings added up day by day, this period compared with the previous period" style="width:100%;height:200px;display:block;position:relative;z-index:1">
            <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7c27a" stop-opacity=".38"/><stop offset="1" stop-color="#e7c27a" stop-opacity="0"/></linearGradient></defs>
            <path d="M0 50H700M0 100H700M0 150H700" stroke="rgba(255,255,255,.08)" fill="none"/>
            ${prevL.d ? `<path d="${prevL.d}" fill="none" stroke="#7d8aa5" stroke-width="2" stroke-dasharray="6 6" vector-effect="non-scaling-stroke"/>` : ''}
            ${curL.d ? `<path d="${curL.d} L${last[0].toFixed(1)} ${H} L0 ${H} Z" fill="url(#eg)"/><path d="${curL.d}" fill="none" stroke="#e7c27a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : ''}
          </svg>
          <div class="axis"><span>${dLabel(w.from)}</span><span style="color:#fff;font-weight:800">${dLabel(w.to)} (today)</span></div>
          ${earn.length ? '' : '<p class="hero-sub" style="margin:0;position:relative;z-index:1">No earnings added yet — add DIPR, AdSense and local-ad payments in <a href="#earnings" style="color:#e7c27a">Earnings</a>.</p>'}
        </div>
        <div class="s4 stack" style="gap:20px">
          <div class="card ring-wrap">${ring(target ? monthTotal / target : 0)}<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="cap">Monthly target</span><strong class="num" style="font-size:22px">${inr(monthTotal)}</strong><span style="font-size:13px;color:#4d556b">${target ? 'of ' + inr(target) + ' · ' + left + ' days left' : 'No target set'}</span>${target ? `<span class="pill ${monthTotal >= target * (+t.slice(8, 10) / monthLen) ? 'p-green' : 'p-gold'}" style="align-self:flex-start">${monthTotal >= target * (+t.slice(8, 10) / monthLen) ? 'On track' : 'Behind'}</span>` : '<a href="#earnings" style="font-size:13px;font-weight:800">Set target →</a>'}</div></div>
          <div class="card stack" style="flex:1"><span class="cap">Earnings by source · ${w.name}</span>
            ${srcRows.length ? `<div class="splitbar" role="img" aria-label="${srcRows.map(([s, a]) => s + ' ' + Math.round(a / totalSrc * 100) + '%').join(', ')}">${srcRows.map(([s, a]) => `<i style="width:${(a / totalSrc * 100).toFixed(1)}%;background:${SRC_COLORS[s]}"></i>`).join('')}</div>${srcRows.map(([s, a]) => `<div class="src"><i style="background:${SRC_COLORS[s]}"></i><span>${esc(s)}</span><small class="muted">${Math.round(a / totalSrc * 100)}%</small><strong class="num" style="min-width:86px;text-align:right">${inr(a)}</strong></div>`).join('')}` : '<p class="empty">No earnings in this period.</p>'}
          </div>
        </div>
      </section>
      <section class="row4" aria-label="Website numbers">
        ${kpi('Website views', pvC, pvP, `All time ${num(o.pageviews_total)} · every page open counts`, '#14233a', 'rgba(20,35,58,.08)')}
        ${kpi('New visitors', viC, viP, `All time ${num(o.visitors_total)} unique browsers`, '#b5761a', 'rgba(217,173,78,.14)')}
        ${kpi('Article reads', rdC, rdP, `All time ${num(o.views_total)} reads`, '#2f8f5b', 'rgba(47,143,91,.1)')}
        ${kpi('Stories published', stC, stP, `${num(o.stories && o.stories.published)} live on the website`, '#3b5a8a', 'rgba(59,90,138,.1)')}
      </section>
      <section class="grid">
        <div class="card s5 stack" style="gap:8px"><div class="card-head"><h2>Top stories</h2><span class="cap">by reads</span></div>${topRows}</div>
        <div class="card s4 stack"><div class="card-head"><h2>Stories by district</h2><span class="cap">Top 6</span></div><div class="bars">${distRows}</div></div>
        <div class="s3 stack" style="gap:20px">
          <div class="card stack" style="gap:12px"><h2>Newsroom</h2><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
            <div class="tile"><strong class="num">${num(o.stories && o.stories.today)}</strong><span>Published today</span></div>
            <div class="tile" style="background:#fdf0f0"><strong class="num" style="color:#a3262d">${num(o.reports_waiting)}</strong><span>Reports waiting</span></div>
            <div class="tile"><strong class="num">${num(o.journalists)}</strong><span>Journalists</span></div>
            <div class="tile" style="background:#fdf6e8"><strong class="num" style="color:#6e4206">${num(o.pending_applications)}</strong><span>Join requests</span></div>
            <div class="tile"><strong class="num">${num(o.stories && o.stories.scheduled)}</strong><span>Scheduled</span></div>
            <div class="tile"><strong class="num">${num(o.stories && o.stories.drafts)}</strong><span>Drafts</span></div>
          </div></div>
          <div class="card stack" style="gap:10px"><h2>System health</h2>${health.map(h => `<div class="health"><span class="dot" style="background:${h[2]};box-shadow:0 0 0 3px ${h[3]}"></span><span>${h[0]}</span><small>${esc(h[1])}</small></div>`).join('')}</div>
        </div>
      </section>
      <p class="muted" style="margin:0;font-size:12.5px;text-align:center">Real numbers from your database. Website views and readers update by themselves every 30 seconds. The public footer may show a higher launch number; these are the real counts.</p>`);
    $('view').querySelectorAll('[data-range]').forEach(b => b.onclick = () => { range = b.dataset.range; overview(true).catch(fail); });
    $('refreshNow').onclick = () => overview(true).catch(fail);
  }

  /* ---------- EARNINGS ---------- */
  async function earnings() {
    loading('Earnings');
    const [rows, settings] = await Promise.all([
      q(db().from('earnings').select('*').order('earned_on', { ascending: false }).order('created_at', { ascending: false }).limit(300)),
      q(db().from('site_settings').select('key,value')).catch(() => [])
    ]);
    if (view !== 'earnings') return;
    const t = today(), target = +setting(settings, 'earnings_target', 0) || 0;
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1 - i, 1)); months.push(d.toISOString().slice(0, 7)); }
    const byM = {}; rows.forEach(r => { const m = r.earned_on.slice(0, 7); byM[m] = (byM[m] || 0) + (+r.amount || 0); });
    const mMax = Math.max(1, ...months.map(m => byM[m] || 0), target);
    paint(header('Earnings & growth', 'Earnings') + `
      <section class="grid">
        <form class="card s5 stack" id="earnForm"><div class="card-head"><div><h2>Add earning</h2><p>DIPR payment, AdSense payout or a local ad</p></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <label class="fld">Date<input type="date" id="eDate" required value="${t}" max="${addDays(t, 1)}"></label>
            <label class="fld">Source<select id="eSrc">${Object.keys(SRC_COLORS).map(s => `<option>${s}</option>`).join('')}</select></label>
          </div>
          <label class="fld">Amount (₹)<input type="number" id="eAmt" required min="0" step="1" inputmode="numeric" placeholder="27500"></label>
          <label class="fld">Note<input id="eNote" maxlength="300" placeholder="e.g. DIPR Nov campaign, bill no."></label>
          <button class="btn dark" type="submit" style="justify-content:center">${ICON.plus}Add earning</button>
        </form>
        <div class="card s7 stack"><div class="card-head"><div><h2>Last 6 months</h2><p>Total per month${target ? ' · target ' + inr(target) : ''}</p></div>
          <form id="targetForm" style="display:flex;gap:8px;align-items:flex-end"><label class="fld">Monthly target (₹)<input type="number" id="target" min="0" step="1000" value="${target || ''}" style="width:150px"></label><button class="btn sm" type="submit">Save</button></form></div>
          <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:end;height:200px;position:relative">
            ${months.map(m => { const v = byM[m] || 0; return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end"><strong class="num" style="font-size:12px">${short(v)}</strong><i style="display:block;width:100%;max-width:56px;height:${Math.max(2, v / mMax * 150).toFixed(0)}px;background:${m === t.slice(0, 7) ? '#d9ad4e' : '#14233a'};border-radius:8px 8px 3px 3px"></i><span style="font-size:12px;color:#5f6880">${new Date(m + '-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}</span></div>`; }).join('')}
          </div>
        </div>
      </section>
      <section class="card" style="padding:0;overflow:hidden"><div class="card-head" style="padding:18px 20px"><h2>All entries</h2><span class="muted">${rows.length} shown</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Source</th><th>Note</th><th style="text-align:right">Amount</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${dLabel(r.earned_on)} ${r.earned_on.slice(0, 4)}</td><td><span class="pill" style="background:${SRC_COLORS[r.source]}22;color:#14233a"><span class="dot" style="background:${SRC_COLORS[r.source]};margin-right:6px"></span>${esc(r.source)}</span></td><td>${esc(r.note) || '<span class="muted">—</span>'}</td><td class="num" style="text-align:right;font-weight:800">${inr(r.amount)}</td><td style="text-align:right"><button type="button" class="btn sm danger" data-del="${esc(r.id)}">Delete</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No earnings yet. Add the first one above.</td></tr>'}
        </tbody></table></div></section>`);
    $('earnForm').onsubmit = async e => {
      e.preventDefault(); const amt = +$('eAmt').value;
      if (!(amt >= 0) || !$('eDate').value) return toast('Enter a date and amount.', true);
      try { await q(db().from('earnings').insert({ earned_on: $('eDate').value, source: $('eSrc').value, amount: amt, note: $('eNote').value.trim() })); toast('Earning added'); earnings().catch(fail); } catch (er) { fail(er); }
    };
    $('targetForm').onsubmit = async e => { e.preventDefault(); try { await rpc('super_admin_save_setting', { setting_key: 'earnings_target', setting_value: Math.max(0, +$('target').value || 0), public_setting: false }); toast('Target saved'); earnings().catch(fail); } catch (er) { fail(er); } };
    $('view').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirmIt(b)) return; try { await q(db().from('earnings').delete().eq('id', b.dataset.del)); toast('Deleted'); earnings().catch(fail); } catch (er) { fail(er); } });
  }
  // Two-tap confirm (no browser pop-ups): first tap arms the button, second tap does it.
  function confirmIt(b) { if (b.dataset.armed) return true; b.dataset.armed = '1'; const t = b.textContent; b.textContent = 'Tap again to confirm'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t; } }, 3500); return false; }

  /* ---------- ADS & CAMPAIGNS ---------- */
  async function ads() {
    loading('Ads & DIPR');
    const [list, camps] = await Promise.all([api.ads(), q(db().from('ad_campaigns').select('*').order('ends_on', { ascending: false }))]);
    if (view !== 'ads') return;
    const t = today(), active = camps.filter(c => c.starts_on <= t && c.ends_on >= t);
    const hero = active.find(c => c.kind === 'DIPR') || active[0];
    const counts = { live: list.filter(a => a.enabled).length, paused: list.filter(a => !a.enabled).length };
    const heroHTML = hero ? (() => { const total = diffDays(hero.starts_on, hero.ends_on) + 1, done = Math.min(total, diffDays(hero.starts_on, t) + 1); return `
      <section class="hero" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:28px">
        <div style="display:flex;flex-direction:column;gap:6px;flex:1 1 280px;position:relative;z-index:1"><span class="cap">${esc(hero.kind)} campaign · Live</span><strong style="font-size:24px;font-weight:800">${esc(hero.client)}</strong><span class="hero-sub">${esc((hero.slots || []).map(s => (SLOTS[s] || [s])[0]).join(', ') || 'No slots chosen')} · ${dLabel(hero.starts_on)} – ${dLabel(hero.ends_on)} · ${inr(hero.amount)}</span><div class="camp-bar" style="margin-top:8px"><i style="width:${(done / total * 100).toFixed(0)}%"></i></div><span style="font-size:12px;color:#a9b4c8">${done} days done · ${total - done} days left</span></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;position:relative;z-index:1"><div class="hstat"><span>Value</span><div class="num">${short(hero.amount)}</div></div><div class="hstat"><span>Days left</span><div class="num">${total - done}</div></div><div class="hstat"><span>Active campaigns</span><div class="num">${active.length}</div></div></div>
      </section>`; })() : `<section class="notice">No campaign is running today. Add a DIPR or local campaign below to track it.</section>`;
    paint(header('Earnings & growth', 'Ads & DIPR', `<span class="pill p-green">${counts.live} live</span><span class="pill p-gold">${counts.paused} paused</span><span class="pill p-grey">${Object.keys(SLOTS).length - list.length} empty</span>`) + heroHTML + `
      <section class="card stack"><div class="card-head"><div><h2>Ad slots on the website</h2><p>JPG / PNG / WebP (made light automatically) or animated GIF up to 3 MB</p></div></div>
        <div class="slots">${Object.entries(SLOTS).map(([slot, [n, where, size]]) => { const a = list.find(x => x.slot === slot), st = !a ? ['Empty', 'p-grey'] : a.enabled ? ['Live', 'p-green'] : ['Paused', 'p-gold'];
          return `<div class="slot${a && a.enabled ? '' : ' off'}"><div class="thumb" ${a && api.safeUrl(a.image) ? `style="background-image:url('${esc(a.image)}')"` : ''}></div><div class="body"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>${n}</strong><span class="pill ${st[1]}" style="font-size:11px;padding:2px 8px">${st[0]}</span></div><span style="font-size:12px;color:#5f6880">${where} · <span class="num">${size}</span></span>${a && a.href ? `<a href="${esc(a.href)}" target="_blank" rel="noopener" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.href.replace(/^https:\/\//, ''))}</a>` : ''}
            <div class="acts"><label class="btn sm" style="position:relative">${a ? 'Change' : 'Add ad'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-up="${slot}" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>${a ? `<button type="button" class="btn sm" data-link="${slot}">Link</button><button type="button" class="btn sm" data-toggle="${slot}">${a.enabled ? 'Pause' : 'Resume'}</button><button type="button" class="btn sm danger" data-remove="${slot}">Remove</button>` : ''}</div></div></div>`; }).join('')}</div>
      </section>
      <section class="grid">
        <form class="card s5 stack" id="campForm"><div class="card-head"><div><h2>New campaign</h2><p>DIPR Punjab or a local client</p></div></div>
          <label class="fld">Client<input id="cClient" required maxlength="120" placeholder="Punjab Govt awareness campaign"></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><label class="fld">Type<select id="cKind"><option>DIPR</option><option>Local</option><option>Other</option></select></label><label class="fld">Amount (₹)<input id="cAmt" type="number" min="0" step="1" value="0"></label>
          <label class="fld">Starts<input id="cFrom" type="date" required value="${t}"></label><label class="fld">Ends<input id="cTo" type="date" required value="${addDays(t, 29)}"></label></div>
          <fieldset style="border:1px solid #e3e6ee;border-radius:12px;padding:10px 12px;margin:0"><legend class="cap" style="padding:0 6px">Slots</legend><div style="display:flex;flex-wrap:wrap;gap:8px 14px">${Object.entries(SLOTS).map(([s, [n]]) => `<label style="display:flex;gap:6px;align-items:center;font-size:13px;min-height:32px"><input type="checkbox" value="${s}" data-cslot>${n}</label>`).join('')}</div></fieldset>
          <label class="fld">Note<input id="cNote" maxlength="300" placeholder="Release order no., contact person…"></label>
          <button class="btn dark" type="submit" style="justify-content:center">${ICON.plus}Add campaign</button>
        </form>
        <div class="card s7" style="padding:0;overflow:hidden"><div class="card-head" style="padding:18px 20px"><h2>Campaigns</h2><span class="muted">${camps.length}</span></div>
          <div class="tbl-wrap"><table class="tbl" style="min-width:640px"><thead><tr><th>Client</th><th>Dates</th><th style="text-align:right">Amount</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
          ${camps.map(c => { const st = c.ends_on < t ? ['Ended', 'p-grey'] : c.starts_on > t ? ['Upcoming', 'p-blue'] : ['Live', 'p-green']; return `<tr><td><strong>${esc(c.client)}</strong><div class="muted" style="font-size:12px">${esc(c.kind)}${c.note ? ' · ' + esc(c.note) : ''}</div></td><td style="white-space:nowrap">${dLabel(c.starts_on)} – ${dLabel(c.ends_on)}</td><td class="num" style="text-align:right;font-weight:800">${inr(c.amount)}</td><td><span class="pill ${st[1]}">${st[0]}</span></td><td style="text-align:right;white-space:nowrap"><button type="button" class="btn sm" data-paid="${esc(c.id)}">Record payment</button> <button type="button" class="btn sm danger" data-cdel="${esc(c.id)}">Delete</button></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">No campaigns yet.</td></tr>'}
          </tbody></table></div></div>
      </section>`);
    const v = $('view'), find = s => list.find(a => a.slot === s);
    v.querySelectorAll('[data-up]').forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; const slot = inp.dataset.up, old = find(slot);
      toast(f.type === 'image/gif' ? 'Uploading GIF…' : 'Making image light and uploading…');
      try { const image = await api.upload(f, { maxSide: 2200, maxBytes: 450 * 1024, allowGif: true }); await api.saveAd({ slot, image, href: old ? old.href : '', enabled: true }); toast('Ad saved — live on the website'); ads().catch(fail); }
      catch (er) { fail(er); }
    });
    v.querySelectorAll('[data-link]').forEach(b => b.onclick = () => { const a = find(b.dataset.link); dialog(`<h2 style="margin:0 0 10px;font-size:18px">Where should this ad open?</h2><label class="fld">Destination URL<input id="linkUrl" type="url" placeholder="https://" value="${esc(a.href)}"></label><p class="muted" style="font-size:12.5px">Leave empty for no link. Only https:// links work.</p>`, [{ label: 'Save link', cls: 'dark', run: async () => { try { await api.saveAd({ slot: a.slot, image: a.image, href: $('linkUrl').value.trim(), enabled: a.enabled }); $('dlg').close(); toast('Link saved'); ads().catch(fail); } catch (er) { fail(er); } } }]); });
    v.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => { const a = find(b.dataset.toggle); try { await api.saveAd({ slot: a.slot, image: a.image, href: a.href, enabled: !a.enabled }); toast(a.enabled ? 'Ad paused' : 'Ad live again'); ads().catch(fail); } catch (er) { fail(er); } });
    v.querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => { if (!confirmIt(b)) return; try { await q(db().from('advertisements').delete().eq('slot', b.dataset.remove)); toast('Ad removed'); ads().catch(fail); } catch (er) { fail(er); } });
    $('campForm').onsubmit = async e => {
      e.preventDefault();
      if ($('cTo').value < $('cFrom').value) return toast('End date must be after the start date.', true);
      try { await q(db().from('ad_campaigns').insert({ client: $('cClient').value.trim(), kind: $('cKind').value, amount: +$('cAmt').value || 0, starts_on: $('cFrom').value, ends_on: $('cTo').value, note: $('cNote').value.trim(), slots: [...v.querySelectorAll('[data-cslot]:checked')].map(c => c.value) })); toast('Campaign added'); ads().catch(fail); } catch (er) { fail(er); }
    };
    v.querySelectorAll('[data-cdel]').forEach(b => b.onclick = async () => { if (!confirmIt(b)) return; try { await q(db().from('ad_campaigns').delete().eq('id', b.dataset.cdel)); toast('Campaign deleted'); ads().catch(fail); } catch (er) { fail(er); } });
    v.querySelectorAll('[data-paid]').forEach(b => b.onclick = () => { const c = camps.find(x => x.id === b.dataset.paid); dialog(`<h2 style="margin:0 0 10px;font-size:18px">Record payment · ${esc(c.client)}</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><label class="fld">Date<input id="pDate" type="date" value="${today()}"></label><label class="fld">Amount (₹)<input id="pAmt" type="number" min="0" value="${+c.amount || 0}"></label></div><p class="muted" style="font-size:12.5px">This adds an entry in Earnings (${c.kind === 'DIPR' ? 'DIPR' : 'Local ad'}).</p>`, [{ label: 'Add to earnings', cls: 'dark', run: async () => { try { await q(db().from('earnings').insert({ earned_on: $('pDate').value, source: c.kind === 'DIPR' ? 'DIPR' : c.kind === 'Local' ? 'Local ad' : 'Other', amount: +$('pAmt').value || 0, note: c.client })); $('dlg').close(); toast('Payment added to earnings'); } catch (er) { fail(er); } } }]); });
  }

  /* ---------- TEAM ---------- */
  async function team() {
    loading('Team, roles & approvals');
    const people = await rpc('super_admin_team');
    if (view !== 'team') return;
    const count = r => people.filter(p => p.role === r).length;
    const pend = people.filter(p => p.role === 'pending');
    setNew(pend.length);
    const owner = people.find(p => p.role === 'super') || { name: 'You' };
    const filters = [['all', 'All', people.length], ['admin', 'Admins', count('admin')], ['editor', 'Editors', count('editor')], ['journalist', 'Journalists', count('journalist')], ['pending', 'Join requests', pend.length], ['blocked', 'Blocked', count('blocked')]];
    const shown = people.filter(p => (teamFilter === 'all' || p.role === teamFilter) && (!teamQuery || (p.name + ' ' + p.email + ' ' + p.district).toLowerCase().includes(teamQuery)));
    const roleSel = p => p.role === 'super' || p.id === me.id ? `<span class="pill ${ROLE[p.role][1]}">${ROLE[p.role][0]}</span>` : `<label class="sr" for="r-${esc(p.id)}">Role for ${esc(p.name)}</label><select class="inp" id="r-${esc(p.id)}" data-role="${esc(p.id)}" style="min-height:36px;padding:6px 10px;width:auto">${['admin', 'editor', 'journalist', 'blocked'].map(r => `<option value="${r}"${p.role === r ? ' selected' : ''}>${ROLE[r][0]}</option>`).join('')}${['pending', 'none'].includes(p.role) ? `<option value="" selected disabled>${ROLE[p.role][0]}</option>` : ''}</select>`;
    const perms = [['Write & edit own news (journalist dashboard)', [1, 1, 1, 1]], ['Write, edit & publish website stories', [1, 1, 1, 0]], ['Ads on the website', [1, 1, 1, 0]], ['Approve / decline journalists', [1, 1, 0, 0]], ['Earnings, views & campaigns', [1, 0, 0, 0]], ['Pages, menu & site settings', [1, 0, 0, 0]], ['Give or take roles', [1, 0, 0, 0]]];
    paint(header('Control', 'Team, roles &amp; approvals', `<label class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sr">Search people</span><input type="search" id="teamSearch" placeholder="Name, email or district…" value="${esc(teamQuery)}"></label><button type="button" class="btn dark" id="addMember">${ICON.plus}Add member</button>`) + `
      <section class="row4">
        <div class="hero" style="padding:20px;border-radius:20px;gap:6px"><span class="cap">Super admin</span><strong style="font-size:20px;position:relative;z-index:1">${esc(owner.name)}</strong><span class="hero-sub">Earnings, views, ads &amp; controls</span></div>
        <div class="card stack" style="gap:6px;padding:20px"><span class="cap">Admins &amp; editors</span><strong class="num" style="font-size:30px">${count('admin') + count('editor')}</strong><span style="font-size:13px;color:#4d556b">${esc(people.filter(p => p.role === 'admin').map(p => p.name).slice(0, 2).join(', ') || 'Newsroom desk')}</span></div>
        <div class="card stack" style="gap:6px;padding:20px"><span class="cap">Active journalists</span><strong class="num" style="font-size:30px">${count('journalist')}</strong><span style="font-size:13px;color:#4d556b">${new Set(people.filter(p => p.role === 'journalist' && p.district).map(p => p.district)).size} districts</span></div>
        <div class="card stack" style="gap:6px;padding:20px;border-color:#f0d9a8;background:#fffaf0"><span class="cap" style="color:#6e4206">Join requests</span><strong class="num" style="font-size:30px;color:#6e4206">${pend.length}</strong><span style="font-size:13px;color:#4d556b">Approve after viewing proof</span></div>
      </section>
      <section class="grid">
        <div class="card s8" style="padding:0;overflow:hidden">
          <div class="card-head" style="padding:18px 20px"><h2 style="margin-right:auto">Members</h2>${filters.map(([k, l, n]) => `<button type="button" class="btn sm${teamFilter === k ? ' dark' : ''}" data-filter="${k}" aria-pressed="${teamFilter === k}">${l} <span class="num" style="opacity:.75">${n}</span></button>`).join('')}</div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Role</th><th>District</th><th>Last sign-in</th><th>Reports</th><th><span class="sr">Save</span></th></tr></thead><tbody>
          ${shown.map(p => `<tr><td><div class="who"><span class="sa-av">${esc(initials(p.name))}</span><div style="min-width:0"><strong>${esc(p.name)}${p.id === me.id ? ' (you)' : ''}</strong><small>${esc(p.email)}</small></div></div></td><td>${roleSel(p)}</td><td>${esc(p.district) || '<span class="muted">—</span>'}</td><td style="color:#4d556b">${ago(p.last_sign_in_at)}</td><td class="num">${num(p.reports)}<span class="muted" style="font-size:12px"> · ${num(p.reports_month)} this month</span></td><td style="text-align:right">${p.role === 'super' || p.id === me.id ? '' : `<button type="button" class="btn sm" data-save="${esc(p.id)}" disabled>Save</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nobody matches.</td></tr>'}
          </tbody></table></div>
        </div>
        <div class="card s4 stack"><div class="card-head"><h2>Join requests</h2><span class="pill p-gold">${pend.length} new</span></div>
          ${pend.map(p => `<div style="border:1px solid #e3e6ee;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px"><div class="who"><span class="sa-av" style="border-radius:12px">${esc(initials(p.name))}</span><div style="min-width:0"><strong>${esc(p.name)}</strong><small>${esc(p.district)} · ${ago(p.created_at)}</small></div></div><button type="button" class="btn sm dark" data-proof="${esc(p.id)}" style="justify-content:center">View proof &amp; decide</button></div>`).join('') || '<p class="empty">No new requests.</p>'}
          <p class="muted" style="margin:0;font-size:12.5px;line-height:1.5">Approve unlocks only after the proof document is opened. Admins can do this too.</p>
        </div>
      </section>
      <section class="card" style="padding:0;overflow:hidden"><div class="card-head" style="padding:18px 20px"><div><h2>Who can do what</h2><p>Enforced by the database — only the super admin changes roles</p></div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Permission</th><th style="text-align:center">Super admin</th><th style="text-align:center">Admin</th><th style="text-align:center">Editor</th><th style="text-align:center">Journalist</th></tr></thead><tbody>
        ${perms.map(([n, f]) => `<tr><td style="font-weight:600">${n}</td>${f.map((y, i) => `<td style="text-align:center">${y ? `<span class="perm${i === 0 ? ' top' : ''}" role="img" aria-label="Allowed">${ICON.tick}</span>` : '<span class="no" role="img" aria-label="Not allowed">—</span>'}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div></section>`);
    const v = $('view');
    $('teamSearch').oninput = e => { teamQuery = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; team().then(() => { const s = $('teamSearch'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }).catch(fail); };
    v.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { teamFilter = b.dataset.filter; team().catch(fail); });
    v.querySelectorAll('[data-role]').forEach(s => s.onchange = () => { const b = v.querySelector(`[data-save="${CSS.escape(s.dataset.role)}"]`); if (b) b.disabled = false; });
    v.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => { const s = v.querySelector(`[data-role="${CSS.escape(b.dataset.save)}"]`); if (!s.value) return; b.disabled = true; try { await rpc('super_admin_set_role', { target: b.dataset.save, new_role: s.value }); toast('Role updated'); team().catch(fail); } catch (er) { b.disabled = false; fail(er); } });
    v.querySelectorAll('[data-proof]').forEach(b => b.onclick = () => proof(people.find(p => p.id === b.dataset.proof)));
    $('addMember').onclick = () => dialog(`<h2 style="margin:0 0 6px;font-size:18px">Add member</h2><p class="muted" style="margin:0 0 12px;font-size:13px">The person needs an account first (they apply at join-newsroom, or you create the user in Supabase → Authentication).</p><div class="stack"><label class="fld">Email<input id="mEmail" type="email" placeholder="name@example.com"></label><label class="fld">Role<select id="mRole"><option value="journalist">Journalist</option><option value="editor">Editor (stories)</option><option value="admin">Admin (stories + approvals)</option></select></label></div>`, [{ label: 'Give access', cls: 'dark', run: async () => { try { await rpc('super_admin_add_member', { member_email: $('mEmail').value.trim(), new_role: $('mRole').value }); $('dlg').close(); toast('Access given'); team().catch(fail); } catch (er) { fail(er); } } }]);
  }
  async function proof(p) {
    const head = `<h2 style="margin:0 0 4px;font-size:18px">${esc(p.name)}</h2><p class="muted" style="margin:0">${esc(p.email)} · ${esc(p.district)}</p>`;
    dialog(head + '<p class="notice" style="margin-top:12px">Opening documents…</p>', []);
    try {
      const res = await rpc('read_journalist_docs', { applicant: p.id }), docs = res.docs || {};
      const labels = { photo: 'Photo', aadhaar_front: 'Aadhaar front', aadhaar_back: 'Aadhaar back', proof: 'Press proof' };
      const figs = ['photo', 'aadhaar_front', 'aadhaar_back', 'proof'].filter(k => docs[k] && /^image\/(png|jpeg|webp)$/.test(docs[k].mime) && /^[A-Za-z0-9+/=\s]+$/.test(docs[k].data))
        .map(k => `<figure style="margin:0;text-align:center"><img alt="${esc(labels[k])} of ${esc(p.name)}" style="max-width:100%;max-height:220px" src="data:${docs[k].mime};base64,${docs[k].data.replace(/\s/g, '')}"><figcaption class="muted" style="font-size:12px;font-weight:800">${labels[k]}</figcaption></figure>`).join('');
      const ident = `<p style="margin:10px 0;font-weight:800">Mobile: ${esc(res.mobile || '-')} · Aadhaar: ${esc(String(res.aadhaar || '').replace(/(\d{4})(?=\d)/g, '$1 '))}</p>`;
      const decide = d => async () => { try { const n = $('dnote'); await rpc('review_journalist', { applicant: p.id, decision: d, note: n ? n.value.trim() : '' }); $('dlg').close(); toast(d === 'approved' ? 'Approved — they can now file news' : 'Declined'); team().catch(fail); } catch (er) { fail(er); } };
      dialog(head + ident + (figs ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">${figs}</div>` : '<p class="notice warn">No documents found.</p>')
        + '<textarea id="dnote" maxlength="500" rows="2" placeholder="Note for the applicant if you decline (they will see this)" style="width:100%;margin-top:10px;font:inherit;box-sizing:border-box;border:1px solid #d6dae4;border-radius:10px;padding:8px 10px"></textarea>',
        [{ label: 'Decline', cls: 'danger', run: decide('declined') }, { label: 'Approve', cls: 'green', run: decide('approved') }]);
    } catch (er) { $('dlg').close(); fail(er); }
  }

  /* ---------- PAGES & SETTINGS ---------- */
  async function site() {
    loading('Pages & site settings');
    const rows = await q(db().from('site_settings').select('*'));
    if (view !== 'site') return;
    const hidden = new Set(setting(rows, 'menu_hidden', []) || []);
    const ticker = setting(rows, 'ticker_enabled', true) !== false, signups = setting(rows, 'journalist_signups', true) !== false;
    const notice = setting(rows, 'site_notice', { on: false, pa: '', hi: '', en: '' }) || {};
    const sw = (id, on, label) => `<button type="button" class="switch" role="switch" id="${id}" aria-checked="${on}" aria-label="${label}"></button>`;
    paint(header('Control', 'Pages &amp; site settings', `<a class="btn" href="./" target="_blank" rel="noopener">Open website ↗</a>`) + `
      <section class="grid">
        <div class="card s7 stack"><div class="card-head"><div><h2>Pages &amp; menu</h2><p>Switch off to hide a page from the website menu. The page itself keeps working.</p></div><button type="button" class="btn dark sm" id="saveMenu">Save menu</button></div>
          ${MENU.map(([href, name, where]) => `<div class="list-row${hidden.has(href) ? ' off' : ''}"><div class="tt"><strong>${esc(name)}</strong><small>${where} · primeznews.com/${esc(href)}</small></div><span class="pill ${hidden.has(href) ? 'p-grey' : 'p-green'}" data-state="${esc(href)}">${hidden.has(href) ? 'Hidden' : 'In menu'}</span>${sw('m-' + MENU.findIndex(m => m[0] === href), !hidden.has(href), 'Show ' + name + ' in menu').replace('<button', `<button data-href="${esc(href)}"`)}</div>`).join('')}
        </div>
        <div class="s5 stack" style="gap:20px">
          <div class="card stack"><h2>Site settings</h2>
            <div class="list-row"><div class="tt"><strong>Breaking news ticker</strong><small>Latest-news strip under the menu</small></div>${sw('sTicker', ticker, 'Breaking news ticker')}</div>
            <div class="list-row"><div class="tt"><strong>Journalist sign-ups open</strong><small>Show “Apply to join” links</small></div>${sw('sSignups', signups, 'Journalist sign-ups open')}</div>
            <button type="button" class="btn dark" id="saveSettings" style="justify-content:center">Save settings</button>
          </div>
          <form class="card stack" id="noticeForm"><div class="card-head"><div><h2>Notice for visitors</h2><p>A short strip at the top of every page (e.g. maintenance, festival greeting)</p></div>${sw('nOn', !!notice.on, 'Show notice')}</div>
            <label class="fld">ਪੰਜਾਬੀ<input id="nPa" maxlength="200" value="${esc(notice.pa)}" class="gb"></label>
            <label class="fld">हिंदी<input id="nHi" maxlength="200" value="${esc(notice.hi)}"></label>
            <label class="fld">English<input id="nEn" maxlength="200" value="${esc(notice.en)}"></label>
            <button class="btn dark" type="submit" style="justify-content:center">Save notice</button>
          </form>
        </div>
      </section>`);
    const v = $('view');
    v.querySelectorAll('.switch').forEach(s => s.onclick = () => { const on = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', String(on)); if (s.dataset.href) { const p = v.querySelector(`[data-state="${CSS.escape(s.dataset.href)}"]`); p.textContent = on ? 'In menu' : 'Hidden'; p.className = 'pill ' + (on ? 'p-green' : 'p-grey'); s.closest('.list-row').classList.toggle('off', !on); } });
    const save = (k, val) => rpc('super_admin_save_setting', { setting_key: k, setting_value: val, public_setting: true });
    $('saveMenu').onclick = async () => { try { await save('menu_hidden', [...v.querySelectorAll('[data-href]')].filter(s => s.getAttribute('aria-checked') !== 'true').map(s => s.dataset.href)); toast('Menu saved — visitors see it within a few minutes'); } catch (er) { fail(er); } };
    $('saveSettings').onclick = async () => { try { await save('ticker_enabled', $('sTicker').getAttribute('aria-checked') === 'true'); await save('journalist_signups', $('sSignups').getAttribute('aria-checked') === 'true'); toast('Settings saved'); } catch (er) { fail(er); } };
    $('noticeForm').onsubmit = async e => { e.preventDefault(); const val = { on: $('nOn').getAttribute('aria-checked') === 'true', pa: $('nPa').value.trim(), hi: $('nHi').value.trim(), en: $('nEn').value.trim() }; if (val.on && !val.pa && !val.en && !val.hi) return toast('Write the notice text first.', true); try { await save('site_notice', val); toast('Notice saved'); } catch (er) { fail(er); } };
  }

  /* ---------- AUDIT ---------- */
  async function audit() {
    loading('Audit log');
    const rows = await rpc('super_admin_audit', { max_rows: 200 });
    if (view !== 'audit') return;
    paint(header('Control', 'Audit log') + `<section class="card" style="padding:0;overflow:hidden"><div class="card-head" style="padding:18px 20px"><div><h2>Recent changes</h2><p>Roles, settings, earnings and campaigns — newest first</p></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td style="white-space:nowrap">${new Date(r.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td><td>${esc(r.actor)}</td><td><strong>${esc(r.action)}</strong></td><td style="color:#4d556b">${esc(r.detail)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nothing yet.</td></tr>'}
      </tbody></table></div></section>`);
  }

  /* ---------- routing & start ---------- */
  const VIEWS = { overview, earnings, ads, team, site, audit };
  function setNew(n) { const p = $('navNew'); p.hidden = !n; p.textContent = n + ' new'; }
  function route() {
    const want = (location.hash || '#overview').slice(1);
    view = VIEWS[want] ? want : 'overview';
    document.querySelectorAll('.sa-nav a').forEach(a => { if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.classList.remove('menu-open');
    VIEWS[view]().catch(er => { if (/super_admin|function|relation|does not exist/i.test((er && er.message) || '')) gate('Super admin database setup is pending. Run <code>backend/super-admin.sql</code> once in the Supabase SQL Editor (see <code>backend/SUPER-ADMIN.md</code>).', true); else gate(esc((er && er.message) || 'Could not load. Please refresh.'), true); });
    window.scrollTo(0, 0);
  }
  async function start() {
    if (!api || !api.configured) return gate('Backend setup pending. Add the Supabase details in <code>assets/js/backend-config.js</code>.', true);
    try {
      const user = (await db().auth.getUser()).data.user;
      if (!user) { location.replace('login'); return; }
      me = user;
      const check = await db().rpc('is_super_admin');
      if (check.error) return gate('Super admin database setup is pending. Run <code>backend/super-admin.sql</code> once in the Supabase SQL Editor, then refresh.', true);
      if (check.data !== true) return gate('This account is not a super admin. <a href="admin">Open the newsroom</a> instead.', true);
      const name = (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0];
      $('meName').textContent = name; $('meMail').textContent = user.email; $('meIni').textContent = initials(name);
      window.addEventListener('hashchange', route);
      route();
      db().from('journalist_applications').select('user_id', { count: 'exact', head: true }).eq('status', 'pending').then(r => { if (!r.error) setNew(r.count || 0); });
      timer = setInterval(() => { if (view === 'overview' && document.visibilityState === 'visible' && !$('dlg').open) overview(true).catch(() => {}); }, 30000);
    } catch (er) { gate(esc(er.message || 'Could not check access.'), true); }
  }
  $('signOut').onclick = async () => { clearInterval(timer); try { await api.logout(); } finally { location.replace('login'); } };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('menu-open'); });
  start();
})();
