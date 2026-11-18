-- SUPER ADMIN (owner panel: superadmin.html)
-- Pehle ye files chal chuki honi chahiye: schema.sql, article-views.sql, site-visitors.sql,
-- journalist-applications.sql, journalist-dashboard.sql.
-- Supabase -> SQL Editor mein ye poori file EK BAAR chalao. Dobara chalana safe hai.
-- Aakhri hissa (STEP 2) mein apni owner email daal kar alag se chalao.
begin;

-- 1) Super admins (owner). Sirf SQL Editor se add hote hain, website se nahi.
create table if not exists newsroom_private.super_admins (
  user_id uuid primary key references auth.users on delete cascade
);
revoke all on newsroom_private.super_admins from public, anon, authenticated;

create or replace function newsroom_private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select from newsroom_private.super_admins where user_id = auth.uid());
$$;
revoke all on function newsroom_private.is_super_admin() from public, anon;
grant execute on function newsroom_private.is_super_admin() to authenticated;

create or replace function public.is_super_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select newsroom_private.is_super_admin();
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- 2) Audit log: har badlav ka record (kisne, kya, kab)
create table if not exists newsroom_private.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  detail text not null default ''
);
revoke all on newsroom_private.audit_log from public, anon, authenticated;

create or replace function newsroom_private.audit(act text, det text) returns void
language sql security definer set search_path = '' as $$
  insert into newsroom_private.audit_log(actor, action, detail)
  values (auth.uid(), left(act, 80), left(coalesce(det, ''), 500));
$$;
revoke all on function newsroom_private.audit(text, text) from public, anon, authenticated;

-- 3) Site settings (public ones are read by the website; private ones only by super admin)
create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from public, anon, authenticated;
grant select on public.site_settings to anon, authenticated;
drop policy if exists "Visitors read public settings" on public.site_settings;
create policy "Visitors read public settings" on public.site_settings for select to anon using (is_public);
drop policy if exists "Signed-in read settings" on public.site_settings;
create policy "Signed-in read settings" on public.site_settings for select to authenticated
  using (is_public or (select newsroom_private.is_super_admin()));

create or replace function public.super_admin_save_setting(setting_key text, setting_value jsonb, public_setting boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not newsroom_private.is_super_admin() then raise exception 'Super admin required'; end if;
  if setting_key is null or setting_key !~ '^[a-z_]{2,40}$' then raise exception 'Invalid setting'; end if;
  if setting_value is null or length(setting_value::text) > 4000 then raise exception 'Setting is too large'; end if;
  insert into public.site_settings(key, value, is_public, updated_at)
  values (setting_key, setting_value, coalesce(public_setting, true), now())
  on conflict (key) do update set value = excluded.value, is_public = excluded.is_public, updated_at = now();
  perform newsroom_private.audit('Setting changed', setting_key || ' = ' || left(setting_value::text, 200));
end $$;
revoke all on function public.super_admin_save_setting(text, jsonb, boolean) from public, anon;
grant execute on function public.super_admin_save_setting(text, jsonb, boolean) to authenticated;

-- 4) Earnings ledger (DIPR payments, AdSense, local ads) — only super admin
create table if not exists public.earnings (
  id uuid primary key default gen_random_uuid(),
  earned_on date not null default ((now() at time zone 'Asia/Kolkata')::date),
  source text not null check (source in ('DIPR', 'AdSense', 'Local ad', 'Other')),
  amount numeric(12,2) not null check (amount >= 0 and amount < 100000000),
  note text not null default '' check (length(note) <= 300),
  created_at timestamptz not null default now()
);
alter table public.earnings enable row level security;
revoke all on public.earnings from public, anon, authenticated;
grant select, insert, update, delete on public.earnings to authenticated;
drop policy if exists "Super admin earnings" on public.earnings;
create policy "Super admin earnings" on public.earnings for all to authenticated
  using ((select newsroom_private.is_super_admin())) with check ((select newsroom_private.is_super_admin()));

-- 5) Ad campaigns (DIPR / local clients) — only super admin
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  client text not null check (length(trim(client)) between 2 and 120),
  kind text not null default 'Local' check (kind in ('DIPR', 'Local', 'Other')),
  slots text[] not null default '{}',
  starts_on date not null,
  ends_on date not null,
  amount numeric(12,2) not null default 0 check (amount >= 0 and amount < 100000000),
  note text not null default '' check (length(note) <= 300),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
