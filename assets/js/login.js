(function () {
 'use strict';
 const api = window.PrimezAPI, el = id => document.getElementById(id), msg = text => { el('loginFeedback').textContent = text; };
 if (!api.configured) { msg('Backend setup pending. Your administrator must connect Supabase before sign in is available.'); el('signIn').disabled = true; el('forgotPassword').disabled = true; }
 el('showPassword').onclick = () => { const visible = el('password').type === 'password'; el('password').type = visible ? 'text' : 'password'; el('showPassword').setAttribute('aria-label', visible ? 'Hide password' : 'Show password'); el('showPassword').setAttribute('aria-pressed', String(visible)); };
 el('loginForm').onsubmit = async event => {
  event.preventDefault(); el('signIn').disabled = true; msg('Signing in…');
  try { await api.login(el('email').value.trim(), el('password').value, el('rememberMe').checked); location.replace('admin.html'); }
  catch (error) { msg(error.message || 'Sign in failed. Please try again.'); }
  finally { el('signIn').disabled = false; }
 };
 el('forgotPassword').onclick = async () => {
  if (!el('email').value.includes('@')) { msg('Enter your email address first.'); return; }
  el('forgotPassword').disabled = true;
  try { await api.recover(el('email').value.trim()); msg('If your account is eligible, a password reset email will arrive shortly. Check Spam as well.'); }
  catch { msg('Could not request reset. Please try again later.'); }
  finally { el('forgotPassword').disabled = false; }
 };
})();
