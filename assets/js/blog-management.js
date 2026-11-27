'use strict';

const categories = ['General', 'Business & Finance', 'Health & Beauty', 'Technology', 'Insurance & Legal', 'Education', 'Lifestyle'];
const highStakes = new Set(['Business & Finance', 'Health & Beauty', 'Insurance & Legal']);
const tags = 'p div br h2 h3 strong b em i u ul ol li blockquote table caption thead tbody tr th td a img figure figcaption span'.split(' ');
const pageSize = 15;
const byId = id => document.getElementById(id);
const form = byId('blogForm');
const body = byId('blogBody');
const library = byId('blogLibrary');
const navigation = byId('blogNavigation');
const newBlog = byId('newBlog');
const editorFields = 'title summary category language author audience cover_url cover_alt cover_caption seo_title seo_description focus_keyword secondary_keywords canonical_url social_image'.split(' ');
const field = name => form.elements.namedItem(name);
const message = text => { byId('blogMessage').textContent = text; };
let db, user, current, selection, status = '', page = 0, listRequest = 0, dirty = false, busy = false;

function checked(result) {
  if (result.error) {
    if (result.error.code === '23505') throw new Error('A blog already uses this title, slug, article body or Studio submission.');
    throw new Error(result.error.message);
  }
  return result.data;
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function sanitize(html) {
  const content = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'align', 'scope'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true
  });
  for (const node of content.querySelectorAll('[href], [src], [align]')) {
    for (const attr of ['href', 'src']) {
      if (node.hasAttribute(attr) && !httpsUrl(node.getAttribute(attr))) node.removeAttribute(attr);
    }
    if (node.hasAttribute('align') && !/^(left|center|right)$/.test(node.getAttribute('align'))) node.removeAttribute('align');
  }
  return content;
}

function cleanHtml(html) {
  const container = element('div');
  container.append(sanitize(html));
  return container.innerHTML;
}

function slugify(text) {
  return text.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function readForm() {
  const row = Object.fromEntries(editorFields.map(name => [name, field(name).value.trim()]));
  row.slug = field('slug').value.trim() || null;
  row.body_html = cleanHtml(body.innerHTML);
  row.sources = [...new Set(field('sources').value.trim().split(/\s*\n\s*/).filter(Boolean))];
  row.claims_reviewed = field('claims_reviewed').checked;
  return row;
}

function wordCount(text) {
  return (text.trim().match(/\S+/gu) || []).length;
}

function syncEditor() {
  const words = wordCount(body.textContent);
  byId('blogWords').textContent = words + ' words · ' + Math.ceil(words / 220) + ' min read';
  byId('blogTitleCount').textContent = field('seo_title').value.length + ' characters · aim for 60 or fewer';
  byId('blogDescriptionCount').textContent = field('seo_description').value.length + ' characters · aim for 160 or fewer';
  byId('blogSnippetUrl').textContent = 'primeznews.com › blogs › ' + (field('slug').value || 'article-title');
  byId('blogSnippetTitle').textContent = field('seo_title').value || field('title').value || 'Article title';
  byId('blogSnippetDescription').textContent = field('seo_description').value || field('summary').value;
  const url = httpsUrl(field('cover_url').value);
  const cover = byId('blogCover');
  cover.hidden = !url;
  if (url) cover.src = url;
  else cover.removeAttribute('src');
  cover.alt = field('cover_alt').value;
}

function selectView(active) {
  for (const button of [newBlog, ...navigation.querySelectorAll('[data-status]')]) {
    button.setAttribute('aria-pressed', String(button === active));
  }
}

function openEditor(row = {}) {
  selectView(row.id ? null : newBlog);
  form.inert = false;
  current = row;
  form.reset();
  for (const name of editorFields) if (row[name] != null) field(name).value = row[name];
  field('slug').value = row.slug || '';
  field('slug').readOnly = Boolean(row.published_at);
  field('sources').value = (row.sources || []).join('\n');
  field('claims_reviewed').checked = row.claims_reviewed === true;
  body.replaceChildren(sanitize(row.body_html || ''));
  const published = row.status === 'published';
  byId('blogFormTitle').textContent = row.id ? 'Edit Blog' : 'New Blog';
  byId('blogSave').hidden = published;
  byId('blogUnpublish').hidden = !published;
  byId('blogPublish').textContent = published ? 'Update Published Blog' : 'Publish Now';
  byId('blogDelete').hidden = !row.id;
  byId('blogChecks').replaceChildren();
  selection = null;
  syncEditor();
  library.hidden = true;
  form.hidden = false;
  dirty = false;
  field('title').focus();
}

async function websiteBlogs() {
  const response = await fetch('/data/health-blog.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Could not load the published Health & Beauty archive.');
  const { posts } = await response.json();
  if (!Array.isArray(posts)) throw new Error('The published Health & Beauty archive is unavailable.');
  return posts.filter(post => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug));
}

