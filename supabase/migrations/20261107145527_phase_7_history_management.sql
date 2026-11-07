-- Members can clear only their own discovery history. The existing owner
-- SELECT policy also makes rows visible to a filtered DELETE through PostgREST.
grant delete on public.bump_history to authenticated;

create policy bump_history_owner_delete on public.bump_history
  for delete to authenticated
  using (user_id = (select auth.uid()));
