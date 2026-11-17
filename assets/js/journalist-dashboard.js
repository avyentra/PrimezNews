/* Journalist dashboard: own news board, write / edit after posting, photo upload, name + logout.
   Security is enforced in SQL (backend/journalist-dashboard.sql); this file only renders. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const T = {
    dashboard: ['ਡੈਸ਼ਬੋਰਡ', 'डैशबोर्ड', 'Dashboard'],
    submit: ['ਨਵੀਂ ਖ਼ਬਰ ਭੇਜੋ', 'नई खबर भेजें', 'Submit news'],
    returnedNav: ['ਵਾਪਸ ਆਈਆਂ', 'वापस आईं', 'Returned'],
    publishedNav: ['ਛਪੀਆਂ ਖ਼ਬਰਾਂ', 'छपी खबरें', 'Published'],
    site: ['ਵੈੱਬਸਾਈਟ ਵੇਖੋ', 'वेबसाइट देखें', 'View website'],
    logout: ['ਸਾਈਨ ਆਉਟ', 'साइन आउट', 'Sign out'],
    welcome: ['ਜੀ ਆਇਆਂ ਨੂੰ,', 'स्वागत है,', 'Welcome,'],
    search: ['ਸਿਰਲੇਖ, ਸ਼੍ਰੇਣੀ ਜਾਂ ਜ਼ਿਲ੍ਹੇ ਨਾਲ ਖੋਜੋ…', 'शीर्षक, श्रेणी या ज़िले से खोजें…', 'Search by headline, category or district…'],
    colPending: ['ਬਕਾਇਆ', 'लंबित', 'Pending'],
    colReview: ['ਸਮੀਖਿਆ ਵਿੱਚ', 'समीक्षा में', 'In review'],
    colApproved: ['ਮਨਜ਼ੂਰ', 'स्वीकृत', 'Approved'],
    total: ['ਕੁੱਲ ਖ਼ਬਰਾਂ', 'कुल खबरें', 'Total news'],
    published: ['ਛਪ ਗਈਆਂ', 'प्रकाशित', 'Published'],
    returned: ['ਸੋਧ ਲਈ ਵਾਪਸ', 'सुधार के लिए वापस', 'Returned for changes'],
    reporter: ['ਰਿਪੋਰਟਰ', 'रिपोर्टर', 'Reporter'],
    desk: ['ਡੈਸਕ ਐਡੀਟਰ', 'डेस्क एडिटर', 'Desk editor'],
    chief: ['ਮੁੱਖ ਸੰਪਾਦਕ', 'मुख्य संपादक', 'Chief editor'],
    sPublished: ['ਛਪ ਗਈ', 'प्रकाशित', 'Published'],
    sReturned: ['ਵਾਪਸ ਆਈ', 'वापस आई', 'Returned'],
    sEdited: ['ਸੋਧੀ ਗਈ', 'संशोधित', 'Edited'],
    edit: ['ਸੋਧੋ', 'संपादित करें', 'Edit'],
    empty: ['ਇੱਥੇ ਹਾਲੇ ਕੋਈ ਖ਼ਬਰ ਨਹੀਂ', 'यहाँ अभी कोई खबर नहीं', 'No news here yet'],
    newTitle: ['ਨਵੀਂ ਖ਼ਬਰ ਲਿਖੋ', 'नई खबर लिखें', 'Write a news report'],
    editTitle: ['ਖ਼ਬਰ ਸੋਧੋ', 'खबर संपादित करें', 'Edit news'],
    editHint: ['ਸੋਧ ਤੋਂ ਬਾਅਦ ਖ਼ਬਰ ਦੁਬਾਰਾ ਡੈਸਕ ਕੋਲ ਸਮੀਖਿਆ ਲਈ ਜਾਵੇਗੀ।', 'संपादन के बाद खबर दोबारा डेस्क पर समीक्षा के लिए जाएगी।', 'After editing, the news goes back to the desk for review.'],
    editorNote: ['ਸੰਪਾਦਕ ਦੀ ਟਿੱਪਣੀ:', 'संपादक की टिप्पणी:', "Editor's note:"],
    fHeadline: ['ਸਿਰਲੇਖ', 'शीर्षक', 'Headline'],
    fCategory: ['ਸ਼੍ਰੇਣੀ', 'श्रेणी', 'Category'],
    fDistrict: ['ਜ਼ਿਲ੍ਹਾ', 'ज़िला', 'District'],
    fPhoto: ['ਖ਼ਬਰ ਦੀ ਫ਼ੋਟੋ', 'खबर की फोटो', 'News photo'],
    photoPick: ['ਫ਼ੋਟੋ ਚੁਣੋ ਜਾਂ ਇੱਥੇ ਛੱਡੋ', 'फोटो चुनें या यहाँ छोड़ें', 'Choose a photo or drop it here'],
    photoRule: ['JPG, PNG ਜਾਂ WebP · ਫ਼ੋਟੋ ਆਪਣੇ ਆਪ ਹਲਕੀ ਹੋ ਜਾਵੇਗੀ', 'JPG, PNG या WebP · फोटो अपने आप हल्की हो जाएगी', 'JPG, PNG or WebP · made light automatically'],
    photoChange: ['ਫ਼ੋਟੋ ਬਦਲੋ', 'फोटो बदलें', 'Change photo'],
    photoRemove: ['ਫ਼ੋਟੋ ਹਟਾਓ', 'फोटो हटाएँ', 'Remove photo'],
    photoBad: ['JPG, PNG ਜਾਂ WebP ਫ਼ੋਟੋ ਵਰਤੋ (25 MB ਤੱਕ)।', 'JPG, PNG या WebP फोटो इस्तेमाल करें (25 MB तक)।', 'Use a JPG, PNG or WebP photo (up to 25 MB).'],
    fBody: ['ਪੂਰੀ ਖ਼ਬਰ', 'पूरी खबर', 'Full report'],
    cancel: ['ਰੱਦ ਕਰੋ', 'रद्द करें', 'Cancel'],
    send: ['ਸੰਪਾਦਕ ਨੂੰ ਭੇਜੋ', 'संपादक को भेजें', 'Send to editor'],
    save: ['ਸੋਧ ਸੇਵ ਕਰੋ', 'बदलाव सेव करें', 'Save changes'],
    saving: ['ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ…', 'सेव हो रहा है…', 'Saving…'],
    sent: ['ਖ਼ਬਰ ਸੰਪਾਦਕ ਨੂੰ ਭੇਜ ਦਿੱਤੀ ਗਈ।', 'खबर संपादक को भेज दी गई।', 'News sent to the editor.'],
    saved: ['ਸੋਧ ਸੇਵ ਹੋ ਗਈ, ਖ਼ਬਰ ਸਮੀਖਿਆ ਲਈ ਗਈ।', 'बदलाव सेव, खबर समीक्षा के लिए गई।', 'Changes saved and sent for review.'],
    required: ['ਸਿਰਲੇਖ ਅਤੇ ਪੂਰੀ ਖ਼ਬਰ ਲਿਖੋ।', 'शीर्षक और पूरी खबर लिखें।', 'Add a headline and the full report.'],
    setup: ['ਐਡਿਟ ਅਤੇ ਫ਼ੋਟੋ ਲਈ ਐਡਮਿਨ ਨੂੰ backend/journalist-dashboard.sql ਚਲਾਉਣ ਲਈ ਕਹੋ।', 'एडिट और फोटो के लिए एडमिन से backend/journalist-dashboard.sql चलवाएँ।', 'Ask the admin to run backend/journalist-dashboard.sql to enable editing and photos.'],
    loading: ['ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', 'लोड हो रहा है…', 'Loading…'],
    demo: ['ਡੈਮੋ ਮੋਡ: ਨਮੂਨਾ ਡਾਟਾ (ਸਿਰਫ਼ ਲੋਕਲ ਕੰਪਿਊਟਰ)', 'डेमो मोड: नमूना डेटा (सिर्फ लोकल)', 'Demo mode: sample data (local only)']
  };
  const CATS = { Punjab: ['ਪੰਜਾਬ', 'पंजाब', 'Punjab'], Politics: ['ਸਿਆਸਤ', 'राजनीति', 'Politics'], Agriculture: ['ਖੇਤੀਬਾੜੀ', 'खेती', 'Agriculture'], Education: ['ਸਿੱਖਿਆ', 'शिक्षा', 'Education'], Sports: ['ਖੇਡਾਂ', 'खेल', 'Sports'], Faith: ['ਧਰਮ', 'धर्म', 'Faith'], Crime: ['ਅਪਰਾਧ', 'अपराध', 'Crime'] };
  const DISTRICTS = { 'Amritsar': ['ਅੰਮ੍ਰਿਤਸਰ', 'अमृतसर'], 'Barnala': ['ਬਰਨਾਲਾ', 'बरनाला'], 'Bathinda': ['ਬਠਿੰਡਾ', 'बठिंडा'], 'Chandigarh': ['ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़'], 'Faridkot': ['ਫ਼ਰੀਦਕੋਟ', 'फरीदकोट'], 'Fatehgarh Sahib': ['ਫ਼ਤਹਿਗੜ੍ਹ ਸਾਹਿਬ', 'फतेहगढ़ साहिब'], 'Fazilka': ['ਫ਼ਾਜ਼ਿਲਕਾ', 'फाजिल्का'], 'Ferozepur': ['ਫ਼ਿਰੋਜ਼ਪੁਰ', 'फिरोजपुर'], 'Gurdaspur': ['ਗੁਰਦਾਸਪੁਰ', 'गुरदासपुर'], 'Hoshiarpur': ['ਹੁਸ਼ਿਆਰਪੁਰ', 'होशियारपुर'], 'Jalandhar': ['ਜਲੰਧਰ', 'जालंधर'], 'Kapurthala': ['ਕਪੂਰਥਲਾ', 'कपूरथला'], 'Ludhiana': ['ਲੁਧਿਆਣਾ', 'लुधियाना'], 'Malerkotla': ['ਮਲੇਰਕੋਟਲਾ', 'मलेरकोटला'], 'Mansa': ['ਮਾਨਸਾ', 'मानसा'], 'Moga': ['ਮੋਗਾ', 'मोगा'], 'Pathankot': ['ਪਠਾਨਕੋਟ', 'पठानकोट'], 'Patiala': ['ਪਟਿਆਲਾ', 'पटियाला'], 'Rupnagar': ['ਰੂਪਨਗਰ', 'रूपनगर'], 'SAS Nagar (Mohali)': ['ਮੋਹਾਲੀ', 'मोहाली'], 'SBS Nagar': ['ਨਵਾਂਸ਼ਹਿਰ', 'नवांशहर'], 'Sangrur': ['ਸੰਗਰੂਰ', 'संगरूर'], 'Sri Muktsar Sahib': ['ਸ੍ਰੀ ਮੁਕਤਸਰ ਸਾਹਿਬ', 'श्री मुक्तसर साहिब'], 'Tarn Taran': ['ਤਰਨ ਤਾਰਨ', 'तरन तारन'] };
  const COLS = { submitted: 'pending', returned: 'pending', in_review: 'review', approved: 'approved', published: 'approved' };
  const STEP = { submitted: 1, returned: 1, in_review: 2, approved: 3, published: 3 };

  let lang = 'pa';
  try { lang = sessionStorage.getItem('primezLanguage') || 'pa'; } catch {}
  if (!['pa', 'hi', 'en'].includes(lang)) lang = 'pa';
  const idx = () => ({ pa: 0, hi: 1, en: 2 })[lang];
  const t = k => (T[k] || [k, k, k])[idx()];
  const cat = c => (CATS[c] || CATS.Punjab)[idx()];
  const dist = d => !d ? '' : lang === 'en' ? (d === 'SAS Nagar (Mohali)' ? 'Mohali' : d) : (DISTRICTS[d] || [d, d])[idx()];

  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const demo = local && new URLSearchParams(location.search).get('demo') === '1';
  let db = null, user = null, profile = { name: '', district: '' }, rows = [], filter = 'board', query = '', editing = null, photo = { file: null, url: '', removed: false }, hasNewColumns = true;

  const node = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const MONTHS = { pa: ['ਜਨਵਰੀ','ਫ਼ਰਵਰੀ','ਮਾਰਚ','ਅਪ੍ਰੈਲ','ਮਈ','ਜੂਨ','ਜੁਲਾਈ','ਅਗਸਤ','ਸਤੰਬਰ','ਅਕਤੂਬਰ','ਨਵੰਬਰ','ਦਸੰਬਰ'], hi: ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'], en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
  function when(iso) {
    const d = new Date(iso); if (!Number.isFinite(d.getTime())) return '';
    if (d.toDateString() === new Date().toDateString()) { const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'); return (h % 12 || 12) + ':' + m + (h < 12 ? ' AM' : ' PM'); }
    return d.getDate() + ' ' + MONTHS[lang][d.getMonth()];
  }
  function toast(msg) { const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500); }
  function notice(msg) { $('notice').textContent = msg || ''; $('notice').hidden = !msg; }
  function result(r) { if (r.error) throw r.error; return r.data; }

  /* ---------- text & language ---------- */
  function applyText() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
    document.querySelectorAll('.jd-lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    $('search').placeholder = t('search');
    const cs = $('fCategory'), keep = cs.value; cs.replaceChildren(...Object.keys(CATS).map(k => { const o = node('option', '', cat(k)); o.value = k; return o; })); cs.value = keep || 'Punjab';
    const ds = $('fDistrict'), keepD = ds.value; ds.replaceChildren(...Object.keys(DISTRICTS).map(k => { const o = node('option', '', dist(k)); o.value = k; return o; })); ds.value = keepD || profile.districtKey || 'Chandigarh';
    if (editing !== undefined) { $('editorTitle').textContent = editing ? t('editTitle') : t('newTitle'); $('saveBtn').textContent = editing ? t('save') : t('send'); }
  }
  document.querySelectorAll('.jd-lang button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; try { sessionStorage.setItem('primezLanguage', lang); } catch {} applyText(); render(); }));

  /* ---------- profile ---------- */
  function showProfile() {
    const name = profile.name || (user?.email || '').split('@')[0];
    $('userName').textContent = name; $('helloName').textContent = name; $('userEmail').textContent = user?.email || '';
    $('avatar').textContent = $('avatarTop').textContent = initials(name);
  }

  /* ---------- board ---------- */
  function card(r) {
    const step = STEP[r.status] || 1, col = COLS[r.status] || 'pending';
    const a = node('article', 'jd-card tone-' + col + (r.status === 'returned' ? ' is-returned' : ''));
    a.tabIndex = 0; a.setAttribute('role', 'button'); a.setAttribute('aria-label', t('edit') + ': ' + r.headline);
    const top = node('div', 'jd-card-top');
    top.append(node('span', 'jd-tag', cat(r.category)));
    let chip = '';
    if (r.status === 'published') chip = t('sPublished'); else if (r.status === 'returned') chip = t('sReturned'); 
    const right = node('span', 'jd-chip ' + (r.status === 'published' ? 'ok' : r.status === 'returned' ? 'warn' : ''), chip); if (!chip) right.classList.add('soft');
    if (!chip) right.textContent = dist(r.district) || '';
    top.append(right);
    a.append(top);
    if (r.image) { const im = node('img', 'jd-thumb'); im.src = r.image; im.alt = ''; im.loading = 'lazy'; im.onerror = () => im.remove(); a.append(im); }
    a.append(node('h3', '', r.headline));
    if (r.status === 'returned' && r.editor_note) a.append(node('p', 'jd-card-note', t('editorNote') + ' ' + r.editor_note));
    const by = node('div', 'jd-by'); by.append(node('b', 'jd-avatar xs', initials(profile.name)), node('span', '', profile.name || ''), node('time', '', when(r.updated_at || r.submitted_at)));
    a.append(by);
    const prog = node('div', 'jd-steps');
    [['reporter', 1], ['desk', 2], ['chief', 3]].forEach(([k, n]) => { const s = node('div', 'jd-step' + (n <= step ? ' on' : '')); s.append(node('i'), node('small', '', t(k))); prog.append(s); });
    a.append(prog);
    const ed = node('span', 'jd-edit', '✎ ' + t('edit')); a.append(ed);
    const open = () => openEditor(r);
    a.addEventListener('click', open); a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return a;
  }
  function render() {
    const q = query.toLowerCase();
    let list = rows.filter(r => !q || [r.headline, r.body, cat(r.category), r.category, dist(r.district), r.district].join(' ').toLowerCase().includes(q));
    if (filter === 'returned') list = list.filter(r => r.status === 'returned');
    if (filter === 'published') list = list.filter(r => r.status === 'published');
    const by = { pending: [], review: [], approved: [] };
    list.forEach(r => by[COLS[r.status] || 'pending'].push(r));
    document.querySelectorAll('.jd-col').forEach(col => {
      const k = col.dataset.col, items = by[k];
      col.querySelector('em').textContent = '(' + items.length + ')';
      const box = col.querySelector('.jd-list');
      box.replaceChildren(...(items.length ? items.map(card) : [node('p', 'jd-empty', t('empty'))]));
    });
    const count = s => rows.filter(r => s.includes(r.status)).length;
    const stats = [['total', rows.length, 'ic-doc'], ['colPending', count(['submitted', 'returned']), 'ic-clock'], ['colReview', count(['in_review']), 'ic-eye'], ['published', count(['approved', 'published']), 'ic-check']];
    $('stats').replaceChildren(...stats.map(([k, v, ic], i) => { const s = node('div', 'jd-stat s' + i); s.append(node('i', 'ic ' + ic), node('b', '', String(v)), node('small', '', t(k))); return s; }));
    const ret = count(['returned']);
    [$('returnedCount'), $('bellCount')].forEach(e => { e.textContent = String(ret); e.hidden = !ret; });
  }
  $('search').addEventListener('input', e => { query = e.target.value.trim(); render(); });
  document.querySelectorAll('.jd-nav [data-view]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.view === 'new') { openEditor(null); return; }
    filter = b.dataset.view; document.querySelectorAll('.jd-nav [data-view]').forEach(x => x.classList.toggle('active', x === b)); render(); closeMenu();
  }));
  $('bell').addEventListener('click', () => document.querySelector('.jd-nav [data-view="returned"]').click());
  $('newBtn').addEventListener('click', () => openEditor(null));
  const closeMenu = () => { document.body.classList.remove('menu-open'); $('menuBtn').setAttribute('aria-expanded', 'false'); };
  $('menuBtn').addEventListener('click', () => { const o = document.body.classList.toggle('menu-open'); $('menuBtn').setAttribute('aria-expanded', String(o)); });

  /* ---------- editor ---------- */
  function setPhoto(url) {
    $('photoPreview').hidden = !url; if (url) $('photoPreview').src = url; else $('photoPreview').removeAttribute('src');
    $('dropEmpty').hidden = !!url; $('photoChange').hidden = $('photoRemove').hidden = !url;
  }
  function openEditor(r) {
    editing = r; photo = { file: null, url: r?.image || '', removed: false };
    $('editorError').hidden = true;
    applyText();
    $('fHeadline').value = r?.headline || ''; $('fBody').value = r?.body || '';
    $('fCategory').value = r?.category || 'Punjab'; $('fDistrict').value = r?.district || profile.districtKey || 'Chandigarh';
    $('bodyCount').textContent = $('fBody').value.length + ' / 16000';
    $('editHint').hidden = !r; $('editHint').textContent = t('editHint');
    $('editorNote').hidden = !(r && r.status === 'returned' && r.editor_note); if (r?.editor_note) $('editorNote').textContent = t('editorNote') + ' ' + r.editor_note;
    setPhoto(photo.url); $('fPhoto').value = '';
    $('drawer').hidden = false; document.body.classList.add('drawer-open'); closeMenu();
    setTimeout(() => $('fHeadline').focus(), 50);
  }
  function closeEditor() { $('drawer').hidden = true; document.body.classList.remove('drawer-open'); editing = undefined; if (!demo && photo.file && photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url); }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeEditor));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('drawer').hidden) closeEditor(); });
  $('fBody').addEventListener('input', () => { $('bodyCount').textContent = $('fBody').value.length + ' / 16000'; });
  function pick(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 25000000) { $('editorError').textContent = t('photoBad'); $('editorError').hidden = false; return; }
    $('editorError').hidden = true; photo = { file, url: URL.createObjectURL(file), removed: false }; setPhoto(photo.url);
  }
  $('fPhoto').addEventListener('change', e => pick(e.target.files[0]));
  $('photoChange').addEventListener('click', () => $('fPhoto').click());
  $('photoRemove').addEventListener('click', () => { photo = { file: null, url: '', removed: true }; $('fPhoto').value = ''; setPhoto(''); });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => pick(e.dataTransfer.files[0]));

  async function uploadPhoto(file) {
    if (window.PrimezImage) file = await window.PrimezImage.compress(file);   // automatic: light WebP, max 1600 px
    if (file.size > 1000000) throw new Error(t('photoBad'));
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = user.id + '/' + crypto.randomUUID() + '.' + ext;
    result(await db.storage.from('journalist-media').upload(path, file, { contentType: file.type, upsert: false }));
    return db.storage.from('journalist-media').getPublicUrl(path).data.publicUrl;
  }
  $('editor').addEventListener('submit', async e => {
    e.preventDefault();
    const headline = $('fHeadline').value.trim(), body = $('fBody').value.trim();
    if (!headline || !body) { $('editorError').textContent = t('required'); $('editorError').hidden = false; return; }
    const btn = $('saveBtn'); if (btn.disabled) return; btn.disabled = true; const label = btn.textContent; btn.textContent = t('saving'); $('editorError').hidden = true;
    try {
      const data = { headline, body, category: $('fCategory').value, district: $('fDistrict').value };
      if (demo) {
        const now = new Date().toISOString();
        if (photo.file) data.image = photo.url; else if (photo.removed) data.image = '';
        if (editing) Object.assign(editing, data, { status: 'submitted', editor_note: '', updated_at: now });
        else rows.unshift({ id: String(Date.now()), ...data, image: data.image || '', status: 'submitted', submitted_at: now, updated_at: now });
      } else {
        if (!hasNewColumns) { delete data.category; delete data.district; }
        if (photo.file) { if (!hasNewColumns) throw new Error(t('setup')); data.image = await uploadPhoto(photo.file); }
        else if (photo.removed) data.image = '';
        if (editing) result(await db.from('journalist_reports').update(data).eq('id', editing.id));
        else result(await db.from('journalist_reports').insert(data));
        await load();
      }
      const wasEdit = !!editing; closeEditor(); render(); toast(wasEdit ? t('saved') : t('sent'));
    } catch (err) {
      const msg = String(err?.message || err || '');
      $('editorError').textContent = /permission|policy|column|schema|does not exist/i.test(msg) ? t('setup') : (msg || 'Error');
      $('editorError').hidden = false;
    } finally { btn.disabled = false; btn.textContent = label; }
  });

  /* ---------- logout ---------- */
  async function logout() { try { if (db) await db.auth.signOut(); } catch {} location.replace('login'); }
  $('logout').addEventListener('click', logout); $('logoutTop').addEventListener('click', logout);

  /* ---------- data ---------- */
  async function load() {
    const data = result(await db.from('journalist_reports').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }));
    hasNewColumns = !data.length || 'status' in data[0];
    rows = data.map(r => ({ category: 'Punjab', district: '', image: '', status: 'submitted', editor_note: '', updated_at: r.submitted_at, ...r }));
  }
  function demoData() {
    user = { id: 'demo', email: 'gurpreet.reporter@example.com' }; profile = { name: 'Gurpreet Singh', districtKey: 'Ludhiana' };
    const h = (n) => new Date(Date.now() - n * 3600000).toISOString();
    rows = [
      { id: '1', headline: 'ਲੁਧਿਆਣਾ ਦੇ ਸਨਅਤਕਾਰਾਂ ਨੇ ਬਿਜਲੀ ਦਰਾਂ ਬਾਰੇ ਰੱਖੀਆਂ ਮੰਗਾਂ', body: 'ਨਮੂਨਾ ਖ਼ਬਰ', category: 'Punjab', district: 'Ludhiana', status: 'submitted', submitted_at: h(1), updated_at: h(1), image: '' },
      { id: '2', headline: 'ਖੰਨਾ ਮੰਡੀ ਵਿੱਚ ਝੋਨੇ ਦੀ ਲਿਫ਼ਟਿੰਗ ਹੌਲੀ, ਕਿਸਾਨ ਪਰੇਸ਼ਾਨ', body: 'ਨਮੂਨਾ ਖ਼ਬਰ', category: 'Agriculture', district: 'Ludhiana', status: 'returned', editor_note: 'ਮੰਡੀ ਅਧਿਕਾਰੀ ਦਾ ਬਿਆਨ ਜੋੜੋ।', submitted_at: h(5), updated_at: h(3), image: '' },
      { id: '3', headline: 'ਸਕੂਲੀ ਖੇਡਾਂ ਵਿੱਚ ਜ਼ਿਲ੍ਹੇ ਦੀਆਂ ਕੁੜੀਆਂ ਨੇ ਜਿੱਤੇ 6 ਤਗਮੇ', body: 'ਨਮੂਨਾ ਖ਼ਬਰ', category: 'Sports', district: 'Ludhiana', status: 'in_review', submitted_at: h(8), updated_at: h(8), image: 'assets/images/news-farm.webp' },
      { id: '4', headline: 'ਨਗਰ ਨਿਗਮ ਚੋਣਾਂ ਲਈ ਵਾਰਡਬੰਦੀ ਦਾ ਖਰੜਾ ਜਾਰੀ', body: 'ਨਮੂਨਾ ਖ਼ਬਰ', category: 'Politics', district: 'Ludhiana', status: 'published', submitted_at: h(30), updated_at: h(26), image: '' },
      { id: '5', headline: 'ਸਰਕਾਰੀ ਕਾਲਜ ਵਿੱਚ ਨਵਾਂ ਕੰਪਿਊਟਰ ਲੈਬ ਸ਼ੁਰੂ', body: 'ਨਮੂਨਾ ਖ਼ਬਰ', category: 'Education', district: 'Ludhiana', status: 'approved', submitted_at: h(50), updated_at: h(40), image: '' }
    ];
  }
  async function start() {
    applyText();
    if (demo) { demoData(); notice(t('demo')); showProfile(); applyText(); render(); return; }
    try {
      db = window.PrimezAPI.db();
      const session = result(await db.auth.getSession()).session;
      if (!session) { location.replace('login'); return; }
      user = session.user;
      const app = result(await db.from('journalist_applications').select('name,district,status').eq('user_id', user.id).maybeSingle());
      if (!app || app.status !== 'approved') { location.replace('join-newsroom'); return; }
      const key = Object.keys(DISTRICTS).find(k => k.toLowerCase() === String(app.district || '').trim().toLowerCase() || (DISTRICTS[k] || []).includes(String(app.district || '').trim()));
      profile = { name: app.name, districtKey: key || '' };
      showProfile(); applyText();
      await load();
      if (!hasNewColumns) notice(t('setup'));
      render();
    } catch (err) { notice(String(err?.message || err)); render(); }
  }
  render();
  start();
})();