alter table public.ad_campaigns enable row level security;
revoke all on public.ad_campaigns from public, anon, authenticated;
grant select, insert, update, delete on public.ad_campaigns to authenticated;
drop policy if exists "Super admin campaigns" on public.ad_campaigns;
create policy "Super admin campaigns" on public.ad_campaigns for all to authenticated
  using ((select newsroom_private.is_super_admin())) with check ((select newsroom_private.is_super_admin()));

create or replace function newsroom_private.audit_money() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_table_name = 'earnings' then
    perform newsroom_private.audit('Earning ' || lower(tg_op), r.source || ' ₹' || r.amount || ' on ' || r.earned_on);
  else
    perform newsroom_private.audit('Campaign ' || lower(tg_op), r.client || ' (' || r.kind || ') ₹' || r.amount);
  end if;
  return null;
end $$;
revoke all on function newsroom_private.audit_money() from public, anon, authenticated;
drop trigger if exists audit_earnings on public.earnings;
create trigger audit_earnings after insert or update or delete on public.earnings
  for each row execute function newsroom_private.audit_money();
drop trigger if exists audit_campaigns on public.ad_campaigns;
create trigger audit_campaigns after insert or update or delete on public.ad_campaigns
  for each row execute function newsroom_private.audit_money();

-- 6) Daily article readers (for the Overview charts). Same counting as before, plus one row per day.
create table if not exists newsroom_private.article_view_days (
  day date not null,
  story_key text not null,
  total bigint not null default 0,
  primary key (day, story_key)
);
revoke all on newsroom_private.article_view_days from public, anon, authenticated;

create or replace function public.article_view_count(article_id text, browser_receipt uuid default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare counted int; n bigint;
begin
 if article_id is null or length(article_id) not between 1 and 150 then return null; end if;
 if not exists(select from public.stories where id=article_id and status in ('published','scheduled') and publish_at<=now())
 and article_id not in ('lead','education','politics','sports','culture','faith2','faith3','water','services','safety','farm','learning','health','community') then return null; end if;
 if browser_receipt is not null then
  insert into newsroom_private.article_view_receipts values(article_id,browser_receipt) on conflict do nothing;
  get diagnostics counted = row_count;
  if counted=1 then
   insert into newsroom_private.article_view_totals as t values(article_id,1) on conflict(story_key) do update set total=t.total+1 returning total into n;
   insert into newsroom_private.article_view_days as d values((now() at time zone 'Asia/Kolkata')::date, article_id, 1)
     on conflict(day, story_key) do update set total = d.total + 1;
   return n;
  end if;
 end if;
 select total into n from newsroom_private.article_view_totals where story_key=article_id;
 return coalesce(n,0);
end $$;
revoke all on function public.article_view_count(text,uuid) from public;
grant execute on function public.article_view_count(text,uuid) to anon,authenticated;

-- 6b) Website page views: every page load counts (+1), per day, and "online now" (last 5 minutes).
-- The footer visitor number keeps working exactly as before (same function, same answer).
create table if not exists newsroom_private.site_view_days (
  day date primary key,
  total bigint not null default 0
);
revoke all on newsroom_private.site_view_days from public, anon, authenticated;
alter table newsroom_private.site_visitor_receipts add column if not exists last_seen timestamptz not null default now();
create index if not exists site_visitor_last_seen on newsroom_private.site_visitor_receipts(last_seen);

