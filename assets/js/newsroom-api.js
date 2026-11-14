/* Supabase Auth + Postgres RLS + Storage. All write access is enforced in SQL. */
(function (root) {
  'use strict';
  const cfg = root.PRIMEZ_BACKEND || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || '') && !!cfg.publicKey;
  let client;
  function db() {
    if (!configured) throw new Error('Backend setup pending. Add the Supabase project URL and public key in assets/js/backend-config.js.');
    if (!root.supabase) throw new Error('Unable to load sign-in service. Check your connection and reload.');
    return client || (client = root.supabase.createClient(cfg.url, cfg.publicKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
        storage: {
          getItem: key => sessionStorage.getItem(key) || localStorage.getItem(key),
          setItem: (key, value) => { const remember = localStorage.getItem('primezRemember') === 'yes'; (remember ? localStorage : sessionStorage).setItem(key, value); (remember ? sessionStorage : localStorage).removeItem(key); },
          removeItem: key => { sessionStorage.removeItem(key); localStorage.removeItem(key); }
        } }
    }));
  }
  function check(result) { if (result.error) throw result.error; return result.data; }
  function safeUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  }
  function image(value) {
    if (safeUrl(value)) return safeUrl(value);
    return /^[a-z0-9-]+$/i.test(value || '') ? 'assets/' + value + '.webp' : 'assets/fields.webp';
  }
  async function requireEditor() {
    const user = check(await db().auth.getUser()).user;
    if (!user) throw new Error('Please sign in.');
    const membership = check(await db().from('newsroom_editors').select('user_id').eq('user_id', user.id).maybeSingle());
    if (!membership) throw new Error('This account has no newsroom access. Contact your administrator.');
    return user;
  }
  function validateStory(story, now = Date.now()) {
    if (!story.en.trim() || !story.title.trim() || !story.summary.trim()) throw new Error('Add both headlines and a summary.');
    const allowed = ['Agriculture','Education','Politics','Sports','Faith','Crime','Punjab'];
    if (!Array.isArray(story.categories) || !story.categories.length) throw new Error('Select at least one category.');
    if (story.categories.some(c => !allowed.includes(c)) || new Set(story.categories).size !== story.categories.length || story.category !== story.categories[0]) throw new Error('Choose valid categories and a primary category.');
    for (const [field, limit] of [['title',500],['en',500],['summary',3000],['body',100000]]) {
      if (typeof story[field] !== 'string' || story[field].length > limit) throw new Error('Article text exceeds the allowed length.');
    }
    if (story.status !== 'draft' && !story.body.trim()) throw new Error('Add article content before publishing.');
    if (!['draft','published','scheduled'].includes(story.status)) throw new Error('Choose a valid publication status.');
    if (story.status === 'scheduled' && (!story.publish_at || !Number.isFinite(Date.parse(story.publish_at)) || Date.parse(story.publish_at) <= now)) throw new Error('Choose a future publishing date and time.');
    if (story.status === 'published' && !Number.isFinite(Date.parse(story.publish_at))) throw new Error('Published stories need a valid publication time.');
    return story;
  }
  function istToISO(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a valid date and time.');
    const date = new Date(value + ':00+05:30');
    if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 19800000).toISOString().slice(0,16) !== value) throw new Error('Choose a valid date and time.');
    return date.toISOString();
  }
  async function upload(file) {
    if (!file) return '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1000000) throw new Error('Use a JPG, PNG or WebP image under 1 MB.');
    const user = await requireEditor();
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = user.id + '/' + crypto.randomUUID() + '.' + ext;
    check(await db().storage.from('newsroom-media').upload(path, file, { contentType: file.type, upsert: false }));
    return db().storage.from('newsroom-media').getPublicUrl(path).data.publicUrl;
  }
  root.PrimezAPI = {
    configured, db, requireEditor, validateStory, istToISO, safeUrl, image,
    async login(identifier, password, remember = false) { localStorage.setItem('primezRemember', remember ? 'yes' : 'no'); const email = identifier.includes('@') ? identifier.trim() : cfg.usernames?.[identifier.trim().toLowerCase()]; if (!email) throw new Error('User ID is not configured. Sign in with your email address.'); check(await db().auth.signInWithPassword({ email, password })); return requireEditor(); },
    async logout() { check(await db().auth.signOut()); },
    async recover(email) { check(await db().auth.resetPasswordForEmail(email, { redirectTo: new URL('reset-password.html', location.href).href })); },
    async reset(password) { check(await db().auth.updateUser({ password })); },
    async stories() { return check(await db().from('stories').select('*').order('updated_at', { ascending: false })); },
    async publicStories() { return check(await db().rpc('published_stories')); },
    async save(story) { await requireEditor(); validateStory(story); return check(await db().from('stories').upsert(story).select().single()); },
    async remove(id) { await requireEditor(); check(await db().from('stories').delete().eq('id', id)); },
    async ads() { return check(await db().from('advertisements').select('*')); },
    async saveAd(ad) { await requireEditor(); if (ad.href && !safeUrl(ad.href)) throw new Error('Use an HTTPS destination URL.'); return check(await db().from('advertisements').upsert(ad).select().single()); },
    upload
  };
})(window);
