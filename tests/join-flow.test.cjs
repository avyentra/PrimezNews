const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sql = fs.readFileSync('backend/journalist-application-v2.sql', 'utf8');
const js = fs.readFileSync('assets/js/journalists.js', 'utf8');
const html = fs.readFileSync('join-newsroom.html', 'utf8');

test('join v2 SQL keeps Aadhaar and photos private and deletes them after the decision', () => {
  assert.match(sql, /create table if not exists newsroom_private\.journalist_docs/);
  assert.match(sql, /create table if not exists newsroom_private\.journalist_identity/);
  assert.match(sql, /revoke all on newsroom_private\.journalist_docs[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /delete from newsroom_private\.journalist_docs where user_id = applicant/);
  assert.match(sql, /delete from newsroom_private\.journalist_identity where user_id = applicant/);
});
test('join v2 SQL validates input on the server and limits who can read documents', () => {
  assert.match(sql, /\[6-9\]\[0-9\]\{9\}/);
  assert.match(sql, /\[2-9\]\[0-9\]\{11\}/);
  assert.match(sql, /newsroom_private\.can_review\(\)/);
  assert.match(sql, /Open the documents before deciding/);
  assert.doesNotMatch(sql, /grant execute[^;]*to anon/i);
});
test('only the optional press proof may be missing; photo and both Aadhaar sides are required', () => {
  assert.match(sql, /array\['photo', 'aadhaar_front', 'aadhaar_back'\]/);
  assert.match(html, /id="proof" type="file"[^>]*>/);
  assert.doesNotMatch(html.match(/<input id="proof"[^>]*>/)[0], /required/);
  for (const id of ['photo', 'aFront', 'aBack', 'name', 'mobile', 'district', 'aadhaar']) {
    assert.match(html.match(new RegExp('<(?:input|select) id="' + id + '"[^>]*>'))[0], /required/, id);
  }
});
test('the page calls the v2 database functions and has screens for every state', () => {
  for (const fn of ['submit_journalist_application', 'withdraw_journalist_application', 'read_journalist_docs', 'review_journalist']) assert.match(js, new RegExp(fn));
  for (const id of ['signup', 'application', 'stPending', 'stApproved', 'stDeclined', 'reapply', 'withdraw']) assert.match(html, new RegExp('id="' + id + '"'));
});
