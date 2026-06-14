-- Supabase Storage policies for item image uploads.
-- Run this file in the Supabase SQL Editor after the `item-images` bucket exists.
--
-- The app uploads files to:
--   {user_id}/{YYYY-MM-DD}/{timestamp}-{filename}
--
-- This policy set allows authenticated users to read, upload, update, and
-- delete only objects whose first path segment matches their auth user id.
-- If `item-images` is a public bucket, public URLs can still be used for image
-- rendering, while write/delete access stays restricted by these policies.

drop policy if exists "Item images are selectable by owner"
on storage.objects;

create policy "Item images are selectable by owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Item images are insertable by owner"
on storage.objects;

create policy "Item images are insertable by owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Item images are updatable by owner"
on storage.objects;

create policy "Item images are updatable by owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Item images are deletable by owner"
on storage.objects;

create policy "Item images are deletable by owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
