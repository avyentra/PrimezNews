-- Apply after backend/schema.sql and backend/super-admin.sql.
create table public.editorial_blogs (
  id uuid primary key default gen_random_uuid(),
  slug text unique check (slug is null or (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')),
  title text not null check (length(title) between 1 and 220),
  summary text not null default '',
  category text not null default 'General' check (category in ('General','Business & Finance','Health & Beauty','Technology','Insurance & Legal','Education','Lifestyle')),
  language text not null default 'en' check (language in ('en','pa','hi')),
  author text not null default '',
  audience text not null default '',
  cover_url text not null default '',
  cover_alt text not null default '',
  cover_caption text not null default '',
  body_html text not null default '' check (length(body_html) <= 200000),
  seo_title text not null default '',
  seo_description text not null default '',
  focus_keyword text not null default '',
  secondary_keywords text not null default '',
  canonical_url text not null default '',
  sources text[] not null default '{}',
  social_image text not null default '',
  claims_reviewed boolean not null default false,
  studio_id text unique,
  status text not null default 'draft' check (status in ('draft','published','deleted')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  constraint editorial_blog_publish_fields check (
    status <> 'published' or (
      slug is not null and published_at is not null and
      btrim(summary) <> '' and btrim(author) <> '' and
      cover_url ~ '^https://' and btrim(cover_alt) <> '' and
      btrim(body_html) <> '' and btrim(seo_title) <> '' and btrim(seo_description) <> '' and
      (category not in ('Health & Beauty','Business & Finance','Insurance & Legal') or
        (claims_reviewed and cardinality(sources) > 0)) and
      (studio_id is null or claims_reviewed)
    )
  )
);
create unique index editorial_blog_title on public.editorial_blogs (language, lower(btrim(title))) where status <> 'deleted';
create unique index editorial_blog_body on public.editorial_blogs (language, md5(regexp_replace(btrim(regexp_replace(body_html,'<[^>]*>',' ','g')), '\s+', ' ', 'g'))) where status <> 'deleted' and btrim(body_html) <> '';
create index editorial_blog_publication on public.editorial_blogs (published_at desc) where status = 'published';

alter table public.editorial_blogs enable row level security;
grant select on public.editorial_blogs to anon, authenticated;
grant insert, update on public.editorial_blogs to authenticated;
create policy editorial_blog_public on public.editorial_blogs for select to anon, authenticated using (status = 'published');
create policy editorial_blog_editor_read on public.editorial_blogs for select to authenticated
  using ((select newsroom_private.is_newsroom_editor()) or (select newsroom_private.is_super_admin()));
create policy editorial_blog_editor_insert on public.editorial_blogs for insert to authenticated
  with check ((select newsroom_private.is_newsroom_editor()) or (select newsroom_private.is_super_admin()));
create policy editorial_blog_editor_update on public.editorial_blogs for update to authenticated
  using (status <> 'deleted' and ((select newsroom_private.is_newsroom_editor()) or (select newsroom_private.is_super_admin())))
  with check ((select newsroom_private.is_newsroom_editor()) or (select newsroom_private.is_super_admin()));

create function newsroom_private.version_editorial_blog() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null and new.slug is distinct from old.slug then
    raise exception 'Keep the published URL slug unchanged';
  end if;
  new.published_at := coalesce(old.published_at,new.published_at);
  new.studio_id := old.studio_id;
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;
create trigger version_editorial_blog before update on public.editorial_blogs
  for each row execute function newsroom_private.version_editorial_blog();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images','blog-images',true,8388608,array['image/jpeg','image/png','image/webp']);
create policy editorial_blog_image_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-images' and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select newsroom_private.is_newsroom_editor()) or (select newsroom_private.is_super_admin())));
