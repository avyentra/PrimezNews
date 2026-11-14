-- English/Roman alphabet URLs for English, Hindi and Punjabi headlines.
-- Existing native-script slugs are kept as aliases; no old published link is discarded.
alter table public.stories add column if not exists slug_aliases text[] not null default '{}';
create or replace function newsroom_private.roman_headline(input text)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare letters jsonb := '{"ਕ": "ka", "ਖ": "kha", "ਗ": "ga", "ਘ": "gha", "ਙ": "nga", "ਚ": "cha", "ਛ": "chha", "ਜ": "ja", "ਝ": "jha", "ਞ": "nya", "ਟ": "ta", "ਠ": "tha", "ਡ": "da", "ਢ": "dha", "ਣ": "na", "ਤ": "ta", "ਥ": "tha", "ਦ": "da", "ਧ": "dha", "ਨ": "na", "ਪ": "pa", "ਫ": "pha", "ਬ": "ba", "ਭ": "bha", "ਮ": "ma", "ਯ": "ya", "ਰ": "ra", "ਲ": "la", "ਵ": "va", "ਸ਼": "sha", "ਸ": "sa", "ਹ": "ha", "ੜ": "ra", "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "nga", "च": "cha", "छ": "chha", "ज": "ja", "झ": "jha", "ञ": "nya", "ट": "ta", "ठ": "tha", "ड": "da", "ढ": "dha", "ण": "na", "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na", "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma", "य": "ya", "र": "ra", "ल": "la", "व": "va", "श": "sha", "ष": "sha", "स": "sa", "ह": "ha", "ਅ": "a", "ਆ": "aa", "ਇ": "i", "ਈ": "ee", "ਉ": "u", "ਊ": "oo", "ਏ": "e", "ਐ": "ai", "ਓ": "o", "ਔ": "au", "ਅੰ": "an", "ਅਃ": "ah", "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au"}'::jsonb; marks jsonb := '{"ਾ": "aa", "ਿ": "i", "ੀ": "ee", "ੁ": "u", "ੂ": "oo", "ੇ": "e", "ੈ": "ai", "ੋ": "o", "ੌ": "au", "ਂ": "n", "ੰ": "n", "ਃ": "h", "ਁ": "n", "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ँ": "n", "ः": "h"}'::jsonb; vocabulary jsonb := '{"ਯੁੱਧ": "war", "ਨਸ਼ਿਆਂ": "drugs", "ਨਸ਼ਿਆਂ": "drugs", "ਵਿਰੁੱਧ": "against", "ਸਿਵਲ": "civil", "ਪੁਲਿਸ": "police", "ਟੀਮਾਂ": "teams", "ਹੌਟਸਪੌਟ": "hotspot", "ਪਿੰਡਾਂ": "villages", "ਲਗਾਤਾਰ": "continuous", "ਨਿਗਰਾਨੀ": "monitoring", "ਪੰਜਾਬ": "punjab", "ਸਰਕਾਰ": "government", "ਨੌਜਵਾਨ": "youth", "ਸੜਕ": "road", "ਹਾਦਸਾ": "accident", "ਮੌਤ": "death", "ਨੌਕਰੀਆਂ": "jobs", "ਸਿੱਖਿਆ": "education", "ਖੇਤੀਬਾੜੀ": "agriculture", "ਪਾਣੀ": "water", "ਕਿਸਾਨ": "farmers", "ਬਠਿੰਡਾ": "bathinda", "ਚੰਡੀਗੜ੍ਹ": "chandigarh", "ਭਾਰਤ": "india", "ਸਕੂਲ": "school", "ਅਧਿਆਪਕ": "teachers", "ਪੰਜਾਬੀ": "punjabi", "ਖੇਡਾਂ": "sports", "पंजाब": "punjab", "सरकार": "government", "पुलिस": "police", "युवा": "youth", "सड़क": "road", "हादसे": "accident", "मौत": "death", "किसान": "farmers", "शिक्षा": "education", "स्कूल": "school", "भारत": "india", "नौकरियां": "jobs", "नशा": "drugs", "विरोध": "protest"}'::jsonb;
 word text; ch text; token text; val text; output text[] := '{}'; i int;
begin
 for word in select regexp_split_to_table(lower(trim(input)), '[^a-z0-9ਁ-੿ँ-ॿ]+') loop
  if word='' or word in ('the','a','an','and','of','in','to','for','with','on','at','ਤੇ','ਦੇ','ਦੀ','ਦਾ','ਵਿੱਚ','ਨੂੰ','ਵੱਲੋਂ','और','के','की','का','में') then continue; end if;
  token := vocabulary->>word;
  if token is null then
   token := '';
   for i in 1..length(word) loop
    ch := substr(word,i,1);
    if ch in ('੍','्') then token := regexp_replace(token,'a$','');
    elsif ch in ('਼','़','ੱ','਽','ऽ') then continue;
    elsif marks ? ch then
     val:=marks->>ch;
     if ch not in ('ਂ','ੰ','ਃ','ਁ','ं','ँ','ः') then token:=regexp_replace(token,'a$',''); end if;
     token:=token||val;
    elsif letters ? ch then token:=token||(letters->>ch);
    elsif ch ~ '[a-z0-9]' then token:=token||ch;
    end if;
   end loop;
   if word ~ '[ਁ-੿ँ-ॿ]' and length(token)>2 then token:=regexp_replace(token,'a$',''); end if;
  end if;
  token:=regexp_replace(token,'[^a-z0-9]','','g');
  if token<>'' and token<>'against' and not token=any(output) then output:=array_append(output,token); end if;
  exit when cardinality(output)>=9;
 end loop;
 token:=array_to_string(output,'-');
 while length(token)>100 and token like '%-%' loop token:=regexp_replace(token,'-[^-]+$',''); end loop;
 return coalesce(nullif(left(token,100),''),'punjab-news');
end $$;
create or replace function newsroom_private.assign_story_slug()
returns trigger language plpgsql security invoker set search_path='' as $$
declare candidate text;
begin
 if TG_OP='UPDATE' and OLD.slug is not null and OLD.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
  NEW.slug:=OLD.slug; NEW.slug_aliases:=OLD.slug_aliases; return NEW;
 end if;
 if NEW.status not in ('published','scheduled') then NEW.slug:=null; return NEW; end if;
 candidate:=newsroom_private.roman_headline(coalesce(nullif(trim(NEW.en),''),NEW.title));
 perform pg_advisory_xact_lock(hashtextextended(candidate,0));
 if exists(select 1 from public.stories s where s.slug=candidate and s.id<>NEW.id) then candidate:=candidate||'-'||substr(md5(NEW.id),1,8); end if;
 if TG_OP='UPDATE' and OLD.slug is not null and OLD.slug<>candidate then NEW.slug_aliases:=array_append(OLD.slug_aliases,OLD.slug); end if;
 NEW.slug:=candidate; return NEW;
end $$;
update public.stories set slug=slug where slug is not null and slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
