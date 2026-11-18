/* Automatic photo compression before upload (admin + journalist dashboards).
   Any phone/camera photo (JPG, PNG, WebP, up to 25 MB) becomes a light WebP
   (max 1600 px, usually 80–300 KB) in the browser, so the website stays fast. */
(function (root) {
  'use strict';
  const INPUT_LIMIT = 25 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function canvasBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality));
  }
  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back to <img> */ }
    }
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo could not be opened. Use a JPG, PNG or WebP photo.')); };
      img.src = url;
    });
  }
  /**
   * compress(file, {maxSide=1600, maxBytes=300 KB}) -> Promise<File>
   * Returns a smaller WebP (or JPEG if the browser cannot make WebP).
   * If the original is already small enough and not too large in pixels, it is returned unchanged.
   */
  async function compress(file, options) {
    const opt = Object.assign({ maxSide: 1600, maxBytes: 300 * 1024, minQuality: 0.5 }, options || {});
    if (!file) return file;
    if (!TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP photo.');
    if (file.size > INPUT_LIMIT) throw new Error('This photo is too large (over 25 MB).');
    const img = await decode(file);
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    if (!w || !h) throw new Error('This photo could not be opened.');
    const scale = Math.min(1, opt.maxSide / Math.max(w, h));
    if (scale === 1 && file.size <= opt.maxBytes && file.type === 'image/webp') { if (img.close) img.close(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (img.close) img.close();
    let type = 'image/webp';
    let blob = await canvasBlob(canvas, type, 0.82);
    if (!blob || blob.type !== 'image/webp') {            // old Safari: no WebP encoder -> JPEG on white
      type = 'image/jpeg';
      const bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
      const b = bg.getContext('2d'); b.fillStyle = '#fff'; b.fillRect(0, 0, bg.width, bg.height); b.drawImage(canvas, 0, 0);
      blob = await canvasBlob(bg, type, 0.82);
      for (let q = 0.74; blob && blob.size > opt.maxBytes && q >= opt.minQuality; q -= 0.08) blob = await canvasBlob(bg, type, q);
    } else {
      for (let q = 0.74; blob && blob.size > opt.maxBytes && q >= opt.minQuality; q -= 0.08) blob = await canvasBlob(canvas, type, q);
    }
    if (!blob) throw new Error('This photo could not be compressed.');
    if (blob.size >= file.size && scale === 1 && file.size <= 1000000) return file;   // original was already lighter
    const name = String(file.name || 'photo').replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
    return new File([blob], name, { type, lastModified: Date.now() });
  }
  const api = { compress, INPUT_LIMIT, TYPES };
  root.PrimezImage = api;
})(typeof window === 'object' ? window : globalThis);


/* Supabase Auth + Postgres RLS + Storage. All write access is enforced in SQL. */
(function (root) {
  'use strict';
  const cfg = root.PRIMEZ_BACKEND || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || '') && !!cfg.publicKey;
  let client;
  const GIF_LIMIT = 3 * 1024 * 1024;
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
    return /^[a-z0-9-]+$/i.test(value || '') ? 'assets/images/' + value + '.webp' : 'assets/images/fields.webp';
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
    const allowed = ['Agriculture','Education','Politics','Sports','Faith','Crime','Punjab','Business','Health','Jobs','NRI','Entertainment','National','World','Weather','Technology'];
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
  async function upload(file, options) {
    if (!file) return '';
    /* Animated GIF ads: uploaded as they are (compressing would stop the animation). Needs backend/ad-gif-upload.sql. */
    const gif = !!(options && options.allowGif) && file.type === 'image/gif';
    if (gif) { if (file.size > GIF_LIMIT) throw new Error('GIF is too large. Use a GIF under 3 MB.'); }
    /* automatic compression: big phone photos become light WebP before upload */
    else if (typeof window !== 'undefined' && window.PrimezImage) file = await window.PrimezImage.compress(file, options);
    if (!gif && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1000000)) throw new Error('Use a JPG, PNG or WebP image under 1 MB.');
    const user = await requireEditor();
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
    const path = user.id + '/' + crypto.randomUUID() + '.' + ext;
    check(await db().storage.from('newsroom-media').upload(path, file, { contentType: file.type, upsert: false }));
    return db().storage.from('newsroom-media').getPublicUrl(path).data.publicUrl;
  }
  root.PrimezAPI = {
    configured, db, requireEditor, validateStory, istToISO, safeUrl, image,
    async login(identifier, password, remember = false) { localStorage.setItem('primezRemember', remember ? 'yes' : 'no'); const email = identifier.includes('@') ? identifier.trim() : cfg.usernames?.[identifier.trim().toLowerCase()]; if (!email) throw new Error('User ID is not configured. Sign in with your email address.'); const {user} = check(await db().auth.signInWithPassword({ email, password }));
      /* Owner goes to the Super Admin panel (needs backend/super-admin.sql; if missing, normal routing continues) */
      try { const owner = await db().rpc('is_super_admin'); if (!owner.error && owner.data === true) return 'superadmin'; } catch { /* keep normal routing */ }
      const editor = check(await db().from('newsroom_editors').select('user_id').eq('user_id', user.id).maybeSingle());
      if (editor) return 'admin';
      const app = check(await db().from('journalist_applications').select('status').eq('user_id', user.id).maybeSingle());
      return app && app.status === 'approved' ? 'journalist' : 'join-newsroom'; },
    async logout() { check(await db().auth.signOut()); },
    async recover(email) { check(await db().auth.resetPasswordForEmail(email, { redirectTo: new URL('reset-password.html', location.href).href })); },
    async reset(password) { check(await db().auth.updateUser({ password })); },
    async stories() { return check(await db().from('stories').select('*').order('updated_at', { ascending: false })); },
    async publicStories() { return check(await db().rpc('published_stories')); },
    async save(story) { await requireEditor(); validateStory(story); return check(await db().from('stories').upsert(story).select().single()); },
    async remove(id) { await requireEditor(); check(await db().from('stories').delete().eq('id', id)); },
    async ads() { return check(await db().from('advertisements').select('*')); },
    async removeAd(slot) { await requireEditor(); if (!slot) throw new Error('Choose a placement first.'); check(await db().from('advertisements').delete().eq('slot', slot)); return true; },
    async saveAd(ad) { await requireEditor(); if (ad.href && !safeUrl(ad.href)) throw new Error('Use an HTTPS destination URL.'); return check(await db().from('advertisements').upsert(ad).select().single()); },
    upload
  };
})(window);
