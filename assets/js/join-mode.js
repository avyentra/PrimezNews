/* Join page: show "Create applicant account" first; Sign in only when the user chooses it (or ?mode=login). */
(function(){
 const form=document.getElementById('account');if(!form)return;
 const reg=document.getElementById('register'),pw=document.getElementById('pw');
 const q=new URLSearchParams(location.search);
 let mode=(q.get('mode')==='login'||location.hash==='#login')?'login':'register';
 function set(m){mode=m;form.classList.toggle('mode-register',m==='register');form.classList.toggle('mode-login',m==='login');if(pw)pw.autocomplete=m==='register'?'new-password':'current-password';}
 form.querySelectorAll('.jm-link').forEach(b=>b.addEventListener('click',()=>{set(b.dataset.mode);document.getElementById('em')?.focus();}));
 /* Enter key in register mode = create account, not sign in */
 const orig=form.onsubmit;
 form.onsubmit=e=>{if(mode==='register'){e.preventDefault();reg?.click();return;}return orig?orig.call(form,e):undefined;};
 /* after an account is created, the next step is sign in */
 reg?.addEventListener('click',()=>{const msg=document.getElementById('message')||document.getElementById('status');if(!msg)return;const before=msg.textContent;const t=setInterval(()=>{if(!reg.disabled){clearInterval(t);if(msg.textContent&&msg.textContent!==before&&!/error|ਗਲਤੀ|त्रुटि/i.test(msg.textContent))set('login');}},300);setTimeout(()=>clearInterval(t),30000);});
 set(mode);
})();
