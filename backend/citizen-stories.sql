begin;
create table if not exists public.citizen_stories (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 name text not null check(length(name) between 1 and 120), phone text not null check(length(phone) between 7 and 20),
 district text not null check(length(district) between 1 and 80), city text not null check(length(city) between 1 and 120),
 category text not null check(category in ('Local News','Public Issues','Education','Agriculture','Crime','Health','Faith','Other')),
 headline text not null check(length(headline) between 1 and 250), details text not null check(length(details) between 30 and 10000),
 evidence text not null default '' check(length(evidence)<=1000), status text not null default 'pending' check(status in ('pending','verified','rejected','published')));
alter table public.citizen_stories enable row level security;
revoke all on public.citizen_stories from public, anon, authenticated;
grant select, update(status) on public.citizen_stories to authenticated;
grant select, insert on public.citizen_stories to service_role;
create policy citizen_editor_read on public.citizen_stories for select to authenticated using (newsroom_private.is_newsroom_editor());
create policy citizen_editor_update on public.citizen_stories for update to authenticated using (newsroom_private.is_newsroom_editor()) with check (newsroom_private.is_newsroom_editor());
commit;
