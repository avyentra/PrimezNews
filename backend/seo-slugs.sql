-- Stable headline URLs. This adds no public write permission and preserves existing RLS.
alter table public.stories add column if not exists slug text;
create unique index if not exists stories_slug_unique on public.stories(slug);
create or replace function newsroom_private.assign_story_slug()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare source text; candidate text; words text[];
begin
 if TG_OP = 'UPDATE' and OLD.slug is not null then NEW.slug := OLD.slug; return NEW; end if;
 if NEW.status not in ('published','scheduled') then NEW.slug := null; return NEW; end if;
 source := lower(coalesce(nullif(trim(NEW.en),''),NEW.title));
 -- Retain Gurmukhi/Devanagari letters and combining marks, as well as Latin words.
 source := regexp_replace(source, '[^a-z0-9ਁ-੿ँ-ॿ]+', ' ', 'g');
 select array_agg(word order by ord) into words from (
  select word,ord from regexp_split_to_table(trim(source),' +') with ordinality as x(word,ord)
  where word not in ('the','a','an','and','of','in','to','for','with','on','at','ਤੇ','ਦੇ','ਦੀ','ਦਾ','ਵਿੱਚ','ਨੂੰ','ਵੱਲੋਂ','और','के','की','का','में') limit 9
 ) x;
 candidate := trim(both '-' from array_to_string(words,'-'));
 if candidate is null or candidate = '' then candidate := 'punjab-news'; end if;
 -- Keep UTF-8 directory names below filesystem limits, even for a very long word.
 while octet_length(candidate)>180 loop candidate := left(candidate,length(candidate)-1); end loop;
 candidate := rtrim(candidate,'-');
 -- Lock one candidate to avoid concurrent editor publications choosing the same URL.
 perform pg_advisory_xact_lock(hashtextextended(candidate,0));
 if exists(select 1 from public.stories s where s.slug=candidate and s.id<>NEW.id) then
  candidate := candidate || '-' || substr(md5(NEW.id),1,8);
 end if;
 NEW.slug := candidate;
 return NEW;
end $$;
drop trigger if exists story_slug on public.stories;
create trigger story_slug before insert or update on public.stories for each row execute function newsroom_private.assign_story_slug();
update public.stories set slug=null where slug is null and status in ('published','scheduled');
