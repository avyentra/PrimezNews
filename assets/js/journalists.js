(async function () {
  'use strict';
  const el = id => document.getElementById(id);
  let db;
  function result(response) { if(response.error) throw response.error; return response.data; }
  function button(text, action) {
    const b=document.createElement('button'); b.type='button'; b.textContent=text;
    b.onclick=()=>run(b,action); return b;
  }
  async function run(control, action) {
    if(control.disabled) return;
    control.disabled=true; el('message').textContent='';
    try { await action(); } catch(error) { el('message').textContent=/invalid login/i.test(error.message||'')?'Wrong email or password. Please try again.':(error.message || 'Request failed. Please try again.'); }
    finally { control.disabled=false; }
  }
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
  {const m=document.getElementById('message');let h;if(m)new MutationObserver(()=>{clearTimeout(h);if(m.textContent)h=setTimeout(()=>{m.textContent='';},7000);}).observe(m,{childList:true,characterData:true,subtree:true});}
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
    const rows=result(await db.from('journalist_applications').select('user_id,name,email,district,mobile,status,submitted_at').eq('status','pending').order('submitted_at'));
    const queue=el('queue'); queue.replaceChildren();
    if(!rows.length) queue.append(mk('p','desk-empty','No applications awaiting review.'));
    for(const row of rows){
      const card=mk('article','d-app'),who=mk('div','d-who'),info=mk('div');
      info.append(mk('strong','',row.name),mk('small','',[row.district,row.mobile,row.email].filter(Boolean).join(' · ')),mk('small','',when(row.submitted_at)));
      who.append(mk('span','d-av',initials(row.name)),info);
      const proof=mk('div','d-proof');proof.append(mk('p','','Open the private documents before deciding. They are deleted after your decision.'));
      let noteBox=null;
      const decide=decision=>async()=>{result(await db.rpc('review_journalist',{applicant:row.user_id,decision,note:noteBox?noteBox.value.trim():''}));toast(decision==='approved'?row.name+' is now an active journalist.':'Application declined.');await showQueue();};
      const approve=sure('Approve','green','Tap again to approve',decide('approved')), decline=sure('Decline','red','Tap again to decline',decide('declined'));
      approve.disabled=decline.disabled=true;
      const view=dbtn('View documents','dark',async()=>{
        const res=result(await db.rpc('read_journalist_docs',{applicant:row.user_id})),docs=res.docs||{};
        const labels={photo:'Photo',aadhaar_front:'Aadhaar front',aadhaar_back:'Aadhaar back',proof:'Press proof'},figs=[];
        for(const k of ['photo','aadhaar_front','aadhaar_back','proof']){
          const d=docs[k];if(!d)continue;
          if(!['image/jpeg','image/png','image/webp'].includes(d.mime)||!/^[A-Za-z0-9+/=\s]+$/.test(d.data))throw Error('Unsupported document.');
          const image=mk('img');image.alt=labels[k]+' of '+row.name;image.src='data:'+d.mime+';base64,'+d.data.replace(/\s/g,'');await image.decode();
          const fig=mk('figure');fig.append(image,mk('figcaption','',labels[k]));figs.push(fig);
        }
        if(!figs.length)throw Error('No documents found for this application.');
        const ident=mk('p','d-ident','Mobile: '+(res.mobile||row.mobile||'-')+'   ·   Aadhaar: '+String(res.aadhaar||'').replace(/(\d{4})(?=\d)/g,'$1 '));
        proof.classList.add('multi');proof.replaceChildren(ident,...figs);
        noteBox=mk('textarea','d-notein');noteBox.maxLength=500;noteBox.rows=2;noteBox.placeholder='Note for the applicant if you decline (they will see this)';
        proof.after(noteBox);approve.disabled=decline.disabled=false;view.hidden=true;
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
  const STEPS=['Account','Application','Review'];
  function progress(done,state){ /* done: steps finished; state: 'ok' | 'no' for the Review step */
    return STEPS.map((n,i)=>{const c=i<done?'done':i===done?'cur':'';return '<span class="'+c+'"'+(i===done&&state==='no'?' style="color:#b4232a"':'')+'>'+(i<done?'✓ ':i===done?'● ':'')+n+'</span>';}).join('<i></i>');
  }
  const first=n=>String(n||'').trim().split(/\s+/)[0]||'there';
  function showState(row,user){
    const kind=row.status;
    el('state').hidden=false;
    for(const [k,id] of [['pending','stPending'],['approved','stApproved'],['declined','stDeclined']])el(id).hidden=k!==kind;
    el('stProg').innerHTML='<div class="jn-prog">'+progress(kind==='pending'?2:3,kind==='declined'?'no':'ok')+'</div>';
    document.querySelectorAll('#state .stName').forEach(n=>{n.textContent=first(row.name);});
    document.querySelectorAll('#state .stMail').forEach(n=>{n.textContent=user.email;});
    document.querySelectorAll('#state .stFull').forEach(n=>{n.textContent=row.name;});
    el('stWhen').textContent=row.submitted_at?when(row.submitted_at):'';
    el('stRole').textContent='Reporter'+(row.district?' · '+row.district:'');
    el('stNote').textContent=row.decision_note||'Your documents could not be verified. Please send clear photos and apply again.';
    el('stReviewed').textContent=row.reviewed_at?'Reviewed '+when(row.reviewed_at)+' · Editor desk':'';
  }
  async function myApplication(uid){
    const full='status,name,district,mobile,submitted_at,reviewed_at,decision_note';
    let r=await db.from('journalist_applications').select(full).eq('user_id',uid).maybeSingle();
    if(r.error)r=await db.from('journalist_applications').select('status,name,district,submitted_at,reviewed_at').eq('user_id',uid).maybeSingle(); /* join v2 SQL not run yet */
    return result(r);
  }
  async function refresh() {
    const session=result(await db.auth.getSession()).session;
    for(const id of ['signup','application','state','review','session'])el(id).hidden=true;document.body.classList.remove('review-mode');
    if(!session){el('signup').hidden=false;return;}
    el('who').textContent=session.user.email;el('session').hidden=false;
    if(result(await db.rpc('journalist_reviewer'))){document.body.classList.add('review-mode');el('review').hidden=false;await deskProfile(session.user);await showQueue();return;}
    const row=await myApplication(session.user.id);
    if(row)showState(row,session.user);
    else{el('application').hidden=false;const nm=session.user.user_metadata&&session.user.user_metadata.full_name;if(nm&&!el('name').value)el('name').value=nm;}
  }
  const credentials=()=>({email:el('em').value.trim(),password:el('pw').value});
  el('account').onsubmit=e=>{e.preventDefault();run(el('signin'),async()=>{
    result(await db.auth.signInWithPassword(credentials()));el('pw').value='';await refresh();
  });};
  const verify=el('verify');
  const note=(html)=>{verify.hidden=!html;verify.innerHTML=html||'';};
  el('em').addEventListener('input',()=>note(''));
  el('register').onclick=()=>run(el('register'),async()=>{
    note('');
    if(!el('account').reportValidity())return;
    const cred=credentials();
    const data=result(await db.auth.signUp({...cred,options:{emailRedirectTo:new URL('join-newsroom.html',location.href).href}}));
    if(data.session){el('pw').value='';await refresh();return;}
    /* No session yet: either email confirmation is switched on, or this email already has an account. Try signing in. */
    const tried=await db.auth.signInWithPassword(cred);
    if(!tried.error&&tried.data&&tried.data.session){el('pw').value='';await refresh();return;}
    el('pw').value='';
    const unconfirmed=!tried.error||/not confirmed/i.test(tried.error.message||'');
    if(unconfirmed){
      const mail=cred.email.replace(/[<>&"]/g,'');
      note('<b>Step 1 done — verify your email.</b> We sent a link to <b>'+mail+'</b>. Open it, then come back here and press <b>Sign in</b> to continue to step 2. Check Spam if you cannot see it.');
    } else el('message').textContent='This email already has an account. Use Sign in with your password.';
    document.querySelector('#account [data-mode="login"]')?.click();
  });
  el('deskOut').onclick=()=>el('logout').click();
  el('deskRefresh').onclick=()=>run(el('deskRefresh'),showQueue);
  document.querySelectorAll('.desk-nav a[href^="#desk"]').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.desk-nav a').forEach(x=>x.removeAttribute('aria-current'));a.setAttribute('aria-current','page');}));
  el('logout').onclick=()=>run(el('logout'),async()=>{result(await db.auth.signOut());el('queue').replaceChildren();el('reports').replaceChildren();await refresh();});

  /* ---------- Application form: photo uploads (compressed in the browser), checks, send ---------- */
  const picked={};            /* id -> File */
  const asBase64=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Could not read the photo.'));r.readAsDataURL(file);});
  function clearPick(id){
    delete picked[id];const box=document.querySelector('[data-up="'+id+'"]'),input=el(id);if(input)input.value='';if(!box)return;
    const drop=box.querySelector('.jn-drop'),got=box.querySelector('.jn-got'),av=box.querySelector('.jn-avatar');
    if(drop)drop.hidden=false;if(got){got.hidden=true;URL.revokeObjectURL(got.querySelector('img').src);}
    if(av)av.innerHTML='<span aria-hidden="true">👤</span>';
  }
  function setPick(id,file){
    picked[id]=file;const box=document.querySelector('[data-up="'+id+'"]'),url=URL.createObjectURL(file);
    const av=box.querySelector('.jn-avatar');
    if(av){const im=mk('img');im.alt='Your photo';im.src=url;av.replaceChildren(im);return;}
    const drop=box.querySelector('.jn-drop'),got=box.querySelector('.jn-got');
    got.querySelector('img').src=url;const label=(box.querySelector('.jn-uptxt b')||{textContent:'Photo'}).textContent.replace(/\*$/,'');got.querySelector('.jn-name').textContent='✓ '+label+' added';got.querySelector('.jn-name').title=file.name;
    drop.hidden=true;got.hidden=false;
  }
  document.querySelectorAll('[data-up]').forEach(box=>{
    const id=box.dataset.up,input=el(id);
    input.addEventListener('change',async()=>{
      const f=input.files[0];if(!f)return;
      el('message').textContent='';
      try{
        if(!window.PrimezImage)throw Error('Photo tools did not load. Refresh the page.');
        const small=await window.PrimezImage.compress(f,{maxSide:1600,maxBytes:450*1024});
        if(small.size>1048576)throw Error('This photo is still over 1 MB. Try a smaller photo.');
        setPick(id,small);
      }catch(error){input.value='';el('message').textContent=error.message||'Could not use this photo.';}
    });
    const rm=box.querySelector('.jn-rm');if(rm)rm.onclick=()=>clearPick(id);
  });
  el('aadhaar').addEventListener('input',e=>{const d=e.target.value.replace(/\D/g,'').slice(0,12);e.target.value=d.replace(/(\d{4})(?=\d)/g,'$1 ');});
  el('mobile').addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^\d+ ]/g,'');});
  function checkForm(){
    const name=el('name').value.trim(),phone=el('mobile').value.replace(/\D/g,'').replace(/^91(?=\d{10}$)/,''),uid=el('aadhaar').value.replace(/\D/g,'');
    if(name.length<2)return['name','Enter your full name.'];
    if(!/^[6-9]\d{9}$/.test(phone))return['mobile','Enter a valid 10-digit mobile number.'];
    if(!el('district').value)return['district','Choose your district.'];
    if(!/^[2-9]\d{11}$/.test(uid))return['aadhaar','Enter a valid 12-digit Aadhaar number.'];
    if(!picked.photo)return['photo','Add your photo.'];
    if(!picked.aFront||!picked.aBack)return['aFront','Add both sides of your Aadhaar card.'];
    if(!el('confirm').checked)return['confirm','Please confirm that the details are yours and true.'];
    return null;
  }
  el('application').onsubmit=e=>{e.preventDefault();run(el('send'),async()=>{
    const bad=checkForm();if(bad){el('message').textContent=bad[1];const t=el(bad[0]);if(t&&t.focus&&t.type!=='file')t.focus();else document.querySelector('[data-up="'+bad[0]+'"]')?.scrollIntoView({block:'center'});return;}
    const docs={},map={photo:'photo',aFront:'aadhaar_front',aBack:'aadhaar_back',proof:'proof'};
    for(const [id,kind] of Object.entries(map)){const f=picked[id];if(f)docs[kind]={mime:f.type,data:await asBase64(f)};}
    result(await db.rpc('submit_journalist_application',{full_name:el('name').value.trim(),area:el('district').value,mobile:el('mobile').value.replace(/\D/g,''),aadhaar:el('aadhaar').value.replace(/\D/g,''),docs}));
    el('application').reset();Object.keys(picked).forEach(clearPick);el('message').textContent='';await refresh();window.scrollTo({top:0});
  });};
  const withdraw=el('withdraw');
  withdraw.onclick=()=>{if(!withdraw.dataset.armed){withdraw.dataset.armed='1';withdraw.textContent='Tap again to withdraw and edit';setTimeout(()=>{delete withdraw.dataset.armed;withdraw.textContent='Edit my application';},4000);return;}
    delete withdraw.dataset.armed;withdraw.textContent='Edit my application';run(withdraw,async()=>{result(await db.rpc('withdraw_journalist_application'));await refresh();});};
  el('reapply').onclick=()=>{el('state').hidden=true;el('application').hidden=false;window.scrollTo({top:0});};
  try {db=window.PrimezAPI.db();await refresh();}
  catch(error){el('message').textContent=error.message;}
})();