create or replace function public.site_visitor_count(browser_receipt uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  if browser_receipt is not null then
    insert into newsroom_private.site_visitor_receipts(receipt) values (browser_receipt)
    on conflict (receipt) do update set last_seen = now();
    insert into newsroom_private.site_view_days as v(day, total)
    values ((now() at time zone 'Asia/Kolkata')::date, 1)
    on conflict (day) do update set total = v.total + 1;
  end if;
  select count(*) into n from newsroom_private.site_visitor_receipts;
  return n;
end $$;
revoke all on function public.site_visitor_count(uuid) from public;
grant execute on function public.site_visitor_count(uuid) to anon, authenticated;

-- 7) Overview numbers in one call
create or replace function public.super_admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare today date := (now() at time zone 'Asia/Kolkata')::date; r jsonb;
begin
  if not newsroom_private.is_super_admin() then raise exception 'Super admin required'; end if;
  select jsonb_build_object(
    'today', today,
    'stories', (select jsonb_build_object(
        'published', count(*) filter (where status in ('published','scheduled') and publish_at <= now()),
        'today', count(*) filter (where status in ('published','scheduled') and publish_at <= now()
                                   and (publish_at at time zone 'Asia/Kolkata')::date = today),
        'scheduled', count(*) filter (where status = 'scheduled' and publish_at > now()),
        'drafts', count(*) filter (where status = 'draft'))
      from public.stories),
    'visitors_total', (select count(*) from newsroom_private.site_visitor_receipts),
    'visitors_daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) from (
        select (first_seen at time zone 'Asia/Kolkata')::date d, count(*) n
        from newsroom_private.site_visitor_receipts
        where first_seen >= now() - interval '70 days' group by 1) x),
    'online_now', (select count(*) from newsroom_private.site_visitor_receipts where last_seen >= now() - interval '5 minutes'),
    'pageviews_total', (select coalesce(sum(total), 0) from newsroom_private.site_view_days),
    'pageviews_daily', (select coalesce(jsonb_agg(jsonb_build_object('d', day, 'n', total) order by day), '[]'::jsonb)
        from newsroom_private.site_view_days where day >= today - 70),
    'views_total', (select coalesce(sum(total), 0) from newsroom_private.article_view_totals),
    'views_daily', (select coalesce(jsonb_agg(jsonb_build_object('d', day, 'n', n) order by day), '[]'::jsonb) from (
        select day, sum(total) n from newsroom_private.article_view_days
        where day >= today - 70 group by day) x),
    'top', (select coalesce(jsonb_agg(t order by t.views desc), '[]'::jsonb) from (
        select v.story_key id, v.total views, s.title, s.en, s.district, s.author, s.category
        from newsroom_private.article_view_totals v
        join public.stories s on s.id = v.story_key
        order by v.total desc limit 8) t),
    'districts', (select coalesce(jsonb_agg(t order by t.n desc), '[]'::jsonb) from (
        select district name, count(*) n from public.stories
        where status in ('published','scheduled') and publish_at <= now()
        group by district order by count(*) desc limit 8) t),
    'categories', (select coalesce(jsonb_agg(t order by t.n desc), '[]'::jsonb) from (
        select category name, count(*) n from public.stories
        where status in ('published','scheduled') and publish_at <= now()
        group by category order by count(*) desc limit 8) t),
    'journalists', (select count(*) from public.journalist_applications where status = 'approved'),
    'pending_applications', (select count(*) from public.journalist_applications where status = 'pending'),
    'reports_waiting', (select count(*) from public.journalist_reports where status in ('submitted','in_review'))
  ) into r;
  return r;
end $$;
revoke all on function public.super_admin_overview() from public, anon;
grant execute on function public.super_admin_overview() to authenticated;

-- 8) Team: everyone who has (or asked for) newsroom access
create or replace function public.super_admin_team() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not newsroom_private.is_super_admin() then raise exception 'Super admin required'; end if;
  select coalesce(jsonb_agg(t order by t.rank, t.name), '[]'::jsonb) into r from (
    select u.id, u.email, u.last_sign_in_at, u.created_at,
      coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), a.name, split_part(u.email, '@', 1)) name,
      coalesce(a.district, '') district,
      a.status application,
      case
        when exists(select from newsroom_private.super_admins s where s.user_id = u.id) then 'super'
        when exists(select from public.newsroom_editors e where e.user_id = u.id)
         and exists(select from newsroom_private.application_reviewers v where v.user_id = u.id) then 'admin'
        when exists(select from public.newsroom_editors e where e.user_id = u.id) then 'editor'
        when a.status = 'approved' then 'journalist'
        when a.status = 'pending' then 'pending'
        when a.status = 'declined' then 'blocked'
        else 'none' end role,
      case
        when exists(select from newsroom_private.super_admins s where s.user_id = u.id) then 0
        when exists(select from public.newsroom_editors e where e.user_id = u.id) then 1
        when a.status = 'approved' then 2 when a.status = 'pending' then 3 else 4 end rank,
      (select count(*) from public.journalist_reports r where r.user_id = u.id) reports,
      (select count(*) from public.journalist_reports r where r.user_id = u.id
         and r.submitted_at >= date_trunc('month', now())) reports_month
    from auth.users u
    left join public.journalist_applications a on a.user_id = u.id
    where a.user_id is not null
       or exists(select from public.newsroom_editors e where e.user_id = u.id)
       or exists(select from newsroom_private.application_reviewers v where v.user_id = u.id)
       or exists(select from newsroom_private.super_admins s where s.user_id = u.id)
  ) t;
  return r;
