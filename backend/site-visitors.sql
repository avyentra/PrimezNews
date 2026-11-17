-- Total website visitors for the footer ("ਕੁੱਲ ਵਿਜ਼ਿਟਰ").
-- Run once in Supabase → SQL Editor. Safe to run again.
-- Each browser is counted once (a random id kept in the visitor's browser; no personal data).
begin;
create table if not exists newsroom_private.site_visitor_receipts (
  receipt uuid primary key,
  first_seen timestamptz not null default now()
);
revoke all on newsroom_private.site_visitor_receipts from public, anon, authenticated;

create or replace function public.site_visitor_count(browser_receipt uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  if browser_receipt is not null then
    insert into newsroom_private.site_visitor_receipts(receipt) values (browser_receipt)
    on conflict do nothing;
  end if;
  select count(*) into n from newsroom_private.site_visitor_receipts;
  return n;
end $$;
revoke all on function public.site_visitor_count(uuid) from public;
grant execute on function public.site_visitor_count(uuid) to anon, authenticated;
commit;
