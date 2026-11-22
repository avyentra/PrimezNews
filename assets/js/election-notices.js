(async () => {
  const panel = document.getElementById('electionNotices');
  const list = document.getElementById('electionList');
  const db = window.PrimezAPI.db();
  async function refresh() {
    const { data, error } = await db.from('election_areas').select('*').order('starts_at', {ascending:false});
    if (error) {
      list.textContent = 'Election notifications unavailable. Refresh to retry.';
      return;
    }
    list.replaceChildren();
    for (const row of data) {
      const now = Date.now();
      const started = Date.parse(row.starts_at) <= now;
      const ended = Date.parse(row.confirmed_end) <= now;
      const state = ended ? 'Election ended' : !started ? 'Upcoming election' :
        Date.parse(row.expected_end) <= now ? 'Awaiting official completion' : 'Election started';
      const line = document.createElement('p');
      const source = document.createElement('a');
      source.href = ended ? row.end_source_url : row.source_url;
      source.textContent = 'Official notice';
      source.target = '_blank';
      source.rel = 'noopener';
      const date = new Date(ended ? row.confirmed_end : row.starts_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'});
      line.append(state + ' · ' + row.area + ' · ' + date + ' · ', source);
      if (!ended) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = row.enabled ? 'Filter ON · Turn off' : 'Filter OFF · Turn on';
        button.onclick = async () => {
          button.disabled = true;
          const result = await db.from('election_areas').update({enabled:!row.enabled}).eq('id',row.id).eq('enabled',row.enabled).select('id').single();
          if (result.error) { button.disabled = false; button.textContent = 'Update failed · Refresh'; }
          else await refresh();
        };
        line.append(' ',button);
      }
      list.append(line);
    }
    panel.hidden = false;
  }
  const {data} = await db.rpc('is_super_admin');
  if (data === true) {
    await refresh();
    setInterval(() => { if (!document.hidden) refresh(); },60000);
  }
})().catch(console.error);
