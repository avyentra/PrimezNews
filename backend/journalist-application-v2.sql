-- Join-the-newsroom v2: photo, mobile, Aadhaar (number + front/back), optional press proof, editor note on decision.
-- Run ONCE in the Supabase SQL Editor, after journalist-applications.sql (and super-admin.sql if you use it).
-- Safe to run again. Everything private lives in schema newsroom_private (never exposed to the website API).

-- 1) What the applicant and reviewers may see (RLS already limits rows to the owner + reviewers)
alter table public.journalist_applications add column if not exists mobile text;
alter table public.journalist_applications add column if not exists aadhaar_last4 text;
alter table public.journalist_applications add column if not exists decision_note text not null default '';

-- 2) Private storage: photos, Aadhaar images and the Aadhaar number. Deleted when the decision is made.
create table if not exists newsroom_private.journalist_docs (
  user_id uuid not null references public.journalist_applications on delete cascade,
  kind text not null check (kind in ('photo', 'aadhaar_front', 'aadhaar_back')),
  mime text not null, document bytea not null,
  primary key (user_id, kind)
);
create table if not exists newsroom_private.journalist_identity (
  user_id uuid primary key references public.journalist_applications on delete cascade,
  aadhaar text not null
);
create table if not exists newsroom_private.application_opened (
  user_id uuid primary key references public.journalist_applications on delete cascade,
  opened_by uuid references auth.users on delete set null
);
revoke all on newsroom_private.journalist_docs, newsroom_private.journalist_identity, newsroom_private.application_opened
  from public, anon, authenticated;

-- 3) Image check used by the submit function: JPG, PNG or WebP, 8 bytes to 1 MB
create or replace function newsroom_private.image_ok(mime text, bytes bytea) returns boolean
language sql immutable set search_path = '' as $$
  select bytes is not null and length(bytes) between 8 and 1048576 and (
    (mime = 'image/png'  and substring(bytes from 1 for 8) = decode('89504e470d0a1a0a', 'hex')) or
    (mime = 'image/jpeg' and substring(bytes from 1 for 3) = decode('ffd8ff', 'hex')) or
    (mime = 'image/webp' and substring(bytes from 1 for 4) = decode('52494646', 'hex')
                         and substring(bytes from 9 for 4) = decode('57454250', 'hex')))
$$;

-- 4) Submit (replaces the old 4-argument version). A declined applicant may apply again.
drop function if exists public.submit_journalist_application(text, text, text, text);
create or replace function public.submit_journalist_application(full_name text, area text, mobile text, aadhaar text, docs jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); address text; k text; spec jsonb; bytes bytea;
  phone text := regexp_replace(coalesce(mobile, ''), '\D', '', 'g');
  uidai text := regexp_replace(coalesce(aadhaar, ''), '\D', '', 'g');
begin
  select email into strict address from auth.users where id = uid and email_confirmed_at is not null;
  if length(trim(coalesce(full_name, ''))) not between 2 and 100 then raise exception 'Enter your full name'; end if;
  if length(trim(coalesce(area, ''))) not between 2 and 100 then raise exception 'Choose your district'; end if;
  if length(phone) = 12 and phone like '91%' then phone := substring(phone from 3); end if;
  if phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number'; end if;
  if uidai !~ '^[2-9][0-9]{11}$' then raise exception 'Enter a valid 12-digit Aadhaar number'; end if;
  if docs is null or jsonb_typeof(docs) <> 'object' then raise exception 'Add your photo and both sides of your Aadhaar card'; end if;
  foreach k in array array['photo', 'aadhaar_front', 'aadhaar_back'] loop
    if not docs ? k then raise exception 'Add your photo and both sides of your Aadhaar card'; end if;
  end loop;
  delete from public.journalist_applications where user_id = uid and status = 'declined';
  if exists (select from public.journalist_applications where user_id = uid) then
    raise exception 'You have already applied';
  end if;
  insert into public.journalist_applications(user_id, name, district, email, mobile, aadhaar_last4)
    values (uid, trim(full_name), trim(area), address, phone, right(uidai, 4));
  insert into newsroom_private.journalist_identity values (uid, uidai);
  foreach k in array array['photo', 'aadhaar_front', 'aadhaar_back', 'proof'] loop
    spec := docs -> k;
    continue when spec is null or jsonb_typeof(spec) <> 'object';
    if length(coalesce(spec ->> 'data', '')) > 1398104 then raise exception 'Each photo must be under 1 MB'; end if;
    bytes := decode(coalesce(spec ->> 'data', ''), 'base64');
    if not newsroom_private.image_ok(spec ->> 'mime', bytes) then
      raise exception 'Use a JPG, PNG or WebP photo under 1 MB';
    end if;
    if k = 'proof' then
      insert into newsroom_private.journalist_proofs values (uid, spec ->> 'mime', bytes, null);
    else
      insert into newsroom_private.journalist_docs values (uid, k, spec ->> 'mime', bytes);
    end if;
  end loop;
