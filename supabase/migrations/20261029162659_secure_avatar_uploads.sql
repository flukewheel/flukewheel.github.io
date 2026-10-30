-- Only the trusted avatar processor may write images or their profile paths.
revoke insert (avatar_path), update (avatar_path) on public.profiles from authenticated;

drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;
drop policy if exists avatars_owner_read on storage.objects;

-- The processor writes with service_role, so Storage's owner_id is not the
-- member's ID. Read access is scoped by the verified user's path instead.
create policy avatars_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