async function loadList() {
  const request = ++listRequest;
  const category = byId('blogCategory').value;
  const language = byId('blogLanguage').value;
  const search = byId('blogSearch').value.trim().replace(/[\\%_*]/g, ' ').trim();
  const start = page * pageSize;
  function filtered(query) {
    query = query.neq('status', 'deleted');
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (language) query = query.eq('language', language);
    if (search) query = query.ilike('title', '%' + search + '%');
    return query;
  }
  async function editorialPage() {
    const table = db.from('editorial_blogs');
    const query = filtered(table.select('id,title,category,language,status,slug', { count: 'exact' }))
      .order('updated_at', { ascending: false }).order('id').range(start, start + pageSize - 1);
    const result = await query;
    if (result.status !== 416) return result;
    const count = await filtered(table.select('id', { count: 'exact', head: true }));
    return { ...count, data: [] };
  }
  const archive = status !== 'draft' && (!category || category === 'Health & Beauty')
    ? websiteBlogs().then(posts => ({ posts }), error => ({ posts: [], error }))
    : Promise.resolve({ posts: [] });
  const [result, { posts, error }] = await Promise.all([editorialPage(), archive]);
  if (request !== listRequest) return;
  const term = search.toLowerCase();
  const existing = posts.flatMap(post => {
    const languages = (language ? [language] : ['en', 'pa', 'hi']).filter(lang => post.title?.[lang]);
    const matched = languages.filter(lang => post.title[lang].toLowerCase().includes(term));
    if (!matched.length) return [];
    return [{ slug: post.slug, title: post.title[matched[0]], language: matched[0],
      status: 'published', category: 'Health & Beauty', website: true }];
  });
  const editorial = checked(result);
  const editorialCount = result.count;
  const rows = [...editorial, ...existing.slice(Math.max(0, start - editorialCount), Math.max(0, start + pageSize - editorialCount))];
  if (!rows.length && page > 0) {
    page = Math.max(0, Math.ceil((editorialCount + existing.length) / pageSize) - 1);
    return loadList();
  }
  if (error) message(error.message);
  const list = byId('blogResults');
  list.replaceChildren();
  for (const row of rows) {
    const item = element('li');
    const details = element('div');
    details.append(element('strong', row.title), element('p', [row.category, row.language.toUpperCase(), row.status === 'published' ? 'Published' : 'Draft'].join(' · ')));
    item.append(details);
    if (row.website) {
      const edit = element('a', 'Open in Health & Beauty queue');
      edit.href = '/admin-blogs.html?blog=' + encodeURIComponent(row.slug) + '&lang=' + row.language;
      item.append(edit);
    } else {
      const edit = element('button', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', () => run(async () => openEditor(checked(await db.from('editorial_blogs').select('*').eq('id', row.id).single()))));
      item.append(edit);
    }
    if (row.status === 'published') {
      const live = element('a', 'Live page');
      live.href = (row.website ? (row.language === 'pa' ? '' : '/' + row.language) + '/health-blog/' : '/blogs/') + encodeURIComponent(row.slug) + '/';
      item.append(live);
    }
    list.append(item);
  }
  if (!rows.length) list.append(element('li', 'No blogs match these filters.'));
  const total = Math.max(1, Math.ceil((editorialCount + existing.length) / pageSize));
  byId('blogPrev').disabled = page === 0;
  byId('blogNext').disabled = page + 1 >= total;
  byId('blogPage').textContent = 'Page ' + (page + 1) + ' of ' + total;
}

function validate(row, publishing) {
  const errors = [];
  const warnings = [];
  if (!row.title) errors.push('Add a title.');
  if (row.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) errors.push('Use lowercase English letters, numbers and single hyphens in the slug.');
  if ([row.canonical_url, row.social_image, ...row.sources].some(url => url && !httpsUrl(url))) errors.push('Use complete HTTPS URLs for metadata and reference links.');
  if (row.body_html.length > 200000) errors.push('Shorten the article HTML to 200,000 characters or fewer.');
  if (publishing) {
    const content = sanitize(row.body_html);
    const count = wordCount(content.textContent);
    if (!row.slug) errors.push('Add an English URL slug.');
    if (!row.summary || !row.author || !count) errors.push('Add a summary, author and complete article body.');
    if (!httpsUrl(row.cover_url) || !row.cover_alt) errors.push('Upload a cover image and describe it in the alt text.');
    if (!row.seo_title || !row.seo_description) errors.push('Add an SEO title and meta description.');
    if ([...content.querySelectorAll('img')].some(img => !img.src || !img.alt.trim())) errors.push('Supply an image URL and descriptive alt text for every inline image.');
    if ([...content.querySelectorAll('a')].some(link => !link.hasAttribute('href'))) errors.push('Repair incomplete or invalid article links.');
    const claimTerms = /\b(?:cure|treatment|dosage|medical advice|guaranteed returns?|investment advice|legal advice|lawsuit)\b/i;
    if ((highStakes.has(row.category) || claimTerms.test(content.textContent)) && (!row.claims_reviewed || !row.sources.length)) {
      errors.push('Verify high-stakes claims against reliable sources and confirm editorial review.');
    }
    if ((row.sources.length || current.studio_id) && !row.claims_reviewed) errors.push('Open each reference and confirm that it resolves and supports the article.');
    if (count && count < 250) warnings.push('Review article depth. Add substantive context where it helps readers.');
    const paragraphs = [...content.querySelectorAll('p')].map(node => node.textContent.trim().toLowerCase()).filter(Boolean);
    if (new Set(paragraphs).size < paragraphs.length) warnings.push('Review repeated paragraphs.');
    if (row.seo_title.length > 60 || row.seo_description.length > 160) warnings.push('Google may truncate the search title or description.');
  }
  byId('blogChecks').replaceChildren(...[...errors, ...warnings].map(value => element('li', value)));
  if (errors.length) throw new Error('Review the items below the editor before continuing.');
  if (warnings.length && !window.confirm(warnings.join('\n') + '\nContinue publishing?')) return false;
  return true;
}

async function persist(nextStatus) {
  const row = ['deleted', 'unpublish'].includes(nextStatus) ? {} : readForm();
  if (nextStatus === 'deleted' && !window.confirm('Delete this blog from the library and website?')) return;
  if (nextStatus === 'unpublish' && !window.confirm('Unpublish the live version and return it to Drafts? Unsaved edits will be discarded.')) return;
  if (nextStatus !== 'deleted' && nextStatus !== 'unpublish' && !validate(row, nextStatus === 'published')) return;
  row.status = nextStatus === 'unpublish' ? 'draft' : nextStatus;
  if (nextStatus === 'published') row.published_at = current.published_at || new Date().toISOString();
  const table = db.from('editorial_blogs');
  const query = current.id ? table.update(row).eq('id', current.id).eq('revision', current.revision) : table.insert(row);
  const saved = checked(await query.select().maybeSingle());
  if (!saved) throw new Error('This blog was changed elsewhere. Copy your edits, then reopen the latest version.');
  if (nextStatus === 'deleted') {
    dirty = false;
    await showList();
    message('Blog deleted. Public pages will refresh after the next site build.');
  } else {
    openEditor(saved);
    message(nextStatus === 'published' ? 'Published in the CMS. The live URL updates after the next site build.' : nextStatus === 'unpublish' ? 'Unpublished in the CMS. The live URL is removed after the next site build.' : 'Draft saved.');
  }
}

async function upload(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG or WebP image up to 8 MB.');
  }
  let image;
  try { image = await createImageBitmap(file); } catch { throw new Error('The selected file could not be decoded as an image.'); }
  const scale = Math.min(1, 1672 / image.width, 1672 / image.height);
  const canvas = element('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.85));
  if (!blob || blob.type !== 'image/webp') throw new Error('Could not prepare a WebP image.');
  const path = user.id + '/' + crypto.randomUUID() + '.webp';
  const bucket = db.storage.from('blog-images');
  checked(await bucket.upload(path, blob, { contentType: 'image/webp', upsert: false }));
  return bucket.getPublicUrl(path).data.publicUrl;
}

function restoreSelection() {
  body.focus();
  if (!selection || !body.contains(selection.commonAncestorContainer)) return;
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(selection);
}

function format(command, value = null) {
  restoreSelection();
  document.execCommand(command, false, value);
  if (!['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) field('claims_reviewed').checked = false;
  dirty = true;
  syncEditor();
}

function linkAction() {
  const anchor = selection?.startContainer.parentElement?.closest('a');
  const url = window.prompt('HTTPS link URL', anchor?.getAttribute('href') || 'https://');
  if (url === null) return;
  const safe = httpsUrl(url);
  if (!safe) return message('Enter a complete HTTPS link.');
  if (anchor && body.contains(anchor)) {
    anchor.href = safe;
    field('claims_reviewed').checked = false;
    dirty = true;
  } else if (!selection || selection.collapsed) {
    const link = element('a', safe);
    link.href = safe;
    format('insertHTML', link.outerHTML);
  } else format('createLink', safe);
}

function insertTable() {
  const table = element('table');
  const header = table.createTHead().insertRow();
  for (let i = 0; i < 2; i++) header.append(element('th', 'Column ' + (i + 1)));
  const row = table.createTBody().insertRow();
  for (let i = 0; i < 2; i++) row.insertCell().textContent = 'Cell';
  format('insertHTML', table.outerHTML + '<p><br></p>');
}

function preview() {
  const row = readForm();
  const article = byId('blogPreviewContent');
  article.replaceChildren(element('h2', row.title || 'Untitled blog'), element('p', row.author), element('p', row.summary));
  if (httpsUrl(row.cover_url)) {
    const figure = element('figure');
    const image = element('img');
    image.src = row.cover_url;
    image.alt = row.cover_alt;
    figure.append(image);
    if (row.cover_caption) figure.append(element('figcaption', row.cover_caption));
    article.append(figure);
  }
  article.append(sanitize(row.body_html));
  article.lang = row.language;
  byId('blogPreviewDialog').showModal();
}

async function importDraft(report) {
  const article = report.article;
  if (!article || typeof article.title !== 'string' || typeof article.body !== 'string' || !article.title.trim() || !article.body.trim()) {
    throw new Error('This file is missing the Blog Studio title or Markdown body.');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([article.title.trim(), article.body.trim()])));
  const studioId = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (article.body.length > 180000) throw new Error('The Studio article is too large to import.');
  const sources = Array.isArray(report.sources) ? report.sources.map(source => httpsUrl(source?.url)).filter(Boolean) : [];
  const row = {
    title: article.title.trim().slice(0, 220), slug: slugify(String(article.slug || article.title)).slice(0, 100).replace(/-$/, '') || null,
    summary: String(article.summary || '').slice(0, 600), language: 'en',
    body_html: cleanHtml(marked.parse(article.body)), sources: [...new Set(sources)],
    seo_title: article.title.slice(0, 120), seo_description: String(article.meta_description || '').slice(0, 320),
    cover_alt: String(article.image_alt || '').slice(0, 250), studio_id: studioId, status: 'draft',
    focus_keyword: String(report.brief?.primary_keyword || '').slice(0, 100),
    secondary_keywords: (Array.isArray(report.brief?.secondary_keywords) ? report.brief.secondary_keywords.join(', ') : '').slice(0, 300),
    audience: 'United States',
    category: categories.includes(report.category) ? report.category : 'General'
  };
  openEditor(checked(await db.from('editorial_blogs').insert(row).select().single()));
  message('Studio draft imported. Check the sources and complete the editorial fields before publishing.');
}

async function showList(nextStatus = status) {
  if (dirty && !window.confirm('Discard unsaved blog changes?')) return;
  if (status !== nextStatus) page = 0;
  status = nextStatus;
  selectView([...navigation.querySelectorAll('[data-status]')].find(button => button.dataset.status === status));
  dirty = false;
  form.hidden = true;
  library.hidden = false;
  await loadList();
}

async function run(action) {
  if (busy) return;
  busy = true;
  form.inert = true;
  library.inert = true;
  navigation.inert = true;
  newBlog.disabled = true;
  message('');
  try { await action(); } catch (error) { message(error.message); } finally {
    busy = false;
    form.inert = false;
    library.inert = false;
    navigation.inert = false;
    newBlog.disabled = false;
  }
}

async function init() {
  db = PrimezAPI.db();
  user = checked(await db.auth.getUser()).user;
  if (!user) throw new Error('Sign in through My dashboard to manage blogs.');
  const member = checked(await db.from('newsroom_editors').select('user_id').eq('user_id', user.id).maybeSingle());
  if (!member && !checked(await db.rpc('is_super_admin'))) throw new Error('This account does not have blog management access.');
  for (const category of categories) {
    byId('blogCategory').add(new Option(category, category));
    field('category').add(new Option(category, category));
  }
  const toolbar = {
    Undo: () => format('undo'), Redo: () => format('redo'),
    'Heading 2': () => format('formatBlock', 'h2'), 'Heading 3': () => format('formatBlock', 'h3'),
    Bold: () => format('bold'), Italic: () => format('italic'), Underline: () => format('underline'),
    Bullets: () => format('insertUnorderedList'), Numbering: () => format('insertOrderedList'),
    Left: () => format('justifyLeft'), Center: () => format('justifyCenter'), Right: () => format('justifyRight'),
    Link: linkAction, Image: () => byId('blogInlineFile').click(), Quote: () => format('formatBlock', 'blockquote'),
    Table: insertTable, 'Clear formatting': () => format('removeFormat')
  };
  for (const [name, action] of Object.entries(toolbar)) {
    const button = element('button', name);
    button.type = 'button';
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', action);
    byId('blogToolbar').append(button);
  }
  document.addEventListener('selectionchange', () => {
    const active = window.getSelection();
    if (active.rangeCount && body.contains(active.getRangeAt(0).commonAncestorContainer)) selection = active.getRangeAt(0).cloneRange();
  });
  body.addEventListener('paste', event => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    if (html) format('insertHTML', cleanHtml(html));
    else format('insertText', event.clipboardData.getData('text/plain'));
  });
  body.addEventListener('drop', event => event.preventDefault());
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    if (event.target === body || event.target === field('sources')) field('claims_reviewed').checked = false;
    dirty = true;
    syncEditor();
  });
  field('title').addEventListener('change', () => {
    if (!field('slug').value) { field('slug').value = slugify(field('title').value).slice(0, 100).replace(/-$/, ''); syncEditor(); }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  byId('blogCoverFile').addEventListener('change', event => run(async () => {
    try { field('cover_url').value = await upload(event.target.files[0]); dirty = true; syncEditor(); }
    finally { event.target.value = ''; }
  }));
  byId('blogInlineFile').addEventListener('change', event => run(async () => {
    try {
      const alt = window.prompt('Describe the image for readers who cannot see it');
      if (!alt?.trim()) return;
      const caption = window.prompt('Image caption (optional)') || '';
      const figure = element('figure');
      const image = element('img');
      image.src = await upload(event.target.files[0]);
      image.alt = alt.trim();
      figure.append(image);
      if (caption.trim()) figure.append(element('figcaption', caption.trim()));
      form.inert = false;
      let block = selection?.endContainer;
      while (block && block !== body && block.parentNode !== body) block = block.parentNode;
      const nextLine = element('p');
      nextLine.append(element('br'));
      if (block && block !== body && block.parentNode === body) block.after(figure, nextLine);
      else body.append(figure, nextLine);
      selection = document.createRange();
      selection.setStart(nextLine, 0);
      selection.collapse(true);
      restoreSelection();
      field('claims_reviewed').checked = false;
      dirty = true;
      syncEditor();
    } finally { event.target.value = ''; }
  }));
  byId('blogImportButton').addEventListener('click', () => byId('blogImport').click());
  byId('blogImport').addEventListener('change', event => run(async () => {
    try {
      if (dirty && !window.confirm('Discard unsaved blog changes?')) return;
      const file = event.target.files[0];
      if (!file || file.size > 1000000) throw new Error('Choose a Blog Studio JSON export below 1 MB.');
      await importDraft(JSON.parse(await file.text()));
    } finally { event.target.value = ''; }
  }));
  for (const [id, action] of Object.entries({
    newBlog: () => { if (!dirty || window.confirm('Discard unsaved blog changes?')) openEditor(); }, blogBack: showList, blogPreview: preview,
    blogClosePreview: () => byId('blogPreviewDialog').close(),
    blogSave: () => persist('draft'), blogPublish: () => persist('published'),
    blogDelete: () => persist('deleted'), blogUnpublish: () => persist('unpublish'),
    blogPrev: () => { page--; return loadList(); }, blogNext: () => { page++; return loadList(); }
  })) byId(id).addEventListener('click', () => run(action));
  for (const button of navigation.querySelectorAll('[data-status]')) {
    button.addEventListener('click', () => run(() => showList(button.dataset.status)));
  }
  for (const id of ['blogSearch', 'blogCategory', 'blogLanguage']) {
    byId(id).addEventListener(id === 'blogSearch' ? 'input' : 'change', () => {
      page = 0;
      loadList().catch(error => message(error.message));
    });
  }
  navigation.hidden = false;
  newBlog.hidden = false;
  await showList();
  startStudioHandoff();
}

function startStudioHandoff() {
  const token = new URLSearchParams(location.hash.slice(1)).get('studio');
  const opener = window.opener;
  const studioOrigin = 'http://127.0.0.1:8765';
  if (!opener || !token || !/^[a-f0-9-]{36}$/.test(token)) return;
  const receive = event => {
    if (event.origin !== studioOrigin || event.source !== opener || event.data?.type !== 'primez-studio-draft' || event.data.token !== token) return;
    window.removeEventListener('message', receive);
    history.replaceState(null, '', location.pathname + location.search);
    if (dirty || busy || !window.confirm('Import the Blog Studio submission into private Drafts?')) return;
    run(async () => {
      if (event.data.report?.status !== 'editor_review_required') throw new Error('The Studio submission did not pass its local quality check.');
      await importDraft(event.data.report);
      opener.postMessage({ type: 'primez-studio-saved', token }, studioOrigin);
    });
  };
  window.addEventListener('message', receive);
  window.setTimeout(() => window.removeEventListener('message', receive), 120000);
  opener.postMessage({ type: 'primez-studio-ready', token }, studioOrigin);
}

function setSidebarOpen(open) {
  document.body.classList.toggle('ad-menu-open', open);
  byId('blogMenu').setAttribute('aria-expanded', String(open));
  byId(open ? 'blogCloseMenu' : 'blogMenu').focus();
}

byId('blogMenu').addEventListener('click', () => setSidebarOpen(true));
byId('blogCloseMenu').addEventListener('click', () => setSidebarOpen(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('ad-menu-open')) setSidebarOpen(false);
});
byId('blogLogout').addEventListener('click', () => run(async () => {
  if (dirty && !window.confirm('Sign out and discard unsaved changes?')) return;
  await PrimezAPI.logout();
  dirty = false;
  location.href = '/admin.html';
}));
run(init);
