-- One opaque browser receipt per story. Totals and receipts are never writable through the Data API.
create table newsroom_private.article_view_receipts (
 story_key text not null, receipt uuid not null, primary key(story_key,receipt)
);
create table newsroom_private.article_view_totals (
 story_key text primary key, total bigint not null default 0
);
revoke all on newsroom_private.article_view_receipts,newsroom_private.article_view_totals from public,anon,authenticated;
create function public.article_view_count(article_id text, browser_receipt uuid default null)
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
   return n;
  end if;
 end if;
 select total into n from newsroom_private.article_view_totals where story_key=article_id;
 return coalesce(n,0);
end $$;
revoke all on function public.article_view_count(text,uuid) from public;
grant execute on function public.article_view_count(text,uuid) to anon,authenticated;
