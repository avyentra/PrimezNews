(function () {
 'use strict';
 const steps = ['details','article','publishing'];
 const el = id => document.getElementById(id);
 let index=0;
 function show(name,focus=false) {
  const next=steps.indexOf(name);if(next<0)return;index=next;
  steps.forEach(step=>{const active=step===name;el('panel-'+step).hidden=!active;const tab=el('step-'+step);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  el('previousStep').hidden=index===0;el('nextStep').hidden=index===steps.length-1;
  el('nextStep').textContent=index===0?'Article →':'Publishing →';
  if(focus)el('step-'+name).focus();
  if(typeof CustomEvent==='function'&&document.dispatchEvent)document.dispatchEvent(new CustomEvent('primez-step',{detail:{name,index,last:index===steps.length-1}}));
 }
 function validate() {
  const invalid=[...el('cloudStoryForm').querySelectorAll('input,select,textarea')].find(input=>!input.disabled && !input.checkValidity());
  if(!invalid)return true;
  show(invalid.closest('[data-panel]').dataset.panel);invalid.reportValidity();return false;
 }
 steps.forEach((name,i)=>{const tab=el('step-'+name);tab.onclick=()=>show(name);tab.onkeydown=event=>{let next;if(event.key==='ArrowRight')next=(i+1)%3;if(event.key==='ArrowLeft')next=(i+2)%3;if(event.key==='Home')next=0;if(event.key==='End')next=2;if(next!==undefined){event.preventDefault();show(steps[next],true);}};});
 el('previousStep').onclick=()=>show(steps[Math.max(0,index-1)],true);
 el('nextStep').onclick=()=>show(steps[Math.min(2,index+1)],true);
 el('toggleStories').onclick=()=>{const open=el('toggleStories').getAttribute('aria-expanded')!=='true';el('toggleStories').setAttribute('aria-expanded',String(open));el('storyRailContent').classList.toggle('rail-open',open);};
 /* validate only the fields of the current step (used by Continue) */
 function validateStep(){const panel=el('panel-'+steps[index]);const bad=[...panel.querySelectorAll('input,select,textarea')].find(i=>!i.disabled&&!i.checkValidity());if(bad){bad.reportValidity();return false;}return true;}
 function next(){if(!validateStep())return false;show(steps[Math.min(2,index+1)],true);return true;}
 window.PrimezWorkspace={show,validate,validateStep,next,current:()=>steps[index],closeRail(){el('toggleStories').setAttribute('aria-expanded','false');el('storyRailContent').classList.remove('rail-open');}};
 show('details');
})();
