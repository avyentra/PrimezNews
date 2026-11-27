// Serve the checkout with python -m http.server 8766, then run with Playwright available.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const root = process.env.BLOG_TEST_ORIGIN || 'http://127.0.0.1:8766';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=', 'base64');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BLOG_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    let prompt = '';
    page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? prompt : undefined));
    await page.route('**/cdn.jsdelivr.net/**', route => route.abort());
    await page.route('**/assets/js/newsroom-api.js', route => route.fulfill({contentType:'text/javascript',body:`(() => {
      const rows = [], uploads = [];
      window.fixture = {rows, uploads};
      const user = {id:'12345678-1234-4234-8234-123456789012'};
      class Query {
        constructor(table) { this.table = table; this.filters = []; }
        select() { return this; }
        eq(key,value) { this.filters.push(r=>r[key]===value); return this; }
        ilike(key,value) { this.filters.push(r=>r[key].toLowerCase().includes(value.slice(1,-1).toLowerCase())); return this; }
        neq(key,value) { this.filters.push(r=>r[key]!==value); return this; }
        order() { return this; }
        range(a,b) { this.bounds=[a,b]; return this; }
        insert(row) { this.newRow=row; return this; }
        update(row) { this.updated=row; return this; }
        execute() {
          if(this.table==='newsroom_editors') return [{user_id:user.id}];
          const selected = rows.filter(row=>this.filters.every(filter=>filter(row)));
          if(this.newRow) {
            if(rows.some(row=>row.studio_id && row.studio_id===this.newRow.studio_id)) throw new Error('Duplicate studio submission');
            const row = {...this.newRow,id:String(rows.length+1),revision:1};
            rows.push(row); return [row];
          }
          if(this.updated) selected.forEach(row=>Object.assign(row,this.updated,{revision:row.revision+1}));
          return selected;
        }
        maybeSingle() { return Promise.resolve({data:this.execute()[0]||null}); }
        single() { return this.maybeSingle(); }
        then(resolve) { const data=this.execute(), count=data.length; return Promise.resolve({data:this.bounds?data.slice(this.bounds[0],this.bounds[1]+1):data,count}).then(resolve); }
      }
      window.PrimezAPI = {db:()=>({
        auth:{getUser:async()=>({data:{user}})},
        from:table=>new Query(table),
        rpc:async name=>({data:name==='journalist_reviewer'}),
        storage:{from:()=>({
          upload:async (path,file)=>{uploads.push([path,file.type]);return {data:{path}};},
          getPublicUrl:path=>({data:{publicUrl:location.origin.replace('http:','https:')+'/'+path}})
        })}
      })};
    })();`}));
    await page.goto(root+'/blog-management.html');
    assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(243, 244, 248)');
    assert.equal(await page.locator('.ad-logo').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(20, 35, 58)');
    await page.locator('#userChip').waitFor({ state: 'attached' });
    await page.waitForFunction(() => !document.querySelector('#reviewJournalists').hidden);
    assert.equal(await page.locator('#logout').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 245, 245)');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    assert.equal(await page.locator('#blogSidebar').evaluate(node => getComputedStyle(node).visibility), 'visible');
    assert.equal(await page.locator('.ad-nav a').allTextContents().then(items => items.map(x => x.trim()).join('|')),
      'My dashboard|New story|Recent news|Draft news|Health & Beauty queue|Blogs|Citizen Stories|Advertisements|Journalist applications|Profile settings|View live stories ↗|View live blogs ↗');
    assert.equal(await page.locator('.ad-nav [aria-current="page"]').textContent(), 'Blogs');
    await page.getByRole('button', { name: 'Close menu', exact: true }).click();
    assert.equal(await page.locator('#blogSidebar').evaluate(node => getComputedStyle(node).visibility), 'hidden');
    await page.locator('#blogCategory').selectOption('Health & Beauty');
    await page.locator('#blogSearch').fill('A gym membership that fits your real week');
    const existing = page.locator('#blogResults li').filter({ hasText: 'A gym membership that fits your real week' });
    await existing.waitFor();
    assert.equal(await existing.getByRole('link', { name: 'Live page' }).getAttribute('href'), '/en/health-blog/how-to-compare-gym-memberships/');
    assert.match(await existing.getByRole('link', { name: 'Open in Health & Beauty queue' }).getAttribute('href'), /blog=how-to-compare-gym-memberships/);
    await page.getByRole('button', { name: 'Drafts', exact: true }).click();
    await existing.waitFor({ state: 'hidden' });
    await page.locator('#blogCategory').selectOption('');
    await page.locator('#blogSearch').fill('');
    await page.getByRole('button', { name: 'All Blogs', exact: true }).click();
    await page.getByRole('button',{name:'New Blog',exact:true}).click();
    assert.equal(await page.getByRole('button', { name: 'New Blog', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Published Blogs', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Published Blogs', exact: true }).click();
    assert.equal(await page.locator('#blogForm').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Published Blogs', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'New Blog', exact: true }).click();
    assert.equal(await page.locator('#blogForm select[name=category] option').count(),7);
    await page.locator('[name=title]').fill('Mobile publication test');
    await page.locator('[name=summary]').fill('An editorial summary.');
    await page.locator('[name=author]').fill('Test editor');
    await page.locator('[name=cover_alt]').fill('A sample image');
    await page.locator('#blogCoverFile').setInputFiles({name:'test.png',mimeType:'image/png',buffer:pixel});
    await page.waitForFunction(()=>document.querySelector('[name=cover_url]').value);
    await page.locator('#blogBody').fill('First editorial heading');
    await page.getByRole('button',{name:'Heading 2',exact:true}).click();
    assert.equal(await page.locator('#blogBody h2').count(),1);
    await page.locator('#blogBody').press('End');
    await page.locator('#blogBody').press('Enter');
    await page.keyboard.type('Test paragraph with original editorial context.');
    prompt='Inline image alt and caption';
    await page.locator('#blogInlineFile').setInputFiles({name:'inline.png',mimeType:'image/png',buffer:pixel});
    await page.waitForFunction(()=>document.querySelector('#blogBody figure img'));
    assert.equal(await page.locator('#blogBody figure img').getAttribute('alt'), prompt);
    await page.evaluate(()=> {
      const node = document.querySelector('#blogBody');
      const data = new DataTransfer();
      data.setData('text/html','<strong>Safe</strong><img src="javascript:alert(2)" onerror="alert(3)"><script>alert(4)</script>');
      node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
    });
    assert.equal(await page.locator('#blogBody [onerror], #blogBody script, #blogBody [src^="javascript:"]').count(),0);
    await page.evaluate(()=>document.querySelector('#blogBody img:not([src])')?.remove());
    await page.locator('[name=seo_title]').fill('SEO title');
    await page.locator('[name=seo_description]').fill('SEO description');
    await page.getByRole('button',{name:'Save Draft',exact:true}).click();
    await page.getByText('Draft saved.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Preview',exact:true}).click();
    await page.locator('#blogPreviewDialog').waitFor();
    assert.equal(await page.locator('#blogPreviewDialog h2').first().textContent(),'Mobile publication test');
    await page.getByRole('button',{name:'Close preview'}).click();
    await page.getByRole('button',{name:'Publish Now',exact:true}).click();
    await page.getByRole('button',{name:'Update Published Blog',exact:true}).waitFor();
    await page.locator('[name=summary]').fill('Updated live summary.');
    await page.getByRole('button',{name:'Update Published Blog',exact:true}).click();
    await page.waitForFunction(()=>window.fixture.rows[0].summary==='Updated live summary.');
    await page.getByRole('button',{name:'Unpublish',exact:true}).click();
    await page.getByText(/Unpublished in the CMS/).waitFor();
    await page.getByRole('button',{name:'Back to Blogs'}).click();
    await page.waitForFunction(() => !document.querySelector('#blogNavigation').inert);
    const report={article:{title:'Studio draft',body:'## Verified heading\n\nOriginal content.'},category:'Technology',sources:[{url:'https://example.org/reference'}],status:'editor_review_required'};
    await page.locator('#blogImport').setInputFiles({name:'studio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(report))});
    await page.getByText(/Studio draft imported/).waitFor();
    const rows = await page.evaluate(()=>window.fixture.rows);
    assert.equal(rows[1].category,'Technology');
    assert.equal(rows[1].status,'draft');
    assert.equal(await page.evaluate(()=>window.fixture.uploads.length),2);
    assert.deepEqual(pageErrors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    console.log('Chromium 390 px: editor, category controls, cover and inline uploads, formatting, sanitization, preview, draft, publish/update/unpublish, Studio import and horizontal layout passed.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
