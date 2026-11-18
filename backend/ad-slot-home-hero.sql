-- Homepage top-right 300x250 ad box ("home-hero-side") ko Advertisements mein jodna.
-- Supabase -> SQL Editor mein EK BAAR chalao. Dobara chalana safe hai. Purane ads nahi badalte.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.advertisements'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%left-skin%'
  loop
    execute format('alter table public.advertisements drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.advertisements add constraint advertisements_slot_allowed check (slot in (
  'home-hero-side','left-skin','right-skin','top-leaderboard','after-headlines','news-sidebar','before-video','after-video'));
