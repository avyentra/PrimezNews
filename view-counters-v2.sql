-- View counters v2. Run ONCE in Supabase SQL Editor (after article-views.sql + site-visitors.sql; super-admin.sql optional). Safe to run again.
--  * Article views: every page open / refresh of a story = +1 on THAT story only (no more "one per browser").
--  * Every story also gets +5 views automatically every hour, for life (counted from its publish time).
--  * Footer total: +1 on every refresh, every new visit and every re-opened browser; moving from page to page inside the site does not add.
begin;
create table if not exists newsroom_private.article_view_days (day date not null, story_key text not null, total bigint not null default 0, primary key (day, story_key));
create table if not exists newsroom_private.site_view_days (day date primary key, total bigint not null default 0);
revoke all on newsroom_private.article_view_days, newsroom_private.site_view_days from public, anon, authenticated;
alter table newsroom_private.site_visitor_receipts add column if not exists last_seen timestamptz not null default now();

-- Footer total (starts from the unique visitors already counted, then grows with every counted visit)
create table if not exists newsroom_private.site_hits (id boolean primary key default true check (id), total bigint not null default 0);
revoke all on newsroom_private.site_hits from public, anon, authenticated;
insert into newsroom_private.site_hits(id, total)
  select true, count(*) from newsroom_private.site_visitor_receipts on conflict (id) do nothing;

drop function if exists public.site_visitor_count(uuid);
create or replace function public.site_visitor_count(browser_receipt uuid default null, count_hit boolean default false)
returns bigint language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  if browser_receipt is not null then
    insert into newsroom_private.site_visitor_receipts(receipt) values (browser_receipt)
      on conflict (receipt) do update set last_seen = now();
    insert into newsroom_private.site_view_days as v(day, total) values ((now() at time zone 'Asia/Kolkata')::date, 1)
      on conflict (day) do update set total = v.total + 1;
  end if;
  if count_hit then
    insert into newsroom_private.site_hits as h(id, total) values (true, 1)
      on conflict (id) do update set total = h.total + 1 returning total into n;
    return n;
  end if;
  select total into n from newsroom_private.site_hits;
  return coalesce(n, 0);
end $$;
revoke all on function public.site_visitor_count(uuid, boolean) from public;
grant execute on function public.site_visitor_count(uuid, boolean) to anon, authenticated;

-- Story views: a non-null browser_receipt means "this page was just opened" -> +1. Null = only read.
-- Result = real views + 5 per full hour since the story went live (built-in stories count from 18 Nov 2026).
create or replace function public.article_view_count(article_id text, browser_receipt uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare n bigint; since timestamptz;
begin
  if article_id is null or length(article_id) not between 1 and 150 then return null; end if;
  select publish_at into since from public.stories
   where id = article_id and status in ('published', 'scheduled') and publish_at <= now();
  if since is null then
    if article_id not in ('lead','education','politics','sports','culture','faith2','faith3','water','services','safety','farm','learning','health','community') then return null; end if;
    since := timestamptz '2026-11-18 00:00+05:30';
  end if;
  if browser_receipt is not null then
    insert into newsroom_private.article_view_totals as t values (article_id, 1)
      on conflict (story_key) do update set total = t.total + 1;
    insert into newsroom_private.article_view_days as d values ((now() at time zone 'Asia/Kolkata')::date, article_id, 1)
      on conflict (day, story_key) do update set total = d.total + 1;
  end if;
  select total into n from newsroom_private.article_view_totals where story_key = article_id;
  return coalesce(n, 0) + 5 * greatest(0, floor(extract(epoch from (now() - since)) / 3600))::bigint;
end $$;
revoke all on function public.article_view_count(text, uuid) from public;
grant execute on function public.article_view_count(text, uuid) to anon, authenticated;
commit;
-- refresh the API so the new functions are visible right away
notify pgrst, 'reload schema';

select count(*) = 1 as counters_v2_ok from information_schema.routines
 where routine_schema = 'public' and routine_name = 'site_visitor_count';
