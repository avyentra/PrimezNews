-- Applicants authenticate their email before submitting. Only approved journalists can file reports.
create table newsroom_private.application_reviewers (
 user_id uuid primary key references auth.users on delete cascade
);
insert into newsroom_private.application_reviewers
select e.user_id from public.newsroom_editors e join auth.users u on u.id=e.user_id
where lower(u.email)='manu.innn@gmail.com' and u.email_confirmed_at is not null;
create function newsroom_private.can_review() returns boolean language sql stable security definer set search_path=''
as $$select exists(select from newsroom_private.application_reviewers where user_id=auth.uid())$$;
revoke all on function newsroom_private.can_review() from public, anon;
grant execute on function newsroom_private.can_review() to authenticated;
create table public.journalist_applications (
 user_id uuid primary key references auth.users on delete cascade,
 name text not null check(length(trim(name)) between 2 and 100),
 district text not null check(length(trim(district)) between 2 and 100),
 email text not null, status text not null default 'pending' check(status in ('pending','approved','declined')),
 submitted_at timestamptz not null default now(), reviewed_at timestamptz
);
create table newsroom_private.journalist_proofs (
 user_id uuid primary key references public.journalist_applications on delete cascade,
 mime text not null, document bytea not null, opened_by uuid references auth.users on delete set null
);
revoke all on newsroom_private.journalist_proofs,newsroom_private.application_reviewers from public,anon,authenticated;
alter table public.journalist_applications enable row level security;
revoke all on public.journalist_applications from public,anon,authenticated;
grant select on public.journalist_applications to authenticated;
create policy application_visibility on public.journalist_applications for select to authenticated
using(user_id=(select auth.uid()) or (select newsroom_private.can_review()));
create function public.submit_journalist_application(full_name text, area text, mime_type text, proof text)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); address text; bytes bytea;
begin
 select email into strict address from auth.users where id=uid and email_confirmed_at is not null;
 if proof is null or length(proof)>1398104 then raise exception 'Use a JPG or PNG under 1 MB'; end if;
 bytes:=decode(proof,'base64');
 if length(bytes) not between 8 and 1048576 or not (
 (mime_type='image/png' and substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex')) or
 (mime_type='image/jpeg' and substring(bytes from 1 for 3)=decode('ffd8ff','hex')))
 then raise exception 'Use a JPG or PNG under 1 MB'; end if;
 insert into public.journalist_applications(user_id,name,district,email) values(uid,trim(full_name),trim(area),address);
 insert into newsroom_private.journalist_proofs values(uid,mime_type,bytes,null);
end $$;
create function public.journalist_reviewer() returns boolean language sql stable security invoker set search_path=''
as $$ select newsroom_private.can_review() $$;
create function public.read_journalist_proof(applicant uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not newsroom_private.can_review() then raise exception 'Administrator required'; end if;
 update newsroom_private.journalist_proofs set opened_by=auth.uid() where user_id=applicant
 returning jsonb_build_object('mime',mime,'data',encode(document,'base64')) into strict result;
 return result;
end $$;
create function public.review_journalist(applicant uuid, decision text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not newsroom_private.can_review() then raise exception 'Administrator required'; end if;
 if decision is null or decision not in ('approved','declined') then raise exception 'Invalid decision'; end if;
 perform 1 from public.journalist_applications where user_id=applicant and status='pending' for update;
 if not found then raise exception 'Application already reviewed or missing'; end if;
 if not exists(select from newsroom_private.journalist_proofs where user_id=applicant and opened_by=auth.uid())
 then raise exception 'Open the document before deciding'; end if;
 update public.journalist_applications set status=decision, reviewed_at=now() where user_id=applicant;
 delete from newsroom_private.journalist_proofs where user_id=applicant;
end $$;
revoke all on function public.submit_journalist_application(text,text,text,text), public.journalist_reviewer(), public.read_journalist_proof(uuid), public.review_journalist(uuid,text) from public,anon;
grant execute on function public.submit_journalist_application(text,text,text,text), public.journalist_reviewer(), public.read_journalist_proof(uuid), public.review_journalist(uuid,text) to authenticated;
create table public.journalist_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.journalist_applications on delete cascade,
 headline text not null check(length(trim(headline)) between 1 and 300), body text not null check(length(trim(body)) between 1 and 16000),
 submitted_at timestamptz not null default now()
);
alter table public.journalist_reports enable row level security;
revoke all on public.journalist_reports from public,anon,authenticated;
grant select, insert(headline,body) on public.journalist_reports to authenticated;
create policy approved_reporters_submit on public.journalist_reports for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select from public.journalist_applications where user_id=auth.uid() and status='approved'));
create policy report_visibility on public.journalist_reports for select to authenticated
using(user_id=(select auth.uid()) or (select newsroom_private.can_review()));
