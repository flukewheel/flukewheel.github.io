-- Bump selections remain written by the trusted Edge Function. Members may
-- record only their own deliberate catalogue and collection visits.
grant insert (user_id, website_id, source, request_id)
  on public.bump_history to authenticated;

create policy bump_history_owner_visit_insert on public.bump_history
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and source in ('card', 'bookmark', 'history')
    and exists (
      select 1 from public.websites w
      where w.id = website_id
        and w.approval_status = 'approved'
        and w.active
    )
  );
