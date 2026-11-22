alter table public.health_blog_reviews
  add column revision integer not null default 1,
  add column received_at timestamptz,
  add column first_public_date date;
alter table public.health_blog_reviews alter column received_at set default now();
alter table public.health_blog_reviews drop constraint health_blog_reviews_status_check,
  add constraint health_blog_reviews_status_check check(status in ('draft','approved','rejected','deleted'));
create unique index health_blog_reviews_slug on public.health_blog_reviews ((post->>'slug'));
grant update(post) on public.health_blog_reviews to authenticated;
drop policy "Decide blog drafts" on public.health_blog_reviews;
create policy "Manage newsroom blogs" on public.health_blog_reviews for update to authenticated
using (status <> 'deleted' and (newsroom_private.is_newsroom_editor() or newsroom_private.is_super_admin()))
with check (newsroom_private.is_newsroom_editor() or newsroom_private.is_super_admin());
create policy "Read blogs as super admin" on public.health_blog_reviews for select to authenticated
using (newsroom_private.is_super_admin());
create function newsroom_private.version_health_blog() returns trigger language plpgsql set search_path='' as $$
begin
  if new.post->>'slug' is distinct from old.post->>'slug' then raise exception 'Blog URL is permanent'; end if;
  new.revision := old.revision + 1;
  return new;
end;
$$;
create trigger version_health_blog before update on public.health_blog_reviews
for each row execute function newsroom_private.version_health_blog();
