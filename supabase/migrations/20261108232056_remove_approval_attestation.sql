-- Publication is an administrator decision; preview use is not an attestation.
create or replace function public.review_submission(
  p_actor_id uuid,
  p_submission_id uuid,
  p_decision text,
  p_title text,
  p_description text,
  p_category_ids uuid[],
  p_note text
)
returns table (review_status text, website_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_submission public.website_submissions%rowtype;
  v_website_id uuid;
  v_status text;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'invalid review' using errcode = '22023';
  end if;

  select * into v_submission from public.website_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if v_submission.status <> 'pending' then
    if (p_decision = 'approve' and v_submission.status in ('approved', 'duplicate'))
       or (p_decision = 'reject' and v_submission.status = 'rejected') then
      return query select v_submission.status, v_submission.resolved_website_id;
      return;
    end if;
    raise exception 'submission already reviewed' using errcode = '23505';
  end if;

  if p_decision = 'approve' then
    if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
      or char_length(btrim(coalesce(p_description, ''))) not between 1 and 1000
      or coalesce(cardinality(p_category_ids), 0) not between 1 and 8
      or (select count(distinct id) from public.categories
          where id = any(p_category_ids) and active) <> cardinality(p_category_ids)
    then
      raise exception 'complete the title, description, and categories' using errcode = '22023';
    end if;

    insert into public.websites (
      original_url, normalised_url, title, description,
      approval_status, active, embedding_status, approved_at
    ) values (
      v_submission.raw_url, v_submission.normalised_url, btrim(p_title), btrim(p_description),
      'approved', true, 'allowed', now()
    ) on conflict (normalised_url) do nothing
    returning id into v_website_id;

    if v_website_id is null then
      select id into v_website_id from public.websites where normalised_url = v_submission.normalised_url;
      v_status := 'duplicate';
    else
      insert into public.website_categories (website_id, category_id)
      select v_website_id, unnest(p_category_ids);
      v_status := 'approved';
    end if;
  else
    v_status := 'rejected';
  end if;

  update public.website_submissions
  set status = v_status, reviewed_at = now(), reviewed_by = p_actor_id,
    resolved_website_id = v_website_id
  where id = p_submission_id;

  update private.validation_jobs
  set status = 'complete'
  where submission_id = p_submission_id and status = 'pending';

  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, v_status, 'submission', p_submission_id,
    pg_catalog.jsonb_build_object('website_id', v_website_id));

  return query select v_status, v_website_id;
end;
$$;

revoke all on function public.review_submission(uuid, uuid, text, text, text, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.review_submission(uuid, uuid, text, text, text, uuid[], text)
  to service_role;
