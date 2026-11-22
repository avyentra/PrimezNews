create table public.election_areas (
  id text primary key,
  area text not null,
  aliases text[] not null check (cardinality(aliases)>0),
  starts_at timestamptz not null,
  expected_end timestamptz,
  confirmed_end timestamptz check (confirmed_end >= starts_at),
  source_url text not null check (source_url like 'https://%'),
  end_source_url text check (end_source_url like 'https://%'),
  enabled boolean not null default true,
  check (confirmed_end is null or end_source_url is not null)
);
alter table public.election_areas enable row level security;
revoke all on public.election_areas from public, anon, authenticated;
grant select,update(enabled) on public.election_areas to authenticated;
grant select, insert, update on public.election_areas to service_role;
create policy election_admin_read on public.election_areas for select to authenticated using ((select newsroom_private.is_super_admin()));
create policy election_admin_switch on public.election_areas for update to authenticated using ((select newsroom_private.is_super_admin())) with check ((select newsroom_private.is_super_admin()));
