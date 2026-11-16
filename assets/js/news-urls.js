/* One URL rule for editor, ticker, homepage, search and article reader. */
(function(root){
 'use strict';
 const routes=root.PRIMEZ_NEWS_ROUTES||{};
 function href(story){
  const id=story.cloudId||story.id;
  const slug=story.slug||routes[id];
  return slug?'news/'+encodeURIComponent(slug)+'/':(story.cloudId?'news/?story=':'home-v2?story=')+encodeURIComponent(id);
 }
 function publicHref(story){
  return (root.PRIMEZ_PUBLIC_BASE || '') + href(story);
 }
 root.PrimezNewsURLs={href,publicHref};
})(window);
