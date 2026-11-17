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
  async function showQueue(){
    const rows=result(await db.from('journalist_applications').select('user_id,name,email,district,status,submitted_at').eq('status','pending').order('submitted_at'));
    const queue=el('queue'); queue.replaceChildren();
    if(!rows.length) queue.textContent='No applications awaiting review.';
    for(const row of rows){
      const card=document.createElement('article'), title=document.createElement('strong'), description=document.createElement('p'), image=document.createElement('img');
      title.textContent=row.name;description.textContent=[row.district,row.email].join(' · ');image.alt='Submitted reporting credential';image.hidden=true;
      const decide=async decision=>{
        if(!window.confirm((decision==='approved'?'Activate journalist access for ':'Decline the application from ')+row.name+'?'))return;
        result(await db.rpc('review_journalist',{applicant:row.user_id,decision}));await showQueue();
      };
      const approve=button('Approve and activate',()=>decide('approved')), decline=button('Decline',()=>decide('declined'));
      approve.disabled=decline.disabled=true;
      card.append(title,description,button('View private document',async()=>{
        const proof=result(await db.rpc('read_journalist_proof',{applicant:row.user_id}));
        if(!['image/jpeg','image/png'].includes(proof.mime))throw Error('Unsupported document.');
        image.src='data:'+proof.mime+';base64,'+proof.data.replace(/\s/g,'');await image.decode();
        image.hidden=false;approve.disabled=decline.disabled=false;
      }),image,approve,decline);queue.append(card);
    }
    const reports=result(await db.from('journalist_reports').select('*,journalist_applications(name,district)').order('submitted_at',{ascending:false}).limit(100));
    el('reports').replaceChildren();
    if(!reports.length) el('reports').textContent='No reports submitted.';
    reports.forEach(r=>{
      const article=document.createElement('article'),h=document.createElement('strong'),by=document.createElement('small'),p=document.createElement('p');
      h.textContent=r.headline;const at=new Date(r.updated_at||r.submitted_at);by.textContent=[r.journalist_applications?.name,r.journalist_applications?.district,Number.isFinite(at.getTime())?at.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}):''].filter(Boolean).join(' · ');p.textContent=r.body;article.append(h,by,p);
      /* desk: move report through the workflow (needs backend/journalist-dashboard.sql) */
      if(r.image){const im=document.createElement('img');im.src=r.image;im.alt='';im.loading='lazy';article.append(im);}
      if('status' in r){const bar=document.createElement('div');bar.className='report-status';const lab=document.createElement('small');lab.textContent='Status: '+r.status;bar.append(lab);
        [['in_review','In review'],['approved','Approve'],['published','Mark published'],['returned','Return with note']].forEach(([st,txt])=>{if(st===r.status)return;bar.append(button(txt,async()=>{const note=st==='returned'?(window.prompt('Note for the journalist:')||''):'';result(await db.rpc('set_report_status',{report:r.id,new_status:st,note}));await showQueue();}));});
        article.append(bar);}el('reports').append(article);
    });
  }
  async function refresh() {
    const session=result(await db.auth.getSession()).session;
    for(const id of ['account','application','report','review','session'])el(id).hidden=true;
    currentStatus=null;renderStatus();
    if(!session){el('account').hidden=false;return;}
    el('who').textContent=session.user.email;el('session').hidden=false;
    if(result(await db.rpc('journalist_reviewer'))){el('review').hidden=false;await showQueue();return;}
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
