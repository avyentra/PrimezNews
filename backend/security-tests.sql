-- Run on a test project after schema.sql. All fixtures are rolled back.
begin;
insert into public.stories(id,title,en,summary,body,categories,category,status,publish_at)
values
 ('test-draft','ड्राफ्ट','Draft','Test','Content',array['Punjab'],'Punjab','draft',null),
 ('test-future','भविष्य','Future','Test','Content',array['Punjab'],'Punjab','scheduled',now()+interval '1 day'),
 ('test-due','प्रकाशित','Due','Test','Content',array['Punjab'],'Punjab','scheduled',now()-interval '1 minute');
set local role anon;
do $$ begin
 if exists(select 1 from public.stories where id in ('test-draft','test-future')) then raise exception 'RLS leaked unpublished content';end if;
 if not exists(select 1 from public.published_stories() where id='test-due') then raise exception 'Due story missing';end if;
 begin
  delete from public.stories where id='test-due';
  raise exception 'Anonymous delete was incorrectly allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ begin
 if public.is_newsroom_editor() then raise exception 'Non-editor gained editor access';end if;
 if exists(select 1 from public.stories where id='test-draft') then raise exception 'Non-editor read draft';end if;
 begin
  insert into public.newsroom_editors(user_id) values ('00000000-0000-0000-0000-000000000001');
  raise exception 'Self-assigned editor access';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
