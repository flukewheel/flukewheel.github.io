create function public.delete_website_permanently(
  p_actor_id uuid,
  p_website_id uuid,
  p_confirm_title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_website public.websites%rowtype;
  v_submission_ids uuid[];
  v_bookmarks integer;
  v_history integer;
  v_reactions integer;
  v_submissions integer;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;

  select * into v_website
  from public.websites
  where id = p_website_id and approval_status = 'approved'
  for update;
  if not found then
    raise exception 'website not found' using errcode = 'P0002';
  end if;
  if p_confirm_title is distinct from v_website.title then
    raise exception 'website title confirmation does not match' using errcode = '22023';
  end if;

  select array_agg(id) into v_submission_ids
  from public.website_submissions
  where resolved_website_id = p_website_id
    or normalised_url = v_website.normalised_url;

  delete from public.bookmarks where website_id = p_website_id;
  get diagnostics v_bookmarks = row_count;
  delete from public.bump_history where website_id = p_website_id;
  get diagnostics v_history = row_count;
  delete from public.website_reactions where website_id = p_website_id;
  get diagnostics v_reactions = row_count;
  delete from public.website_categories where website_id = p_website_id;

  delete from private.moderation_events
  where (target_type = 'website' and target_id = p_website_id)
    or (target_type = 'submission' and target_id = any(coalesce(v_submission_ids, '{}'::uuid[])))
    or details->>'website_id' = p_website_id::text;
  delete from public.website_submissions
  where resolved_website_id = p_website_id
    or normalised_url = v_website.normalised_url;
  get diagnostics v_submissions = row_count;

  -- Report reviews, report rate and recheck jobs cascade from websites.
  delete from public.websites where id = p_website_id;

  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'delete', 'website', p_website_id,
    pg_catalog.jsonb_build_object(
      'bookmarks_deleted', v_bookmarks,
      'history_deleted', v_history,
      'reactions_deleted', v_reactions,
      'submissions_deleted', v_submissions
    ));

  return pg_catalog.jsonb_build_object(
    'website_id', p_website_id,
    'bookmarks_deleted', v_bookmarks,
    'history_deleted', v_history,
    'reactions_deleted', v_reactions,
    'submissions_deleted', v_submissions
  );
end;
$$;

revoke all on function public.delete_website_permanently(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_website_permanently(uuid, uuid, text)
  to service_role;
