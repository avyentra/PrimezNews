-- Animated GIF advertisements (Advertisements page in admin + Super Admin).
-- Supabase -> SQL Editor mein EK BAAR chalao. Dobara chalana safe hai.
-- JPG/PNG/WebP pehle ki tarah browser mein 1 MB se chhote kiye jaate hain;
-- GIF bina badle upload hota hai (taaki animation chalti rahe), max 3 MB.
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'],
       file_size_limit    = 3145728
 where id = 'newsroom-media';

-- Check: allowed_mime_types mein image/gif dikhna chahiye
select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'newsroom-media';
