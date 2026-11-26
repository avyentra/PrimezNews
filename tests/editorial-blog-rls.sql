-- Run as database owner in a disposable database after installing the blog module.
begin;
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000001');
insert into public.newsroom_editors (user_id) values ('10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.editorial_blogs (slug,title,body_html,studio_id)
values ('test-blog','Test blog','<p>Original body</p>','test-studio');
do $$
begin
  begin
    insert into public.editorial_blogs (title,body_html)
    values ('Duplicate body','<div>Original body</div>');
    raise exception 'Expected duplicate body rejection';
  exception when unique_violation then null;
  end;
  begin
    update public.editorial_blogs set status='published',published_at=now() where slug='test-blog';
    raise exception 'Expected incomplete publication rejection';
  exception when check_violation then null;
  end;
end
$$;
reset role;
set local role anon;
do $$ begin
  if exists (select 1 from public.editorial_blogs where slug='test-blog') then
    raise exception 'Anonymous role can read private draft';
  end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    insert into public.editorial_blogs (title) values ('Unauthorized');
    raise exception 'Expected unauthorized insert rejection';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from public.editorial_blogs where slug='test-blog') then
    raise exception 'Unprivileged user can read private draft';
  end if;
end
$$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
update public.editorial_blogs set status='published',published_at=now(), summary='Summary',author='Editor',
cover_url='https://example.org/cover.webp',cover_alt='Cover',seo_title='SEO',seo_description='Description',
claims_reviewed=true where slug='test-blog';
reset role;
set local role anon;
do $$ begin
  if not exists (select 1 from public.editorial_blogs where slug='test-blog' and revision=2) then
    raise exception 'Published blog is missing or revision was not incremented';
  end if;
end $$;
reset role;
set local role authenticated;
update public.editorial_blogs set status='draft' where slug='test-blog';
reset role;
set local role anon;
do $$ begin
  if exists (select 1 from public.editorial_blogs where slug='test-blog') then
    raise exception 'Anonymous role can read unpublished draft';
  end if;
end $$;
rollback;
