-- Instant news pages: the moment a story is published/edited, Supabase asks GitHub to build its
-- page + share photo (normally ~1-2 minutes) instead of waiting for the 5-minute timer.
-- This is what makes WhatsApp / Facebook always show the big photo.
--
-- ONE-TIME SETUP
-- 1) GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained token
--    Repository access: ONLY your website repo.  Permissions: Contents = Read and write.  (nothing else)
-- 2) Supabase -> SQL Editor: run the two lines below ONCE with your real values
--    (the token is kept encrypted in Supabase Vault, never in the website code):
--
--    select vault.create_secret('PASTE_GITHUB_TOKEN_HERE', 'github_dispatch_token');
--    select vault.create_secret('OWNER/REPO', 'github_repo');      -- e.g. 'gurlal/PrimezNews'
--
-- 3) Run this whole file.
begin;
create extension if not exists pg_net with schema extensions;

create or replace function newsroom_private.request_page_build() returns trigger
language plpgsql security definer set search_path = '' as $$
declare tok text; repo text;
begin
  if new.status in ('published','scheduled') and (
       tg_op = 'INSERT'
       or old.status   is distinct from new.status
       or old.title    is distinct from new.title
       or old.en       is distinct from new.en
       or old.summary  is distinct from new.summary
       or old.body     is distinct from new.body
       or old.image    is distinct from new.image
       or old.publish_at is distinct from new.publish_at) then
    select decrypted_secret into tok  from vault.decrypted_secrets where name = 'github_dispatch_token';
    select decrypted_secret into repo from vault.decrypted_secrets where name = 'github_repo';
    if tok is not null and repo ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' then
      perform net.http_post(
        url     := 'https://api.github.com/repos/' || repo || '/dispatches',
        headers := jsonb_build_object('Authorization', 'Bearer ' || tok,
                                      'Accept', 'application/vnd.github+json',
                                      'User-Agent', 'primeznews-newsroom',
                                      'Content-Type', 'application/json'),
        body    := jsonb_build_object('event_type', 'publish-news',
                                      'client_payload', jsonb_build_object('story', new.id)));
    end if;
  end if;
  return new;
end $$;
revoke all on function newsroom_private.request_page_build() from public, anon, authenticated;

drop trigger if exists request_page_build on public.stories;
create trigger request_page_build after insert or update on public.stories
  for each row execute function newsroom_private.request_page_build();
commit;

-- Check after publishing a story (status 201/204 = GitHub accepted):
-- select status_code, created from net._http_response order by created desc limit 5;
