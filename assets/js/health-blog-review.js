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
  function render() {
    list.replaceChildren();
    const lang = byId('healthReviewLanguage').value;
    for (const {slot, post} of rows) {
      const entry = document.createElement('details');
      entry.append(element('summary', post.title[lang]), element('small', slot), element('p', post.excerpt[lang]));
      for (const point of post.points) entry.append(element('p', point[lang]));
      for (const block of post.body) {
        const [kind, value] = Object.entries(block)[0];
        if (Array.isArray(value)) {
          const items = document.createElement(kind === 'ol' ? 'ol' : 'ul');
          items.append(...value.map(v => element('li', v[lang])));
          entry.append(items);
        } else entry.append(element(kind === 'h2' ? 'h3' : 'p', value[lang]));
      }
      for (const faq of post.faq) entry.append(element('strong', faq.q[lang]), element('p', faq.a[lang]));
      for (const status of ['approved','rejected']) {
        const button = element('button', status === 'approved' ? 'Approve for publication' : 'Reject');
        button.className = 'btn';
        button.onclick = async () => {
          button.disabled = true;
          try {
            const result = await queue().update({status}).eq('slot', slot).eq('status','draft').select('slot').single();
            if (result.error) throw result.error;
            ++request;
            rows = rows.filter(row => row.slot !== slot);
            updateCount(rows.length);
            message.textContent = status === 'approved' ? 'Approved. Queued for website publication.' : 'Draft rejected.';
            render();
          } catch (error) { message.textContent = error.message; button.disabled = false; }
        };
        entry.append(button);
      }
      list.append(entry);
    }
  }
  byId('healthReviewLanguage').onchange = render;
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
      const {data,error} = await queue().select('slot,post').eq('status','draft').order('slot',{ascending:false});
      if (error) throw error;
      if (id !== request) return;
      updateCount(data.length);
      if (force || message.dataset.failed || JSON.stringify(rows) !== JSON.stringify(data)) {
        rows = data;
        render();
        delete message.dataset.failed;
        message.textContent = rows.length ? '' : 'No drafts awaiting review.';
      }
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
