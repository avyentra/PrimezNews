(function () {
 'use strict';
 window.PrimezPublication={render(story,justSaved=false){
  const box=document.getElementById('storyResult'),label=document.getElementById('storyResultLabel'),link=document.getElementById('storyResultLink');
  box.hidden=true;link.hidden=true;link.removeAttribute('href');
  if(!story || !['published','scheduled'].includes(story.status))return;
  const live=Number.isFinite(Date.parse(story.publish_at)) && Date.parse(story.publish_at)<=Date.now();
  label.textContent=live?(justSaved?'✓ Done — Published':'✓ Published'):'✓ Scheduled — not live yet';
  if(live){link.href=(window.PrimezNewsURLs?(window.PrimezNewsURLs.publicHref || window.PrimezNewsURLs.href)({...story,cloudId:story.id}):'news/?story='+encodeURIComponent(story.id));link.hidden=false;}
  box.hidden=false;
 }};
})();
