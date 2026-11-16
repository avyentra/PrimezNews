-- Journalist dashboard: edit own news after posting, upload a photo, track status.
-- Run ONCE in the Supabase SQL Editor (after schema.sql and journalist-applications.sql).
begin;

-- 1) New columns on reports
alter table public.journalist_reports
  add column if not exists category text not null default 'Punjab'
    check (category in ('Punjab','Politics','Agriculture','Education','Sports','Faith','Crime')),
  add column if not exists district text not null default '' check (length(district) <= 100),
  add column if not exists image text not null default ''
    check (image = '' or image like 'https://%/storage/v1/object/public/journalist-media/%'),
  add column if not exists status text not null default 'submitted'
    check (status in ('submitted','in_review','approved','published','returned')),
  add column if not exists editor_note text not null default '' check (length(editor_note) <= 1000),
  add column if not exists updated_at timestamptz not null default now();

-- 2) Helper: is the signed-in user an approved journalist?
create or replace function newsroom_private.is_approved_journalist() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select from public.journalist_applications where user_id = auth.uid() and status = 'approved');
$$;
revoke all on function newsroom_private.is_approved_journalist() from public, anon;
grant execute on function newsroom_private.is_approved_journalist() to authenticated;

-- 3) Journalists may insert/edit only these columns of their OWN reports (never status/editor_note)
revoke insert, update on public.journalist_reports from authenticated;
grant insert (headline, body, category, district, image) on public.journalist_reports to authenticated;
grant update (headline, body, category, district, image) on public.journalist_reports to authenticated;
drop policy if exists own_reports_update on public.journalist_reports;
create policy own_reports_update on public.journalist_reports for update to authenticated
  using (user_id = (select auth.uid()) and (select newsroom_private.is_approved_journalist()))
  with check (user_id = (select auth.uid()));
drop policy if exists editors_see_reports on public.journalist_reports;
create policy editors_see_reports on public.journalist_reports for select to authenticated
  using ((select newsroom_private.is_newsroom_editor()));

-- 4) When the journalist edits a report, it goes back to the desk for review
create or replace function newsroom_private.report_edited() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at = now();
  if new.user_id = auth.uid()
     and (new.headline, new.body, new.category, new.district, new.image)
         is distinct from (old.headline, old.body, old.category, old.district, old.image) then
    new.status = 'submitted';
    new.editor_note = '';
  end if;
  return new;
end $$;
drop trigger if exists report_edited on public.journalist_reports;
create trigger report_edited before update on public.journalist_reports
  for each row execute function newsroom_private.report_edited();

-- 5) Desk / chief editor moves a report: submitted -> in_review -> approved -> published (or returned with a note)
create or replace function public.set_report_status(report uuid, new_status text, note text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (newsroom_private.can_review() or newsroom_private.is_newsroom_editor()) then
    raise exception 'Editor required';
  end if;
  if new_status is null or new_status not in ('submitted','in_review','approved','published','returned') then
    raise exception 'Invalid status';
  end if;
  update public.journalist_reports
     set status = new_status, editor_note = left(coalesce(note, ''), 1000), updated_at = now()
   where id = report;
  if not found then raise exception 'Report not found'; end if;
end $$;
revoke all on function public.set_report_status(uuid, text, text) from public, anon;
grant execute on function public.set_report_status(uuid, text, text) to authenticated;

-- 6) Photo storage: public news photos, each journalist writes only in their own folder, max 1 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journalist-media', 'journalist-media', true, 1000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "Journalist uploads own media" on storage.objects;
create policy "Journalist uploads own media" on storage.objects for insert to authenticated
  with check (bucket_id = 'journalist-media' and (select newsroom_private.is_approved_journalist())
              and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Journalist removes own media" on storage.objects;
create policy "Journalist removes own media" on storage.objects for delete to authenticated
  using (bucket_id = 'journalist-media' and owner_id = (select auth.uid())::text);

commit;
