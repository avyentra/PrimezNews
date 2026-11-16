const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const root={PRIMEZ_NEWS_ROUTES:{brief:'punjab-wheat-seed'}};vm.runInNewContext(fs.readFileSync('assets/js/news-urls.js','utf8'),{window:root,encodeURIComponent});
test('permanent database slug takes precedence over title and route cache',()=>{assert.equal(root.PrimezNewsURLs.href({id:'brief',slug:'bathinda-police-monitoring',title:'Changed headline'}),'news/bathinda-police-monitoring/');});
test('seed articles use headline routes and Unicode slugs stay one path segment',()=>{assert.equal(root.PrimezNewsURLs.href({id:'brief'}),'news/punjab-wheat-seed/');assert.equal(root.PrimezNewsURLs.href({id:'x',slug:'ਪੰਜਾਬ-ਖ਼ਬਰ'}),'news/'+encodeURIComponent('ਪੰਜਾਬ-ਖ਼ਬਰ')+'/');assert.equal(root.PrimezNewsURLs.href({id:'x',slug:'a/b'}),'news/a%2Fb/');});
test('legacy unknown records retain an encoded working URL',()=>{assert.equal(root.PrimezNewsURLs.href({id:'x&y',cloudId:'x&y'}),'news/?story=x%26y');});

test('shared URL uses the configured production origin and permanent slug',()=>{
 const site={};
 vm.runInNewContext(fs.readFileSync('assets/js/news-routes.js','utf8'),{window:site});
 vm.runInNewContext(fs.readFileSync('assets/js/news-urls.js','utf8'),{window:site});
 const base='https://'+fs.readFileSync('CNAME','utf8').trim()+'/';
 assert.equal(site.PrimezNewsURLs.publicHref({slug:'existing-headline',title:'Updated title'}),base+'news/existing-headline/');
});
