-- Auth deletion cascades owner-scoped interactions and profile records. A
-- submission normally keeps its row with submitter_id set null; account
-- deletion instead removes the member's suggestions in the same transaction.
create function private.purge_user_submissions_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.moderation_events e
  where e.target_type = 'submission'
    and e.target_id in (
      select s.id from public.website_submissions s where s.submitter_id = old.id
    );

  delete from public.website_submissions s where s.submitter_id = old.id;
  return old;
end;
$$;

revoke all on function private.purge_user_submissions_before_delete() from public, anon, authenticated;

create trigger purge_user_submissions_before_delete
  before delete on auth.users
  for each row execute function private.purge_user_submissions_before_delete();
