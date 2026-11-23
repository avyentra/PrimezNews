(async function () {
 'use strict';
 const api = window.PrimezAPI, el = id => document.getElementById(id);
 const cats = ['Agriculture','Education','Politics','Sports','Faith','Crime','Punjab','Business','Health','Jobs','NRI','Entertainment','National','World','Weather','Technology'];
 const districts = ['District unconfirmed','Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Malerkotla','Mansa','Moga','Sri Muktsar Sahib','Pathankot','Patiala','Rupnagar','SAS Nagar (Mohali)','Sangrur','SBS Nagar','Tarn Taran','Chandigarh'];
 const slots = ['home-hero-side','left-skin','right-skin','top-leaderboard','after-headlines','news-sidebar','before-video','after-video'];
 let statusFilter = '', rows = [], ads = [], selected = null, image = 'fields', dirty = false, saving = false;
 const feedback = text => { el('storyFeedback').textContent = text; };
 const option = (label, value = label) => { const o = document.createElement('option'); o.textContent = label; o.value = value; return o; };
 const chosen = () => [...document.querySelectorAll('#categories input:checked')].map(input => input.value);
 function primaryOptions() {
  const previous = el('primaryCategory').value;
  /* show ALL categories; picking one also ticks it in Categories */
  el('primaryCategory').replaceChildren(...cats.map(c => option(c)));
  el('primaryCategory').value = cats.includes(previous) && chosen().includes(previous) ? previous : (chosen()[0] || previous || 'Punjab');
 }
 function updateImage() { el('storyPreview').src = api.image(image); el('storyPreview').hidden = !image; }
 function istInput(iso) { return iso ? new Date(Date.parse(iso) + 19800000).toISOString().slice(0,16) : ''; }
 function renderList() {
  el('storyList').replaceChildren();
  const query = el('storySearch').value.toLowerCase();
  rows.filter(s => (!statusFilter || s.status === statusFilter) && (s.en + ' ' + s.title).toLowerCase().includes(query)).sort((a, b) => (b.priority === 'high') - (a.priority === 'high')).forEach(story => {
   const b = document.createElement('button'); b.type = 'button'; b.className = 'story-row' + (selected?.id === story.id ? ' active' : '');
   const strong = document.createElement('strong'); strong.textContent = story.en;
   const small = document.createElement('small'); small.textContent = story.status + ' · ' + story.district + (story.is_automated ? ' · Auto' : '');
   if (story.priority === 'high' || story.priority === 'low') {
    const tag = document.createElement('span'); tag.textContent = story.priority === 'high' ? 'HIGH priority' : 'LOW priority';
    tag.style.cssText = 'display:inline-block;margin:0 0 4px;padding:1px 8px;border-radius:999px;font:700 11px/1.6 system-ui,sans-serif;' + (story.priority === 'high' ? 'background:#fde8ea;color:#b4232c' : 'background:#e8f0ff;color:#2a56a8');
    tag.title = 'Priority set by the news desk (High = urgent or affects many people)';
    b.append(tag);
   }
   b.append(strong,small); b.onclick = () => { if (!saving && (!dirty || confirm('Discard unsaved changes?'))) select(story); }; el('storyList').append(b);
  });
  const h2 = document.querySelector('.rail-heading h2'); if (h2) h2.textContent = statusFilter === 'draft' ? 'Draft news' : 'Recent news';
  if (!el('storyList').children.length) el('storyList').textContent = statusFilter === 'draft' ? 'No drafts right now.' : 'No stories yet. Create your first story.';
  document.dispatchEvent(new CustomEvent('primez-admin-stories', { detail: rows.map(s => s.status) }));
 }
 const evidenceMarker = '\n\n[RSS location evidence] ';
 function rssBody(status) {
  const body = el('body').value.trim();
  const evidence = el('locationEvidence').textContent;
  if (!body) return '';
  if (status === 'draft' && evidence) return body + evidenceMarker + evidence;
  const source = selected?.source_url;
  if (status !== 'draft' && /^https?:\/\/[^\s]+$/i.test(source || '') && !body.includes(source)) {
   return body + '\n\nਸਰੋਤ: ' + (selected.source_name || 'Original report') + '\n' + source;
  }
  return body;
 }
 function select(story) {
  selected = story || null; const s = story || {};
  ['title','en','summary','body','author'].forEach(key => { el(key).value = s[key] || ''; });
  const rss = String(s.id || '').startsWith('rss-');
  const parts = rss && s.status === 'draft' ? (s.body || '').split(evidenceMarker) : [s.body || ''];
  el('rssReview').hidden = !rss;
  el('body').value = parts[0];
  el('locationEvidence').textContent = parts[1] || '';
  el('rssSource').textContent = [s.source_name, s.source_url].filter(Boolean).join(' · ');
  el('verificationNote').value = '';
  if (!story) el('author').value = (el('userName').textContent || '').trim() || 'News desk';   // byline = who is signed in
  if (s.district && !Array.from(el('district').options).some(opt => opt.value === s.district)) {
   el('district').append(option(s.district));
  }
  el('district').value = s.district || 'District unconfirmed'; image = s.image || ''; el('storyFile').value = ''; updateImage();
  document.querySelectorAll('#categories input').forEach(input => { input.checked = (s.categories || [s.category || 'Punjab']).includes(input.value); });
  primaryOptions(); if (s.category) el('primaryCategory').value = s.category;
  document.querySelector('input[name=mode][value=' + (s.status === 'scheduled' ? 'scheduled' : 'published') + ']').checked = true;
  el('publishAt').value = istInput(s.publish_at); mode();
  el('editorHeading').textContent = story ? 'Edit story' : 'New story'; el('editorStatus').textContent = s.status || 'Unsaved draft';
  window.PrimezPublication.render(story); el('deleteStory').hidden = !story; dirty = false; feedback(''); renderList(); window.PrimezWorkspace.show('details'); window.PrimezWorkspace.closeRail();
  restoreLocal(story);
 }
 function mode() { const scheduled = document.querySelector('input[name=mode]:checked').value === 'scheduled'; el('scheduleField').hidden = !scheduled; el('publish').textContent = scheduled ? 'Save schedule' : 'Publish now'; }
 /* ---------- Auto-save (no Save draft button) ----------
    Every change is kept on this device at once. New stories and drafts are also saved
    to the database a few seconds after typing stops. Live / scheduled stories are never
    switched to draft by auto-save: their changes go live only with "Publish now". */
 let autoTimer = null, autoBusy = false, edits = 0;
 const localKey = id => 'primez.autosave.' + (id || 'new');
 function snapshot() { return { title: el('title').value, en: el('en').value, summary: el('summary').value, body: el('body').value, author: el('author').value, district: el('district').value, categories: chosen(), category: el('primaryCategory').value, time: Date.now() }; }
 function keepLocal() { try { localStorage.setItem(localKey(selected?.id), JSON.stringify(snapshot())); } catch {} }
 function dropLocal(id) { try { localStorage.removeItem(localKey(id)); } catch {} }
 function restoreLocal(story) {
  let data = null; try { data = JSON.parse(localStorage.getItem(localKey(story?.id)) || 'null'); } catch {}
  if (!data || typeof data !== 'object') return;
  if (story && !(data.time > Date.parse(story.updated_at || story.publish_at || 0))) { dropLocal(story.id); return; }
  if (!story && !['title','en','summary','body'].some(k => (data[k] || '').trim())) return;
  ['title','en','summary','body','author'].forEach(k => { if (typeof data[k] === 'string') el(k).value = data[k]; });
  if (data.district) el('district').value = data.district;
  if (Array.isArray(data.categories)) document.querySelectorAll('#categories input').forEach(input => { input.checked = data.categories.includes(input.value); });
  primaryOptions(); if (data.category) el('primaryCategory').value = data.category;
  dirty = true; feedback('Restored your unsaved changes from this device.'); schedule();
 }
 function schedule() { clearTimeout(autoTimer); autoTimer = setTimeout(autoSave, 4000); }
 function changed() { if (saving) return; dirty = true; edits++; keepLocal(); schedule(); }
 async function autoSave() {
  autoTimer = null;
  if (saving || autoBusy || !dirty) return;
  if (selected && selected.status !== 'draft') { feedback('Changes kept on this device · press Publish now to update the live story.'); return; }
  const primary = el('primaryCategory').value; const categories = [primary,...chosen().filter(c => c !== primary)].filter(Boolean);
  const story = { id: selected?.id || crypto.randomUUID(), title:el('title').value.trim(),en:el('en').value.trim(),summary:el('summary').value.trim(),body:rssBody('draft'),author:el('author').value.trim() || 'News desk', district:el('district').value,categories,category:primary,image:image || 'fields',status:'draft',publish_at:null };
  try { api.validateStory(story); } catch { feedback('Auto-saving on this device · add both headlines, a summary and a category to save online.'); return; }
  autoBusy = true; const mark = edits; const wasNew = !selected;
  try {
   if (el('storyFile').files[0]) { story.image = await api.upload(el('storyFile').files[0]); image = story.image; el('storyFile').value = ''; }
   const saved = await api.save(story);
   selected = saved; rows = [saved,...rows.filter(row => row.id !== saved.id)]; renderList();
   if (wasNew) { dropLocal(null); el('deleteStory').hidden = false; }
   el('editorStatus').textContent = 'Draft · auto-saved';
   if (edits === mark) { dirty = false; dropLocal(saved.id); } else keepLocal();
   feedback('Auto-saved ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST');
  } catch (error) { feedback('Auto-save failed, your changes are kept on this device. ' + (error.message || '')); }
  finally { autoBusy = false; if (dirty && edits !== mark) schedule(); }
 }
 /* Always re-reads public.stories (drafts included), so freshly ingested RSS drafts show up at once. */
 async function refresh() { rows = await api.stories(); renderList(); return rows; }
 async function save(status) {
  if (saving || !window.PrimezWorkspace.validate()) return;
  saving = true; clearTimeout(autoTimer);
  while (autoBusy) await new Promise(r => setTimeout(r, 120));   // never race an auto-save
  const controls = [...document.querySelectorAll('#cloudStoryForm input, #cloudStoryForm textarea, #cloudStoryForm select, #cloudStoryForm button, #saveDraft, #publish, #newStory, #deleteStory, #logout, #importDrafts')];
  const previousDisabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  feedback('Saving…');
  try {
   const primary = el('primaryCategory').value; const categories = [primary,...chosen().filter(c => c !== primary)].filter(Boolean);
   const publish_at = status === 'scheduled' ? api.istToISO(el('publishAt').value) : status === 'published' ? new Date().toISOString() : null;
   const story = { id: selected?.id || crypto.randomUUID(), title:el('title').value.trim(),en:el('en').value.trim(),summary:el('summary').value.trim(),body:rssBody(status),author:el('author').value.trim() || 'News desk', district:el('district').value,categories,category:primary,image:image || 'fields',status,publish_at };
   if (status !== 'draft' && selected?.status === 'draft' && selected.id.startsWith('rss-') && story.district !== 'District unconfirmed'
       && !confirm('Does the source explicitly place the event or its impact in ' + story.district + '? If uncertain, cancel and choose District unconfirmed.')) {
    feedback('Check the district against the source before publishing.'); return;
   }
   api.validateStory(story);
   if (el('storyFile').files[0]) story.image = await api.upload(el('storyFile').files[0]);
   const saved = await api.save(story); dirty = false; dropLocal(story.id); dropLocal(null); rows = [saved,...rows.filter(row=>row.id!==saved.id)]; select(saved); window.PrimezPublication.render(saved, true);
   feedback(status === 'scheduled' ? 'Schedule saved in the database. Available publicly from ' + new Date(saved.publish_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) + ' IST.' : status === 'published' ? 'Published. Your story is available to visitors.' : 'Draft saved securely to the database.');
  } catch (error) { if (status !== 'draft' && !el('body').value.trim()) window.PrimezWorkspace.show('article'); else if (status === 'scheduled' && !el('publishAt').value) window.PrimezWorkspace.show('publishing'); feedback(error.message || 'Save failed. Your changes remain in the form.'); }
  finally { saving = false; controls.forEach((control,index) => { control.disabled = previousDisabled[index]; }); }
 }
 try {
  if (!api.configured) throw new Error('Backend setup pending. Configure Supabase before using the newsroom.');
  const user = await api.requireEditor();
  api.db().rpc('journalist_reviewer').then(({data}) => { el('reviewJournalists').hidden = data !== true; });
  el('signedInAs').textContent = 'Signed in as ' + user.email;
  /* header: show who is signed in */
  { const meta = user.user_metadata || {}; const base = (user.email || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
    const name = (meta.full_name || meta.name || base.replace(/\b\w/g, c => c.toUpperCase()) || 'Editor').slice(0, 40);
    el('userName').textContent = name; el('userEmail').textContent = user.email || ''; el('userChip').title = user.email || '';
    el('userInitials').textContent = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); el('userChip').hidden = false; }
  el('accessMessage').hidden = true; el('workspace').hidden = false;
  cats.forEach(c => { const label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = c; checkbox.onchange = primaryOptions; label.append(checkbox,document.createTextNode(' '+c)); el('categories').append(label); });
  districts.forEach(d => el('district').append(option(d))); slots.forEach(s => el('adSlot').append(option(s)));
  await refresh(); ads = await api.ads(); select(rows[0]);
 } catch (error) {
  el('accessMessage').textContent = error.message;
  const a = document.createElement('a'); a.href = 'login'; a.textContent = ' Sign in →'; el('accessMessage').append(a); return;
 }
 el('recordVerification').onclick = () => {
  const fact = el('verificationNote').value.trim();
  if (!fact || !el('body').value.trim()) { feedback('Add the article and the specific fact you checked first.'); return; }
  if (!confirm('Record this fact as personally checked? Your editor name, time and note will appear in the article.')) return;
  el('body').value += '\n\nPrimezNews ਪੁਸ਼ਟੀ · ' + el('userName').textContent + ' · ' + new Date().toISOString() + '\n' + fact;
  el('verificationNote').value = ''; changed();
 };
 el('logout').onclick = async () => { if (dirty && !confirm('Discard unsaved changes and sign out?')) return; try { await api.logout(); location.replace('login'); } catch(error) { feedback(error.message); } };
 api.db().auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.replace('login'); });
 el('cloudStoryForm').addEventListener('input', () => { dirty = true; });
 el('cloudStoryForm').onsubmit = event => { event.preventDefault(); save('draft'); };
 el('cloudStoryForm').addEventListener('input', changed);
 el('cloudStoryForm').addEventListener('change', changed);
 el('removeImage').addEventListener('click', changed);
 document.querySelectorAll('input[name=mode]').forEach(r => { r.onchange = mode; });
 el('publish').onclick = () => save(document.querySelector('input[name=mode]:checked').value);
 el('newStory').onclick = () => { if (!saving && (!dirty || confirm('Discard unsaved changes?'))) select(null); };
 el('storySearch').oninput = renderList;
 el('storyFile').onchange = () => { const file = el('storyFile').files[0]; if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 25000000) { feedback('Use a JPG, PNG or WebP photo (up to 25 MB — it is made light automatically).'); el('storyFile').value = ''; return; } const old = el('storyPreview').src; if (old.startsWith('blob:')) URL.revokeObjectURL(old); el('storyPreview').src = URL.createObjectURL(file); el('storyPreview').hidden = false; dirty = true; };
 el('removeImage').onclick = () => { image = ''; el('storyFile').value = ''; updateImage(); dirty = true; };
 el('deleteStory').onclick = async () => { if (!selected || saving || !confirm('Delete this story permanently?')) return; try { await api.remove(selected.id); await refresh(); select(rows[0]); feedback('Story deleted.'); } catch(error) { feedback(error.message); } };
 el('preview').onclick = () => {
  const box = el('previewBody'); box.replaceChildren();
  const h = document.createElement('h1'); h.textContent = el('en').value; const summary = document.createElement('p'); summary.textContent = el('summary').value; box.append(h,summary);
  if (!el('storyPreview').hidden) { const img = document.createElement('img'); img.src = el('storyPreview').src; img.className = 'article-image'; img.alt = ''; box.append(img); }
  el('body').value.split(/\n\s*\n/).forEach(text => { const p = document.createElement('p'); p.textContent = text; box.append(p); });
  el('previewDialog').showModal();
 };
 el('closePreview').onclick = () => el('previewDialog').close();
 el('exportDrafts').onclick = () => { const blob = new Blob([JSON.stringify({stories:rows,ads},null,2)],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'primez-newsroom-backup.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
 el('importDrafts').onclick = async () => {
  if (!confirm('Import this browser’s old drafts as PRIVATE database drafts? Nothing will be published.')) return;
  el('importDrafts').disabled = true;
  try {
   const source = JSON.parse(localStorage.getItem('primzStoryEdits') || '{}'); let count = 0;
   for (const [oldId,s] of Object.entries(source)) {
    const categories = (s.categories || [s.category || 'Punjab']).filter(c=>cats.includes(c));
    const draft = { id:'import-'+oldId, title:s.title || s.en || '', en:s.en || s.title || '', summary:s.summary || '', body:s.body || '', categories,category:categories[0],district:s.district || 'Chandigarh',author:s.author || 'News desk',image:'fields',status:'draft',publish_at:null };
    api.validateStory(draft);
    // Never overwrite an earlier import; leave original browser data untouched.
    if (rows.some(row=>row.id===draft.id)) continue;
    if (s.image?.startsWith('data:image/')) { const blob = await (await fetch(s.image)).blob(); draft.image = await api.upload(new File([blob],'import',{type:blob.type})); }
    await api.save(draft); count++;
   }
   await refresh(); feedback(count+' drafts imported. Original browser backup preserved.');
  } catch(error) { await refresh().catch(()=>{}); feedback('Import stopped: '+error.message+'. Earlier successful imports were retained.'); }
  finally { el('importDrafts').disabled = false; }
 };
 function adForm() { const ad = ads.find(a=>a.slot===el('adSlot').value); el('adUrl').value = ad?.href || ''; el('adEnabled').checked = ad?.enabled ?? true; el('adPreview').hidden = !ad; if(ad) el('adPreview').src=ad.image; el('adFile').value=''; el('adFeedback').textContent=''; const rm = el('removeAd'); if (rm) { rm.hidden = !ad; rm.textContent = 'Remove ad'; delete rm.dataset.armed; } }
 el('adSlot').onchange = adForm; adForm();
 window.PrimezAdsRefresh = async () => { ads = await api.ads(); adForm(); };
 /* My dashboard (newsroom-home.js) reads the loaded stories and opens one in the editor */
 window.PrimezNewsroom = { rows: () => rows.slice(), refresh, remove: async id => { if (saving) return false; await api.remove(id); if (selected?.id === id) { dirty = false; dropLocal(id); await refresh(); select(rows[0]); } else await refresh(); return true; }, setFilter: f => { statusFilter = f || ''; renderList(); }, open: id => { const s = rows.find(r => r.id === id); if (!s || saving) return false; if (dirty && selected?.id !== id && !confirm('Discard unsaved changes?')) return false; el('storiesTab').click(); select(s); return true; } };
 if (el('removeAd')) el('removeAd').onclick = async () => { const rm = el('removeAd'); if (!rm.dataset.armed) { rm.dataset.armed = '1'; rm.textContent = 'Tap again to remove'; setTimeout(() => { if (rm.dataset.armed) { delete rm.dataset.armed; rm.textContent = 'Remove ad'; } }, 4000); return; } rm.disabled = true; try { await api.removeAd(el('adSlot').value); ads = await api.ads(); adForm(); el('adFeedback').textContent = 'Advertisement removed — saved.'; } catch (error) { el('adFeedback').textContent = error.message; } finally { rm.disabled = false; } };
 el('cloudAdForm').onsubmit = async event => {
  event.preventDefault(); el('saveAd').disabled = true;
  try { let image = ads.find(a=>a.slot===el('adSlot').value)?.image; if(el('adFile').files[0]) image = await api.upload(el('adFile').files[0], { maxSide: 2200, maxBytes: 450 * 1024, allowGif: true }); if(!image) throw new Error('Choose a creative image first.'); await api.saveAd({slot:el('adSlot').value,image,href:el('adUrl').value.trim(),enabled:el('adEnabled').checked}); ads=await api.ads(); adForm(); el('adFeedback').textContent='Advertisement saved to database.'; }
  catch(error) { el('adFeedback').textContent=error.message; }
  finally { el('saveAd').disabled=false; }
 };
 ['stories','ads'].forEach(name=>{el(name+'Tab').onclick=()=>{['stories','ads'].forEach(n=>{el(n+'Panel').hidden=n!==name;el(n+'Tab').classList.toggle('primary',n===name);});};});
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
})();
