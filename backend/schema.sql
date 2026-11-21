-- Run once in the Supabase SQL Editor as project owner. No credentials in Git.
begin;
create table if not exists public.newsroom_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.newsroom_editors enable row level security;
revoke all on public.newsroom_editors from anon, authenticated;
grant select on public.newsroom_editors to authenticated;
create policy "Editors can check their own membership" on public.newsroom_editors for select to authenticated using (user_id = (select auth.uid()));
create schema if not exists newsroom_private;
revoke all on schema newsroom_private from public;
grant usage on schema newsroom_private to authenticated;
create or replace function newsroom_private.is_newsroom_editor() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.newsroom_editors where user_id = (select auth.uid()));
$$;
revoke all on function newsroom_private.is_newsroom_editor() from public;
grant execute on function newsroom_private.is_newsroom_editor() to authenticated;
create table if not exists public.stories (
 id text primary key default gen_random_uuid()::text,
 title text not null check (length(title) between 1 and 500),
 en text not null check (length(en) between 1 and 500),
 summary text not null check (length(summary) between 1 and 3000),
 body text not null default '' check (length(body) <= 100000),
 categories text[] not null check (cardinality(categories) between 1 and 16 and categories <@ array['Agriculture','Education','Politics','Sports','Faith','Crime','Punjab','Business','Health','Jobs','NRI','Entertainment','National','World','Weather','Technology']::text[]),
 category text not null,
 district text not null default 'Chandigarh', author text not null default 'News desk',
 image text not null default 'fields' check (image ~ '^(https://|[a-zA-Z0-9-]+$)'),
 status text not null default 'draft' check (status in ('draft','published','scheduled')),
 publish_at timestamptz, updated_at timestamptz not null default now(),
 check (category = categories[1]),
 check (status = 'draft' or (length(trim(body)) > 0 and publish_at is not null))
);
alter table public.stories enable row level security;
revoke all on public.stories from anon, authenticated;
grant select on public.stories to anon, authenticated;
grant insert, update, delete on public.stories to authenticated;
create policy "Public sees due stories only" on public.stories for select to anon, authenticated using (status in ('published','scheduled') and publish_at <= now());
create policy "Editors manage stories" on public.stories for all to authenticated using (newsroom_private.is_newsroom_editor()) with check (newsroom_private.is_newsroom_editor());
create index if not exists stories_publication on public.stories(status, publish_at);
create or replace function public.touch_story() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger touch_story before update on public.stories for each row execute function public.touch_story();
-- SECURITY INVOKER: the caller's RLS policies always apply, including anonymous reads.
-- Filtering explicitly also stops signed-in editors from showing drafts in the public feed.
create or replace function public.published_stories() returns setof public.stories
language sql stable security invoker set search_path='' as $$
 select * from public.stories where status in ('published','scheduled') and publish_at <= now() order by publish_at desc;
$$;
revoke all on function public.published_stories() from public;
grant execute on function public.published_stories() to anon, authenticated;
create table if not exists public.advertisements (
 slot text primary key check (slot in ('left-skin','right-skin','top-leaderboard','after-headlines','news-sidebar','before-video','after-video')),
 image text not null check (image like 'https://%'), href text not null default '' check (href = '' or href like 'https://%'),
 enabled boolean not null default true
);
alter table public.advertisements enable row level security;
revoke all on public.advertisements from anon, authenticated;
grant select on public.advertisements to anon, authenticated;
grant insert, update, delete on public.advertisements to authenticated;
create policy "Public ads" on public.advertisements for select to anon, authenticated using (enabled);
create policy "Editors manage ads" on public.advertisements for all to authenticated using (newsroom_private.is_newsroom_editor()) with check(newsroom_private.is_newsroom_editor());
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('newsroom-media','newsroom-media',true,1000000,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- This bucket is for public news assets, not confidential documents.
create policy "Editor uploads" on storage.objects for insert to authenticated with check (bucket_id='newsroom-media' and newsroom_private.is_newsroom_editor() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Editor media listing" on storage.objects for select to authenticated using (bucket_id='newsroom-media' and newsroom_private.is_newsroom_editor());
create policy "Editor removes own media" on storage.objects for delete to authenticated using (bucket_id='newsroom-media' and newsroom_private.is_newsroom_editor() and owner_id=(select auth.uid())::text);
commit;
