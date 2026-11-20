-- Priority label (high / low) for automatic RSS drafts, shown to the admin in the dashboard draft list.
-- Run once in Supabase -> SQL Editor. Safe to run again.
alter table public.stories add column if not exists priority text;
alter table public.stories drop constraint if exists stories_priority_check;
alter table public.stories add constraint stories_priority_check check (priority is null or priority in ('high','low'));