end $$;
revoke all on function public.super_admin_team() from public, anon;
grant execute on function public.super_admin_team() to authenticated;

-- Roles: admin = stories + approve journalists, editor = stories only, journalist = journalist dashboard, blocked = no access
create or replace function public.super_admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare em text; nm text;
begin
  if not newsroom_private.is_super_admin() then raise exception 'Super admin required'; end if;
  if new_role is null or new_role not in ('admin', 'editor', 'journalist', 'blocked') then raise exception 'Invalid role'; end if;
  if target = auth.uid() then raise exception 'You cannot change your own role'; end if;
  if exists(select from newsroom_private.super_admins where user_id = target) then raise exception 'A super admin can only be changed in the SQL Editor'; end if;
  select email, coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''), split_part(email, '@', 1))
    into em, nm from auth.users where id = target;
  if em is null then raise exception 'Account not found'; end if;
  if length(trim(nm)) < 2 then nm := 'Journalist'; end if;

  delete from public.newsroom_editors where user_id = target;
  delete from newsroom_private.application_reviewers where user_id = target;
  if new_role in ('admin', 'editor') then
    insert into public.newsroom_editors(user_id) values (target) on conflict do nothing;
  end if;
  if new_role = 'admin' then
    insert into newsroom_private.application_reviewers(user_id) values (target) on conflict do nothing;
  end if;
  if new_role = 'journalist' then
    insert into public.journalist_applications(user_id, name, district, email, status, reviewed_at)
    values (target, left(nm, 100), 'Punjab', em, 'approved', now())
    on conflict (user_id) do update set status = 'approved', reviewed_at = now();
  elsif new_role = 'blocked' then
    update public.journalist_applications set status = 'declined', reviewed_at = now() where user_id = target;
  end if;
  perform newsroom_private.audit('Role changed', em || ' -> ' || new_role);
end $$;
revoke all on function public.super_admin_set_role(uuid, text) from public, anon;
grant execute on function public.super_admin_set_role(uuid, text) to authenticated;

create or replace function public.super_admin_add_member(member_email text, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not newsroom_private.is_super_admin() then raise exception 'Super admin required'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(member_email));
  if uid is null then
    raise exception 'No account with this email yet. Ask them to apply at join-newsroom, or create the user in Supabase Authentication first.';
  end if;
  perform public.super_admin_set_role(uid, new_role);
end $$;
revoke all on function public.super_admin_add_member(text, text) from public, anon;
grant execute on function public.super_admin_add_member(text, text) to authenticated;

-- 9) Read the audit log (newest first)
create or replace function public.super_admin_audit(max_rows int default 100) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not newsroom_private.is_super_admin() then raise exception 'Super admin required'; end if;
  select coalesce(jsonb_agg(t order by t.at desc), '[]'::jsonb) into r from (
    select l.at, l.action, l.detail, coalesce(u.email, 'system') actor
    from newsroom_private.audit_log l left join auth.users u on u.id = l.actor
    order by l.at desc limit least(greatest(coalesce(max_rows, 100), 1), 500)) t;
  return r;
end $$;
revoke all on function public.super_admin_audit(int) from public, anon;
grant execute on function public.super_admin_audit(int) to authenticated;

commit;

-- ======================== STEP 2 (alag se chalao) ========================
-- Owner (Mangat Singh) ki email neeche daalo. Account pehle Supabase -> Authentication -> Users
-- mein bana hua aur confirmed hona chahiye. Isse owner super admin + newsroom admin dono ban jata hai.
do $$
declare
  owner_email text := 'OWNER_EMAIL_HERE';   -- <-- yahan apni email
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(owner_email) and email_confirmed_at is not null;
  if uid is null then
    raise notice 'Owner account not found (%). Create/confirm it in Authentication -> Users, then run STEP 2 again.', owner_email;
    return;
  end if;
  insert into newsroom_private.super_admins(user_id) values (uid) on conflict do nothing;
  insert into public.newsroom_editors(user_id) values (uid) on conflict do nothing;
  insert into newsroom_private.application_reviewers(user_id) values (uid) on conflict do nothing;
  raise notice 'Super admin ready: %', owner_email;
end $$;

-- Check:
-- select u.email from newsroom_private.super_admins s join auth.users u on u.id = s.user_id;
