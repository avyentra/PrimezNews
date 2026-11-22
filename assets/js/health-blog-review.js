(() => {
  const byId = id => document.getElementById(id);
  const dialog = byId('healthReviews');
  const list = byId('healthReviewList');
  const message = byId('healthReviewMessage');
  const queue = () => window.PrimezAPI.db().from('health_blog_reviews');
  const element = (tag, text) => {
    const item = document.createElement(tag);
    item.textContent = text;
    return item;
  };
  let rows = [];
  const opener = byId('openHealthReviews');
  const badge = element('em', '');
  badge.className = 'ad-count';
  badge.hidden = true;
  opener.append(badge);
  let active = false;
  let request = 0;
  function updateCount(count) {
    badge.textContent = String(count);
    badge.hidden = !count;
  }
  const filter = byId('healthReviewFilter');
  let publicPosts = null;
  let editing = false;
  function action(label, handler) {
    const button = element('button', label);
    button.type = 'button';
    button.className = 'btn';
    button.onclick = handler;
    return button;
  }
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => same(a[k], b[k]));
  }
  async function save(row, changes, button) {
    button.disabled = true;
    try {
      const result = await queue().update(changes).eq('slot',row.slot).eq('revision',row.revision).select('slot').single();
      if (result.error) throw new Error(result.error.code === 'PGRST116' ? 'This blog changed in another session. Reopen the library before retrying.' : result.error.message);
      editing = false;
      await refresh(true);
      if (!message.dataset.failed) message.textContent = 'Saved. Approved changes and removals go live after the website export.';
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  }
  function show(row, edit = false) {
    const lang = byId('healthReviewLanguage').value;
    const post = structuredClone(row.post);
    const entry = document.createElement('details');
    entry.open = edit;
    entry.append(element('summary', post.title[lang]));
    const live = publicPosts?.get(post.slug);
    const state = {draft:'Awaiting review',rejected:'Rejected',approved:'Approved',deleted:'Deleted'}[row.status];
    let status = state;
    if (publicPosts === null) status += ' · Live status unavailable';
    else if (live) {
      const {first_public_date, ...content} = live;
      status = row.status === 'deleted' ? 'Removal queued' : same(content, post) ? 'Published' : 'Published · changes queued';
      const date = first_public_date || row.first_public_date;
      if (date) status += ' · Publication date: ' + date;
      const link = element('a','View live article');
      link.href = '/health-blog/' + encodeURIComponent(post.slug) + '/';
      link.target = '_blank'; link.rel = 'noopener';
      entry.append(link);
    } else if (row.status === 'approved') status += ' · Publication queued';
    entry.append(element('p',status),element('small',row.received_at ? 'Received: ' + new Date(row.received_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) + ' IST' : 'Article date: ' + post.date));
    const form = document.createElement('form');
    function field(label, value, minimum = 3) {
      if (!edit) { form.append(element('p', value[lang])); return; }
      const wrap = element('label',label);
      const input = element('textarea','');
      input.required = true; input.minLength = minimum;
      input.rows = value[lang].length > 150 ? 5 : 2;
      input.style.cssText = 'width:100%;display:block;margin:4px 0 12px';
      input.value = value[lang];
      input.oninput = () => { value[lang] = input.value.trim(); const script = {en:/[A-Za-z]/,pa:/[ਁ-੿]/,hi:/[ऀ-ॿ]/}[lang]; input.setCustomValidity(value[lang].length >= minimum && script.test(value[lang]) ? '' : 'Enter complete text in the selected language.'); };
      wrap.append(input); form.append(wrap);
    }
    field('Title',post.title,8); field('Summary',post.excerpt,8); field('Author',post.author);
    post.points.forEach((v,i) => field('Key point ' + (i+1), v,8));
    for (const block of post.body) for (const [kind,value] of Object.entries(block)) {
      if (Array.isArray(value)) value.forEach(v => field('List item', v));
      else field(({p:'Paragraph',h2:'Heading',tip:'Tip'})[kind] || kind, value);
    }
    for (const faq of post.faq || []) {field('Question',faq.q,8);field('Answer',faq.a,8);}
    entry.append(form);
    if (edit) {
      const button = action('Save changes',() => {if (!form.reportValidity()) return;
        if (row.status === 'draft' || (row.status === 'approved' && !live && !row.first_public_date)) {
          const words = post.body.flatMap(block => Object.entries(block).filter(([key]) => key !== 'h2').flatMap(([,v]) => Array.isArray(v) ? v : [v])).reduce((n,v) => n + v.en.trim().split(/\s+/).length,0);
          if (words < 800) {message.textContent = 'The English article body needs at least 800 words before publication.'; return;}
        }
        save(row,{post},button);});
      entry.append(button,action('Cancel',() => {editing = false;render();}));
    } else if (row.status !== 'deleted') {
      entry.append(action('Edit ' + lang.toUpperCase(),() => {editing = true;render();list.replaceChildren(show(row,true));}));
      for (const [status,label] of [['approved','Approve for publication'],['rejected','Reject'],['deleted','Delete blog']]) {
        if (row.status !== 'draft' && status !== 'deleted') continue;
        const button = action(label,() => {
          if (status === 'deleted' && !confirm('Delete this blog and remove its public article on the next export?')) return;
          save(row,{status},button);
        });
        entry.append(button);
      }
    }
    return entry;
  }
  function render() {
    filter.disabled = byId('healthReviewLanguage').disabled = editing;
    if (editing) { filter.disabled = byId('healthReviewLanguage').disabled = true; return; }
    list.replaceChildren(...rows.filter(r => r.status === filter.value).map(r => show(r)));
    if (!list.children.length) list.append(element('p','No blogs in this view.'));
  }
  filter.onchange = byId('healthReviewLanguage').onchange = render;
  dialog.addEventListener('close', () => { editing = false; ++request; });
  async function refresh(force = false) {
    if (!active || document.hidden) return;
    const id = ++request;
    try {
      if (!dialog.open) {
        const {count,error} = await queue().select('slot',{head:true,count:'exact'}).eq('status','draft');
        if (error) throw error;
        if (id === request) updateCount(count);
        return;
      }
      if (editing) return;
      const data = [];
      for (let start = 0;; start += 100) {
        const page = await queue().select('slot,post,status,received_at,first_public_date,revision').order('slot',{ascending:false}).range(start,start+99);
        if (page.error) throw page.error;
        data.push(...page.data);
        if (page.data.length < 100) break;
      }
      let manifest = null;
      try {
        const response = await fetch('/data/health-blog.json',{cache:'no-store'});
        if (response.ok) manifest = new Map((await response.json()).posts.map(p => [p.slug,p]));
      } catch {}
      if (id !== request || editing) return;
      const changed = JSON.stringify(data) !== JSON.stringify(rows) ||
          !same(publicPosts && Object.fromEntries(publicPosts),manifest && Object.fromEntries(manifest));
      rows = data; publicPosts = manifest;
      updateCount(rows.filter(r => r.status === 'draft').length);
      if (force || changed || message.dataset.failed) render();
      delete message.dataset.failed;
      message.textContent = '';
    } catch (error) {
      if (id !== request) return;
      badge.hidden = true;
      message.dataset.failed = 'true';
      message.textContent = error.message;
    }
  }
  function openQueue() {
    active = true;
    if (!dialog.open) dialog.showModal();
    message.textContent = 'Loading drafts…';
    refresh(true);
  }
  opener.onclick = openQueue;
  document.addEventListener('primez-admin-stories', () => {
    active = true;
    if (location.hash === '#blog-drafts') openQueue();
    else refresh();
  }, {once:true});
  document.addEventListener('visibilitychange', () => refresh());
  window.setInterval(() => refresh(), 60000);
})();
