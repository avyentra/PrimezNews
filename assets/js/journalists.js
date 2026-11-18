(async function () {
  'use strict';
  const el = id => document.getElementById(id);
  const tr = (pa,hi,en) => ({pa,hi,en}[document.documentElement.lang] || en);
  const states = {
    pending: ['ਅਰਜ਼ੀ ਸਮੀਖਿਆ ਅਧੀਨ ਹੈ।','आवेदन समीक्षा में है।','Application pending review.'],
    approved: ['ਪੱਤਰਕਾਰ ਖਾਤਾ ਸਰਗਰਮ ਹੈ।','पत्रकार खाता सक्रिय है।','Journalist access is active.'],
    declined: ['ਅਰਜ਼ੀ ਮਨਜ਼ੂਰ ਨਹੀਂ ਹੋਈ।','आवेदन अस्वीकृत हुआ।','Application declined.']
  };
  let db, currentStatus = null;
  function result(response) { if(response.error) throw response.error; return response.data; }
  function button(text, action) {
    const b=document.createElement('button'); b.type='button'; b.textContent=text;
    b.onclick=()=>run(b,action); return b;
  }
  async function run(control, action) {
    if(control.disabled) return;
    control.disabled=true; el('message').textContent='';
    try { await action(); } catch(error) { el('message').textContent=error.message || 'Request failed. Please try again.'; }
    finally { control.disabled=false; }
  }
  function renderStatus() {
    el('status').textContent=currentStatus ? tr(...states[currentStatus]) : '';
  }
  document.addEventListener('primez-language-change',renderStatus);
  /* ---------- Review desk (reviewers / newsroom editors) — dashboard look, same database calls ---------- */
  const STATUS={submitted:'Submitted',in_review:'In review',approved:'Approved',published:'Published',returned:'Returned'};
  let reportFilter='waiting', lastReports=[];
  function mk(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  function dbtn(text,cls,action){const b=mk('button','d-btn'+(cls?' '+cls:''),text);b.type='button';b.onclick=()=>run(b,action);return b;}
  /* two taps instead of a browser pop-up: first tap asks, second does it */
  function sure(text,cls,armedText,action){const b=mk('button','d-btn'+(cls?' '+cls:''),text);b.type='button';
    b.onclick=()=>{if(!b.dataset.armed){b.dataset.armed='1';b.textContent=armedText;setTimeout(()=>{if(b.isConnected&&b.dataset.armed){delete b.dataset.armed;b.textContent=text;}},4000);return;}delete b.dataset.armed;b.textContent=text;run(b,action);};return b;}
  const initials=t=>String(t||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const when=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?d.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}):'';};
  function toast(text){el('message').textContent=text;clearTimeout(toast.t);toast.t=setTimeout(()=>{el('message').textContent='';},3500);}
  function count(id,n){const e=el(id);if(e){e.textContent=n;e.hidden=!n;}}
  function renderReports(){
    const box=el('reports');box.replaceChildren();
    const groups={all:lastReports,waiting:lastReports.filter(r=>['submitted','in_review'].includes(r.status||'submitted')),approved:lastReports.filter(r=>r.status==='approved'),published:lastReports.filter(r=>r.status==='published'),returned:lastReports.filter(r=>r.status==='returned')};
    const chips=el('reportFilter');chips.replaceChildren();
    [['waiting','Waiting'],['approved','Approved'],['published','Published'],['returned','Returned'],['all','All']].forEach(([k,t])=>{const c=mk('button','',t+' '+groups[k].length);c.type='button';c.setAttribute('aria-pressed',String(reportFilter===k));c.onclick=()=>{reportFilter=k;renderReports();};chips.append(c);});
    const list=groups[reportFilter]||lastReports;
    if(!list.length){box.append(mk('p','desk-empty',reportFilter==='waiting'?'No reports waiting. All caught up.':'No reports here.'));return;}
    list.forEach(r=>{
      const st=r.status||'submitted',card=mk('article','d-rep'+(r.image?' has-img':''));
      if(r.image){const im=mk('img');im.src=r.image;im.alt='';im.loading='lazy';card.append(im);}
      const head=mk('div');head.append(mk('h3','',r.headline),mk('div','d-meta',[r.journalist_applications?.name,r.journalist_applications?.district||r.district,r.category,when(r.updated_at||r.submitted_at)].filter(Boolean).join(' · ')));
      card.append(head,mk('span','d-pill st-'+st,STATUS[st]||st));
      const body=mk('p','d-body',r.body);card.append(body);
      if(r.editor_note)card.append(mk('p','d-note','Note sent: '+r.editor_note));
      const bar=mk('div','d-bar');
      if(String(r.body||'').length>220){const more=mk('button','d-more','Read full report');more.type='button';more.onclick=()=>{const o=body.classList.toggle('open');more.textContent=o?'Show less':'Read full report';};bar.append(more);}else{bar.append(mk('span','d-more',''));}
      if('status' in r){
        const set=(ns,note)=>async()=>{result(await db.rpc('set_report_status',{report:r.id,new_status:ns,note:note||''}));toast('Report marked '+(STATUS[ns]||ns).toLowerCase()+'.');await showQueue();};
        if(st!=='in_review'&&st!=='published')bar.append(dbtn('In review','',set('in_review')));
        if(st!=='approved'&&st!=='published')bar.append(dbtn('Approve','green',set('approved')));
        if(st!=='published')bar.append(dbtn('Mark published','dark',set('published')));
        if(st!=='returned'){const ret=mk('button','d-btn red','Return with note');ret.type='button';ret.onclick=()=>{if(card.querySelector('.d-return'))return;const f=mk('div','d-return');const ta=mk('textarea');ta.maxLength=1000;ta.placeholder='What should the journalist fix?';const row=mk('div');const cancel=mk('button','d-btn','Cancel');cancel.type='button';cancel.onclick=()=>f.remove();row.append(cancel,dbtn('Send back','red',async()=>{await set('returned',ta.value.trim())();}));f.append(ta,row);card.append(f);ta.focus();};bar.append(ret);}
      }
      card.append(bar);box.append(card);
    });
  }
  async function showQueue(){
    const rows=result(await db.from('journalist_applications').select('user_id,name,email,district,status,submitted_at').eq('status','pending').order('submitted_at'));
    const queue=el('queue'); queue.replaceChildren();
    if(!rows.length) queue.append(mk('p','desk-empty','No applications awaiting review.'));
    for(const row of rows){
      const card=mk('article','d-app'),who=mk('div','d-who'),info=mk('div');
      info.append(mk('strong','',row.name),mk('small','',[row.district,row.email].filter(Boolean).join(' · ')),mk('small','',when(row.submitted_at)));
      who.append(mk('span','d-av',initials(row.name)),info);
      const proof=mk('div','d-proof');proof.append(mk('p','','Open the private document before deciding. It is deleted after your decision.'));
      const decide=decision=>async()=>{result(await db.rpc('review_journalist',{applicant:row.user_id,decision}));toast(decision==='approved'?row.name+' is now an active journalist.':'Application declined.');await showQueue();};
      const approve=sure('Approve','green','Tap again to approve',decide('approved')), decline=sure('Decline','red','Tap again to decline',decide('declined'));
      approve.disabled=decline.disabled=true;
      const view=dbtn('View proof','dark',async()=>{
        const doc=result(await db.rpc('read_journalist_proof',{applicant:row.user_id}));
        if(!['image/jpeg','image/png'].includes(doc.mime))throw Error('Unsupported document.');
        const image=mk('img');image.alt='Submitted reporting credential of '+row.name;image.src='data:'+doc.mime+';base64,'+doc.data.replace(/\s/g,'');await image.decode();
        proof.replaceChildren(image);approve.disabled=decline.disabled=false;view.hidden=true;
      });
      const acts=mk('div','d-acts');acts.append(view,approve,decline);
      card.append(who,proof,acts);queue.append(card);
    }
    const reports=result(await db.from('journalist_reports').select('*,journalist_applications(name,district)').order('submitted_at',{ascending:false}).limit(100));
    lastReports=reports;
    const waiting=reports.filter(r=>['submitted','in_review'].includes(r.status||'submitted')).length;
    el('statApps').textContent=rows.length;el('statWaiting').textContent=waiting;
    el('statApproved').textContent=reports.filter(r=>r.status==='approved').length;el('statPublished').textContent=reports.filter(r=>r.status==='published').length;
    count('navApps',rows.length);count('navReports',waiting);
    el('deskUpdated').textContent='Updated '+new Date().toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit'});
    renderReports();
  }
  async function deskProfile(user){
    const name=(user.user_metadata&&user.user_metadata.full_name)||String(user.email||'News desk').split('@')[0];
    el('deskName').textContent=name;el('deskHello').textContent=name;el('deskMail').textContent=user.email;el('deskIni').textContent=initials(name);
    try{const sa=await db.rpc('is_super_admin');el('deskSuper').hidden=!(sa&&sa.data===true);}catch{/* optional */}
  }
  async function refresh() {
    const session=result(await db.auth.getSession()).session;
    for(const id of ['account','application','report','review','session'])el(id).hidden=true;document.body.classList.remove('review-mode');
    currentStatus=null;renderStatus();
    if(!session){el('account').hidden=false;return;}
    el('who').textContent=session.user.email;el('session').hidden=false;
    if(result(await db.rpc('journalist_reviewer'))){document.body.classList.add('review-mode');el('review').hidden=false;await deskProfile(session.user);await showQueue();return;}
    const row=result(await db.from('journalist_applications').select('status').eq('user_id',session.user.id).maybeSingle());
    currentStatus=row?.status;if(currentStatus==='approved'){location.replace('journalist');return;}renderStatus();el('application').hidden=!!row;el('report').hidden=currentStatus!=='approved';
  }
  const credentials=()=>({email:el('em').value.trim(),password:el('pw').value});
  el('account').onsubmit=e=>{e.preventDefault();run(el('signin'),async()=>{
    result(await db.auth.signInWithPassword(credentials()));el('pw').value='';await refresh();
  });};
  el('register').onclick=()=>run(el('register'),async()=>{
    if(!el('account').reportValidity())return;
    const data=result(await db.auth.signUp({...credentials(),options:{emailRedirectTo:new URL('join-newsroom.html',location.href).href}}));el('pw').value='';
    if(data.session){await refresh();return;}
    el('message').textContent=tr('ਈਮੇਲ ਦੀ ਪੁਸ਼ਟੀ ਕਰਕੇ ਇੱਥੇ ਸਾਈਨ ਇਨ ਕਰੋ।','ईमेल की पुष्टि करके यहाँ साइन इन करें।','Verify your email, then sign in here to submit your application.');
  });
  el('deskOut').onclick=()=>el('logout').click();
  el('deskRefresh').onclick=()=>run(el('deskRefresh'),showQueue);
  document.querySelectorAll('.desk-nav a[href^="#desk"]').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.desk-nav a').forEach(x=>x.removeAttribute('aria-current'));a.setAttribute('aria-current','page');}));
  el('logout').onclick=()=>run(el('logout'),async()=>{result(await db.auth.signOut());el('queue').replaceChildren();el('reports').replaceChildren();await refresh();});
  el('application').onsubmit=e=>{e.preventDefault();run(el('send'),async()=>{
    const file=el('proof').files[0];
    if(!file||file.size>1048576||!['image/jpeg','image/png'].includes(file.type))throw Error('Use a JPG or PNG up to 1 MB.');
    const proof=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Could not read document.'));r.readAsDataURL(file);});
    result(await db.rpc('submit_journalist_application',{full_name:el('name').value.trim(),area:el('district').value.trim(),mime_type:file.type,proof}));
    el('application').reset();await refresh();
  });};
  el('report').onsubmit=e=>{e.preventDefault();run(el('fileReport'),async()=>{
    result(await db.from('journalist_reports').insert({headline:el('headline').value.trim(),body:el('body').value.trim()}));
    el('report').reset();el('message').textContent=tr('ਰਿਪੋਰਟ ਸੰਪਾਦਕ ਨੂੰ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ।','रिपोर्ट संपादक को भेज दी गई है।','Report sent to the editor.');
  });};
  try {db=window.PrimezAPI.db();await refresh();}
  catch(error){el('message').textContent=error.message;}
})();
