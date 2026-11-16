(async function () {
 'use strict';
 const api = window.PrimezAPI, el = id => document.getElementById(id);
 const cats = ['Agriculture','Education','Politics','Sports','Faith','Crime','Punjab'];
 const districts = ['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Malerkotla','Mansa','Moga','Sri Muktsar Sahib','Pathankot','Patiala','Rupnagar','SAS Nagar (Mohali)','Sangrur','SBS Nagar','Tarn Taran','Chandigarh'];
 const slots = ['left-skin','right-skin','top-leaderboard','after-headlines','news-sidebar','before-video','after-video'];
 let rows = [], ads = [], selected = null, image = 'fields', dirty = false, saving = false;
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
  rows.filter(s => (s.en + ' ' + s.title).toLowerCase().includes(query)).forEach(story => {
   const b = document.createElement('button'); b.type = 'button'; b.className = 'story-row' + (selected?.id === story.id ? ' active' : '');
   const strong = document.createElement('strong'); strong.textContent = story.en;
   const small = document.createElement('small'); small.textContent = story.status + ' · ' + story.district;
   b.append(strong,small); b.onclick = () => { if (!saving && (!dirty || confirm('Discard unsaved changes?'))) select(story); }; el('storyList').append(b);
  });
  if (!rows.length) el('storyList').textContent = 'No stories yet. Create your first story.';
  document.dispatchEvent(new CustomEvent('primez-admin-stories', { detail: rows.map(s => s.status) }));
 }
 function select(story) {
  selected = story || null; const s = story || {};
  ['title','en','summary','body','author'].forEach(key => { el(key).value = s[key] || ''; });
  el('district').value = s.district || 'Chandigarh'; image = s.image || ''; el('storyFile').value = ''; updateImage();
  document.querySelectorAll('#categories input').forEach(input => { input.checked = (s.categories || [s.category || 'Punjab']).includes(input.value); });
  primaryOptions(); if (s.category) el('primaryCategory').value = s.category;
  document.querySelector('input[name=mode][value=' + (s.status === 'scheduled' ? 'scheduled' : 'published') + ']').checked = true;
  el('publishAt').value = istInput(s.publish_at); mode();
  el('editorHeading').textContent = story ? 'Edit story' : 'New story'; el('editorStatus').textContent = s.status || 'Unsaved draft';
  window.PrimezPublication.render(story); el('deleteStory').hidden = !story; dirty = false; feedback(''); renderList(); window.PrimezWorkspace.show('details'); window.PrimezWorkspace.closeRail();
 }
 function mode() { const scheduled = document.querySelector('input[name=mode]:checked').value === 'scheduled'; el('scheduleField').hidden = !scheduled; el('publish').textContent = scheduled ? 'Save schedule' : 'Publish now'; }
 async function refresh() { rows = await api.stories(); renderList(); }
 async function save(status) {
  if (saving || !window.PrimezWorkspace.validate()) return;
  saving = true;
  const controls = [...document.querySelectorAll('#cloudStoryForm input, #cloudStoryForm textarea, #cloudStoryForm select, #cloudStoryForm button, #saveDraft, #publish, #newStory, #deleteStory, #logout, #importDrafts')];
  const previousDisabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  feedback('Saving…');
  try {
   const primary = el('primaryCategory').value; const categories = [primary,...chosen().filter(c => c !== primary)].filter(Boolean);
   const publish_at = status === 'scheduled' ? api.istToISO(el('publishAt').value) : status === 'published' ? new Date().toISOString() : null;
   const story = { id: selected?.id || crypto.randomUUID(), title:el('title').value.trim(),en:el('en').value.trim(),summary:el('summary').value.trim(),body:el('body').value.trim(),author:el('author').value.trim() || 'News desk', district:el('district').value,categories,category:primary,image:image || 'fields',status,publish_at };
   api.validateStory(story);
   if (el('storyFile').files[0]) story.image = await api.upload(el('storyFile').files[0]);
   const saved = await api.save(story); dirty = false; rows = [saved,...rows.filter(row=>row.id!==saved.id)]; select(saved); window.PrimezPublication.render(saved, true);
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
  const a = document.createElement('a'); a.href = 'login.html'; a.textContent = ' Sign in →'; el('accessMessage').append(a); return;
 }
 el('logout').onclick = async () => { if (dirty && !confirm('Discard unsaved changes and sign out?')) return; try { await api.logout(); location.replace('login.html'); } catch(error) { feedback(error.message); } };
 api.db().auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.replace('login.html'); });
 el('cloudStoryForm').addEventListener('input', () => { dirty = true; });
 el('cloudStoryForm').onsubmit = event => { event.preventDefault(); save('draft'); };
 document.querySelectorAll('input[name=mode]').forEach(r => { r.onchange = mode; });
 el('publish').onclick = () => save(document.querySelector('input[name=mode]:checked').value);
 el('newStory').onclick = () => { if (!saving && (!dirty || confirm('Discard unsaved changes?'))) select(null); };
 el('storySearch').oninput = renderList;
 el('storyFile').onchange = () => { const file = el('storyFile').files[0]; if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 1000000) { feedback('Use a JPG, PNG or WebP under 1 MB.'); el('storyFile').value = ''; return; } const old = el('storyPreview').src; if (old.startsWith('blob:')) URL.revokeObjectURL(old); el('storyPreview').src = URL.createObjectURL(file); el('storyPreview').hidden = false; dirty = true; };
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
 function adForm() { const ad = ads.find(a=>a.slot===el('adSlot').value); el('adUrl').value = ad?.href || ''; el('adEnabled').checked = ad?.enabled ?? true; el('adPreview').hidden = !ad; if(ad) el('adPreview').src=ad.image; el('adFile').value=''; el('adFeedback').textContent=''; }
 el('adSlot').onchange = adForm; adForm();
 el('cloudAdForm').onsubmit = async event => {
  event.preventDefault(); el('saveAd').disabled = true;
  try { let image = ads.find(a=>a.slot===el('adSlot').value)?.image; if(el('adFile').files[0]) image = await api.upload(el('adFile').files[0]); if(!image) throw new Error('Choose a creative image first.'); await api.saveAd({slot:el('adSlot').value,image,href:el('adUrl').value.trim(),enabled:el('adEnabled').checked}); ads=await api.ads(); adForm(); el('adFeedback').textContent='Advertisement saved to database.'; }
  catch(error) { el('adFeedback').textContent=error.message; }
  finally { el('saveAd').disabled=false; }
 };
 ['stories','ads'].forEach(name=>{el(name+'Tab').onclick=()=>{['stories','ads'].forEach(n=>{el(n+'Panel').hidden=n!==name;el(n+'Tab').classList.toggle('primary',n===name);});};});
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
})();
