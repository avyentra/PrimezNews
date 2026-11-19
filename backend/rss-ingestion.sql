-- PrimezNews Automated RSS Ingestion Migration (Safe & Non-Breaking)
-- Run once in Supabase SQL Editor. Keeps all existing stories, RLS policies, and triggers intact.
begin;

alter table public.stories add column if not exists external_guid text;
alter table public.stories add column if not exists source_name text;
alter table public.stories add column if not exists source_url text;
alter table public.stories add column if not exists is_automated boolean not null default false;

create unique index if not exists stories_external_guid_unique
  on public.stories(external_guid)
  where external_guid is not null;

create index if not exists stories_is_automated_idx
  on public.stories(is_automated, publish_at desc);

commit;
