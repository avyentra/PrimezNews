(() => {
  const byId = id => document.getElementById(id);
  const library = byId('healthReviews');
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
  opener?.append(badge);
  let active = false;
  let request = 0;
  function updateCount(count) {
    badge.textContent = String(count);
    badge.hidden = !count;
  }
  const filters = [...document.querySelectorAll('[data-filter]')];
  let selected = location.hash === '#drafts' ? 'draft' : 'all';
  let publicPosts = null;
  let editing = false;
  function action(label, handler) {
    const button = element('button', label);
    button.type = 'button';
    button.className = 'btn';
    button.onclick = handler;
    return button;
  }
  function iconAction(label, name, handler) {
    const button = action('', handler);
    button.classList.add('blog-icon-button', 'blog-icon-' + name);
    button.setAttribute('aria-label', label);
    button.title = label;
    let icon;
    if (name === 'edit') {
      icon = element('span', '');
      icon.className = 'ic ic-edit';
    } else {
      const ns = 'http://www.w3.org/2000/svg';
      icon = document.createElementNS(ns, 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5');
      icon.append(path);
    }
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
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
    const card = element('div', '');
    card.className = 'blog-entry';
    const entry = document.createElement('details');
    card.append(entry);
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
    entry.querySelector('summary').append(element('small',status));
    if (!live && row.received_at) {
      entry.append(element('small', 'Received: ' + new Date(row.received_at).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'}) + ' IST'));
    }
    const form = document.createElement('form');
    const articleFields = document.createElement('div');
    const publishFields = document.createElement('div');
    let fields = form;
    let chosenFile;
    let previewUrl;
    if (edit) {
      const cover = element('fieldset', '');
      cover.className = 'blog-cover';
      cover.append(element('legend', 'Cover image'));
      const image = document.createElement('img');
      image.alt = 'Blog cover preview';
      const note = element('p', '');
      const file = document.createElement('input');
      file.type = 'file';
      file.accept = 'image/jpeg,image/png,image/webp';
      file.setAttribute('aria-label', 'Upload cover image');
      function updateCover() {
        const value = post.image || '';
        const url = previewUrl || (value.startsWith('https://') ? value : value ? 'assets/images/' + value + '.webp' : '');
        image.hidden = !url;
        if (url) image.src = url;
        else image.removeAttribute('src');
        note.textContent = url ? 'JPG, PNG or WebP. The cover is used for social sharing.' : 'No custom cover. The public blog uses the default Health & Beauty image.';
      }
      function clearPreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = undefined;
      }
      file.onchange = () => {
        const next = file.files[0];
        if (!next) return;
        if (!['image/jpeg','image/png','image/webp'].includes(next.type) || next.size > 15 * 1024 * 1024) {
          message.textContent = 'Choose a JPG, PNG or WebP image up to 15 MB.';
          file.value = '';
          return;
        }
        clearPreview();
        chosenFile = next;
        previewUrl = URL.createObjectURL(next);
        updateCover();
      };
      const remove = action('Remove image', () => {
        clearPreview();
        chosenFile = undefined;
        post.image = '';
        file.value = '';
        updateCover();
      });
      cover.append(image, file, remove, note);
      updateCover();
      form.append(cover);
      entry.addEventListener('blog-cover-close', clearPreview, {once:true});
    }
    function field(label, value, minimum = 3) {
      if (!edit) { form.append(element('p', value[lang])); return; }
      const wrap = element('label',label);
      const input = element('textarea','');
      input.required = true; input.minLength = minimum;
      input.rows = value[lang].length > 150 ? 5 : 2;
      input.style.cssText = 'width:100%;display:block;margin:4px 0 12px';
      input.value = value[lang];
      input.oninput = () => { value[lang] = input.value.trim(); const script = {en:/[A-Za-z]/,pa:/[ਁ-੿]/,hi:/[ऀ-ॿ]/}[lang]; input.setCustomValidity(value[lang].length >= minimum && script.test(value[lang]) ? '' : 'Enter complete text in the selected language.'); };
      wrap.append(input); fields.append(wrap);
    }
    field('Title',post.title,8); field('Summary',post.excerpt,8); field('Author',post.author);
    if (edit) fields = articleFields;
    post.points.forEach((v,i) => field('Key point ' + (i+1), v,8));
    for (const block of post.body) for (const [kind,value] of Object.entries(block)) {
      if (Array.isArray(value)) value.forEach(v => field('List item', v));
      else field(({p:'Paragraph',h2:'Heading',tip:'Tip'})[kind] || kind, value);
    }
    for (const faq of post.faq || []) {field('Question',faq.q,8);field('Answer',faq.a,8);}
    entry.append(form);
    if (edit) {
      const button = action(row.status === 'approved' ? 'Save and publish changes' : 'Save draft changes', async () => {
        if (!form.reportValidity()) return;
        if (row.status === 'draft' || (row.status === 'approved' && !live && !row.first_public_date)) {
          const words = post.body.flatMap(block => Object.entries(block).filter(([key]) => key !== 'h2').flatMap(([,v]) => Array.isArray(v) ? v : [v])).reduce((n,v) => n + v.en.trim().split(/\s+/).length,0);
          if (words < 800) {message.textContent = 'The English article body needs at least 800 words before publication.'; return;}
        }
        button.disabled = true;
        try {
          if (chosenFile) {
            post.image = await window.PrimezAPI.upload(chosenFile);
            chosenFile = undefined;
          }
          await save(row,{post},button);
          if (!editing) entry.dispatchEvent(new Event('blog-cover-close'));
        } catch (error) { message.textContent = error.message; }
        finally { button.disabled = false; }
      });
      const cancel = action('Cancel',() => {entry.dispatchEvent(new Event('blog-cover-close'));editing = false;render();});
      const detailsFields = document.createElement('div');
      detailsFields.append(...form.children);
      publishFields.append(element('p', row.status === 'approved' ? 'Saved changes are queued for publication.' : 'Save your draft for editorial review.'));
      const steps = element('nav', '');
      steps.className = 'blog-steps';
      steps.setAttribute('aria-label','Edit blog');
      const panes = [detailsFields, articleFields, publishFields];
      function selectStep(index) {
        panes.forEach((pane,i) => {pane.hidden = i !== index; steps.children[i].setAttribute('aria-pressed',String(i === index));});
      }
      ['Details','Article','Publish'].forEach((label,i) => steps.append(action(label, () => selectStep(i))));
      form.append(steps, ...panes);
      form.addEventListener('invalid', event => {
        const index = panes.findIndex(pane => pane.contains(event.target));
        if (index >= 0 && panes[index].hidden) selectStep(index);
      }, true);
      const footer = element('div', '');
      footer.className = 'blog-actions';
      footer.append(cancel,button);
      entry.append(footer);
      selectStep(0);
    } else if (row.status !== 'deleted') {
      const toolbar = element('div', '');
      toolbar.className = 'blog-entry-toolbar';
      const editButton = iconAction('Edit blog in ' + lang.toUpperCase(), 'edit', () => {
        editing = true;
        render();
        list.replaceChildren(show(row, true));
        list.querySelector('summary').focus();
      });
      const deleteButton = iconAction('Delete blog', 'delete', () => {
        if (confirm('Delete this blog and remove its public article on the next export?')) {
          save(row, {status:'deleted'}, deleteButton);
        }
      });
      toolbar.append(editButton, deleteButton);
      card.append(toolbar);
      for (const [status,label] of [['approved','Approve for publication'],['rejected','Reject']]) {
        if (row.status !== 'draft' && !(row.status === 'rejected' && status === 'approved')) continue;
        const button = action(label, () => save(row, {status}, button));
        entry.append(button);
      }
    }
    return card;
  }
  function render() {
    byId('healthReviewLanguage').disabled = editing;
    for (const tab of filters) {tab.disabled = editing; tab.setAttribute('aria-pressed', String(tab.dataset.filter === selected));}
    if (editing) return;
    const visible = rows.filter(r => selected === 'all' ? r.status !== 'deleted' : r.status === selected);
    visible.sort((a,b) => b.post.date.localeCompare(a.post.date) || b.slot.localeCompare(a.slot));
    list.replaceChildren(...visible.map(r => show(r)));
    if (!list.children.length) list.append(element('p','No blogs in this view.'));
  }
  for (const tab of filters) tab.onclick = () => {
    selected = tab.dataset.filter;
    history.replaceState(null,'',selected === 'draft' ? '#drafts' : '#all');
    render();
  };
  if (library) byId('healthReviewLanguage').onchange = render;
  async function refresh(force = false) {
    if (!active || document.hidden) return;
    const id = ++request;
    try {
      if (!library) {
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
      if (!message) return;
      message.dataset.failed = 'true';
      message.textContent = error.message;
    }
  }
  if (library) {
    const menu = byId('blogMenu');
    if (menu) menu.onclick = () => {
      const expanded = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(expanded));
      document.body.classList.toggle('ad-menu-open',expanded);
    };
    async function loadLibrary(){
      try {
        const db = window.PrimezAPI.db();
        const {data,error} = await db.auth.getUser();
        if (error || !data.user) { message.textContent = 'Sign in to your newsroom account to view blogs.'; return; }
        const membership = await db.from('newsroom_editors').select('user_id').eq('user_id',data.user.id).maybeSingle();
        if (membership.error) throw membership.error;
        if (!membership.data) {
          const admin = await db.rpc('is_super_admin');
          if (admin.error || !admin.data) throw new Error('Newsroom administrator access required.');
        }
        active = true;
        await refresh(true);
      } catch(error) {message.textContent = error.message;}
    }
    loadLibrary();
  } else {
    document.addEventListener('primez-admin-stories', () => {
      if (location.hash === '#blog-drafts') { location.replace('admin-blogs.html#drafts'); return; }
      active = true; refresh();
    },{once:true});
  }
  document.addEventListener('visibilitychange', () => refresh());
  window.setInterval(() => refresh(), 60000);
})();
