drop function public.manage_website(uuid, uuid, text, text, text, uuid[], boolean, text, text);

create function public.manage_website(
  p_actor_id uuid, p_website_id uuid, p_original_url text, p_normalised_url text,
  p_title text, p_description text, p_thumbnail_path text, p_category_ids uuid[],
  p_active boolean, p_embedding_status text, p_note text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_previous_url text;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_original_url, ''))) not between 8 and 2048
    or p_original_url !~* '^https?://'
    or char_length(btrim(coalesce(p_normalised_url, ''))) not between 8 and 2048
    or p_normalised_url !~* '^https?://'
    or char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
    or char_length(btrim(coalesce(p_description, ''))) not between 1 and 1000
    or coalesce(cardinality(p_category_ids), 0) not between 1 and 8
    or (select count(distinct id) from public.categories
        where id = any(p_category_ids) and active) <> cardinality(p_category_ids)
    or p_embedding_status not in ('unknown', 'allowed', 'blocked', 'needs_review')
    or char_length(coalesce(p_thumbnail_path, '')) > 512
    or char_length(btrim(coalesce(p_note, ''))) > 1000
  then
    raise exception 'invalid catalogue edit' using errcode = '22023';
  end if;

  select original_url into v_previous_url
  from public.websites where id = p_website_id and approval_status = 'approved' for update;
  if not found then raise exception 'website not found' using errcode = 'P0002'; end if;

  update public.websites
  set original_url = p_original_url, normalised_url = p_normalised_url,
    title = btrim(p_title), description = btrim(p_description),
    thumbnail_path = nullif(btrim(p_thumbnail_path), ''), active = p_active,
    embedding_status = p_embedding_status
  where id = p_website_id;

  delete from public.website_categories where website_id = p_website_id;
  insert into public.website_categories (website_id, category_id)
  select p_website_id, unnest(p_category_ids);

  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'edit', 'website', p_website_id,
    pg_catalog.jsonb_build_object('note', nullif(btrim(p_note), ''),
      'previous_url', v_previous_url, 'original_url', p_original_url,
      'active', p_active, 'embedding_status', p_embedding_status));
  return p_website_id;
end;
$$;

revoke all on function public.manage_website(uuid, uuid, text, text, text, text, text, uuid[], boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.manage_website(uuid, uuid, text, text, text, text, text, uuid[], boolean, text, text)
  to service_role;
