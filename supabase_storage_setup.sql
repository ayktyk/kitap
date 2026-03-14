-- Book cover storage setup for Supabase
-- Run this in Supabase Dashboard -> SQL Editor

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-covers',
  'book-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view book covers" on storage.objects;
create policy "Public can view book covers"
on storage.objects
for select
to public
using (bucket_id = 'book-covers');

drop policy if exists "Authenticated users can upload book covers" on storage.objects;
create policy "Authenticated users can upload book covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Authenticated users can update their own book covers" on storage.objects;
create policy "Authenticated users can update their own book covers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
)
with check (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Authenticated users can delete their own book covers" on storage.objects;
create policy "Authenticated users can delete their own book covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);
