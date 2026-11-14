(function () {
 const api = window.PrimezAPI, el = id => document.getElementById(id); let recovery = false;
 if (!api.configured) { el('resetFeedback').textContent = 'Backend setup pending.'; return; }
 api.db().auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') { recovery = true; el('resetButton').disabled = false; } });
 el('resetForm').onsubmit = async event => {
  event.preventDefault(); if (!recovery) return;
  if (el('newPassword').value !== el('confirmPassword').value) { el('resetFeedback').textContent = 'Passwords do not match.'; return; }
  el('resetButton').disabled = true;
  try { await api.reset(el('newPassword').value); await api.logout(); location.replace('login.html'); }
  catch (error) { el('resetFeedback').textContent = error.message; el('resetButton').disabled = false; }
 };
})();