end $$;

-- 5) The applicant can take back a pending application (to fix it and send again)
create or replace function public.withdraw_journalist_application() returns void
language sql security definer set search_path = '' as $$
  delete from public.journalist_applications where user_id = auth.uid() and status = 'pending'
$$;

-- 6) Reviewer opens everything in one call (marks it opened, as the old proof function did)
create or replace function public.read_journalist_docs(applicant uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  if not newsroom_private.can_review() then raise exception 'Administrator required'; end if;
  perform 1 from public.journalist_applications where user_id = applicant;
  if not found then raise exception 'Application not found'; end if;
  insert into newsroom_private.application_opened values (applicant, auth.uid())
    on conflict (user_id) do update set opened_by = excluded.opened_by;
  update newsroom_private.journalist_proofs set opened_by = auth.uid() where user_id = applicant;
  select jsonb_build_object(
    'mobile', (select a.mobile from public.journalist_applications a where a.user_id = applicant),
    'aadhaar', (select i.aadhaar from newsroom_private.journalist_identity i where i.user_id = applicant),
    'docs', coalesce((
      select jsonb_object_agg(d.kind, jsonb_build_object('mime', d.mime, 'data', encode(d.document, 'base64')))
      from (
        select kind, mime, document from newsroom_private.journalist_docs where user_id = applicant
        union all
        select 'proof', mime, document from newsroom_private.journalist_proofs where user_id = applicant
      ) d), '{}'::jsonb)) into res;
  return res;
end $$;

-- 7) Decision with an optional note the applicant will see. Private files are deleted right after.
drop function if exists public.review_journalist(uuid, text);
create or replace function public.review_journalist(applicant uuid, decision text, note text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not newsroom_private.can_review() then raise exception 'Administrator required'; end if;
  if decision is null or decision not in ('approved', 'declined') then raise exception 'Invalid decision'; end if;
  perform 1 from public.journalist_applications where user_id = applicant and status = 'pending' for update;
  if not found then raise exception 'Application already reviewed or missing'; end if;
  if not (
    exists (select from newsroom_private.application_opened where user_id = applicant and opened_by = auth.uid())
    or exists (select from newsroom_private.journalist_proofs where user_id = applicant and opened_by = auth.uid())
  ) then raise exception 'Open the documents before deciding'; end if;
  update public.journalist_applications
     set status = decision, reviewed_at = now(), aadhaar_last4 = null, decision_note = left(trim(coalesce(note, '')), 500)
   where user_id = applicant;
  delete from newsroom_private.journalist_docs where user_id = applicant;
  delete from newsroom_private.journalist_identity where user_id = applicant;
  delete from newsroom_private.application_opened where user_id = applicant;
  delete from newsroom_private.journalist_proofs where user_id = applicant;
end $$;

revoke all on function public.submit_journalist_application(text, text, text, text, jsonb),
  public.withdraw_journalist_application(), public.read_journalist_docs(uuid), public.review_journalist(uuid, text, text)
  from public, anon;
grant execute on function public.submit_journalist_application(text, text, text, text, jsonb),
  public.withdraw_journalist_application(), public.read_journalist_docs(uuid), public.review_journalist(uuid, text, text)
  to authenticated;
revoke all on function newsroom_private.image_ok(text, bytea) from public, anon, authenticated;

-- refresh the API so the new functions are visible right away
notify pgrst, 'reload schema';

-- check: should return true
select count(*) = 3 as join_v2_ok from information_schema.columns
 where table_schema = 'public' and table_name = 'journalist_applications'
   and column_name in ('mobile', 'aadhaar_last4', 'decision_note');
