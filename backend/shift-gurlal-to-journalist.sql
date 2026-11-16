-- Gurlal ID (manu.innn@gmail.com): ADMIN se hata kar approved ਪੱਤਰਕਾਰ banana.
-- Pehle backend/journalist-dashboard.sql chalao, fir ye file. Supabase SQL Editor mein chalao.
-- Iske baad is account se login karne par journalist.html (ਪੱਤਰਕਾਰ ਡੈਸ਼ਬੋਰਡ) khulega.
-- DHYAN: iske baad site par koi admin nahi rahega (Story workspace aur arziyan approve karna band).
begin;

-- 1) Approved ਪੱਤਰਕਾਰ entry (naam/zila baad mein badal sakte ho)
insert into public.journalist_applications (user_id, name, district, email, status, reviewed_at)
select u.id, 'Gurlal', 'Chandigarh', u.email, 'approved', now()
from auth.users u
where lower(u.email) = 'manu.innn@gmail.com'
on conflict (user_id) do update set status = 'approved', reviewed_at = now();

-- 2) Admin / reviewer access hatao
delete from newsroom_private.application_reviewers
where user_id = (select id from auth.users where lower(email) = 'manu.innn@gmail.com');
delete from public.newsroom_editors
where user_id = (select id from auth.users where lower(email) = 'manu.innn@gmail.com');

commit;

-- Check: dono lines dikhni chahiye -> status = approved, is_admin = false
select a.name, a.email, a.status,
       exists(select from public.newsroom_editors e where e.user_id = a.user_id) as is_admin
from public.journalist_applications a
where lower(a.email) = 'manu.innn@gmail.com';

/* ---------- WAPAS ADMIN BANANA HO TO (sirf ye hissa chalao) ----------
insert into public.newsroom_editors (user_id)
  select id from auth.users where lower(email) = 'manu.innn@gmail.com' on conflict do nothing;
insert into newsroom_private.application_reviewers (user_id)
  select id from auth.users where lower(email) = 'manu.innn@gmail.com' on conflict do nothing;
------------------------------------------------------------------------ */
