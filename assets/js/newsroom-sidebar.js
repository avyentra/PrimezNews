(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const menu = byId('blogMenu');
  const close = byId('blogCloseMenu');
  function setOpen(open) {
    document.body.classList.toggle('ad-menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
    (open ? close : menu).focus();
  }

  menu.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('ad-menu-open')) setOpen(false);
  });

  async function loadProfile() {
    const db = window.PrimezAPI.db();
    const { data, error } = await db.auth.getUser();
    if (error || !data?.user) return;
    const { email = '', user_metadata: metadata = {} } = data.user;
    const base = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
    const name = (metadata.full_name || metadata.name || base.replace(/\b\w/g, letter => letter.toUpperCase()) || 'Editor').slice(0, 40);
    byId('userName').textContent = name;
    byId('userEmail').textContent = email;
    byId('userInitials').textContent = name.trim().split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
    byId('userChip').title = email;
    byId('userChip').hidden = false;
    const result = await db.rpc('journalist_reviewer');
    byId('reviewJournalists').hidden = result.data !== true;
  }
  loadProfile().catch(error => console.warn('Could not load newsroom sidebar profile:', error.message));
})();
