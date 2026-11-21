begin;
create table if not exists public.health_blog_reviews (
  slot text primary key,
  post jsonb not null,
  status text not null default 'draft' check (status in ('draft','approved','rejected'))
);
alter table public.health_blog_reviews enable row level security;
revoke all on public.health_blog_reviews from public, anon, authenticated;
grant select, update(status) on public.health_blog_reviews to authenticated;
grant select, insert on public.health_blog_reviews to service_role;
drop policy if exists "Review blog drafts" on public.health_blog_reviews;
create policy "Review blog drafts" on public.health_blog_reviews for select to authenticated
using (newsroom_private.is_newsroom_editor());
drop policy if exists "Decide blog drafts" on public.health_blog_reviews;
create policy "Decide blog drafts" on public.health_blog_reviews for update to authenticated
using (status='draft' and newsroom_private.is_newsroom_editor())
with check (status in ('approved','rejected') and newsroom_private.is_newsroom_editor());
commit;
