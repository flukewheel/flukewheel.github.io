create function public.admin_catalogue_page(
  p_actor_id uuid,
  p_search text default '',
  p_after_title text default null,
  p_after_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_items jsonb;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if p_search is null or char_length(p_search) > 100
    or (p_after_title is null) <> (p_after_id is null)
    or char_length(coalesce(p_after_title, '')) > 160
  then
    raise exception 'invalid catalogue cursor' using errcode = '22023';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', item.id, 'title', item.title, 'description', item.description,
    'original_url', item.original_url, 'thumbnail_path', item.thumbnail_path,
    'active', item.active, 'embedding_status', item.embedding_status,
    'last_validated_at', item.last_validated_at,
    'category_ids', item.category_ids
  ) order by item.title, item.id), '[]'::jsonb)
  into v_items
  from (
    select w.id, w.title, w.description, w.original_url, w.thumbnail_path,
      w.active, w.embedding_status, w.last_validated_at,
      coalesce((select array_agg(wc.category_id order by wc.category_id)
        from public.website_categories wc where wc.website_id = w.id), '{}'::uuid[]) as category_ids
    from public.websites w
    where w.approval_status = 'approved'
      and (p_search = '' or w.title ilike '%' || p_search || '%'
        or w.original_url ilike '%' || p_search || '%')
      and (p_after_title is null or (w.title, w.id) > (p_after_title, p_after_id))
    order by w.title, w.id
    limit 50
  ) item;
  return v_items;
end;
$$;

revoke all on function public.admin_catalogue_page(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_catalogue_page(uuid, text, text, uuid)
  to service_role;
