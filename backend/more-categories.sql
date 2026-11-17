-- 16 news categories (7 old + 9 new: Business, Health, Jobs, NRI, Entertainment,
-- National, World, Weather, Technology).
-- Run ONCE in Supabase -> SQL Editor. Safe to run again. Old stories are not changed.
begin;

-- 1) remove the old 7-category rules (whatever name Postgres gave them)
do $$
declare c record;
begin
  for c in select conrelid::regclass as tbl, conname from pg_constraint
           where contype = 'c'
             and conrelid in (select oid from pg_class where relname in ('stories','journalist_reports') and relnamespace = 'public'::regnamespace)
             and pg_get_constraintdef(oid) like '%Agriculture%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

-- 2) stories: 1 to 16 categories, all from the list
alter table public.stories drop constraint if exists stories_categories_allowed;
alter table public.stories add constraint stories_categories_allowed check (
  cardinality(categories) between 1 and 16 and categories <@ array[
    'Agriculture','Education','Politics','Sports','Faith','Crime','Punjab',
    'Business','Health','Jobs','NRI','Entertainment','National','World','Weather','Technology']::text[]);

-- 3) journalist reports (only if backend/journalist-dashboard.sql was run)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'journalist_reports' and column_name = 'category') then
    alter table public.journalist_reports drop constraint if exists journalist_reports_category_allowed;
    alter table public.journalist_reports add constraint journalist_reports_category_allowed check (category in (
      'Punjab','Politics','Agriculture','Education','Sports','Faith','Crime',
      'Business','Health','Jobs','NRI','Entertainment','National','World','Weather','Technology'));
  end if;
end $$;

commit;
