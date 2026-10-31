create function public.admin_catalogue_list(p_actor_id uuid, p_search text default '')
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
  if char_length(p_search) > 100 then
    raise exception 'search too long' using errcode = '22023';
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
    order by w.title, w.id
    limit 50
  ) item;
  return v_items;
end;
$$;

revoke all on function public.admin_catalogue_list(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_catalogue_list(uuid, text) to service_role;

create function public.admin_category_list(p_actor_id uuid)
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
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'name', c.display_name,
    'description', c.description, 'active', c.active, 'display_order', c.display_order
  ) order by c.display_order, c.id), '[]'::jsonb)
  into v_items from public.categories c;
  return v_items;
end;
$$;

revoke all on function public.admin_category_list(uuid) from public, anon, authenticated;
grant execute on function public.admin_category_list(uuid) to service_role;

create function public.manage_website(
  p_actor_id uuid, p_website_id uuid, p_title text, p_description text,
  p_thumbnail_path text, p_category_ids uuid[], p_active boolean,
  p_embedding_status text, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
    or char_length(btrim(coalesce(p_description, ''))) not between 1 and 1000
    or coalesce(cardinality(p_category_ids), 0) not between 1 and 8
    or (select count(distinct id) from public.categories
        where id = any(p_category_ids) and active) <> cardinality(p_category_ids)
    or p_embedding_status not in ('unknown', 'allowed', 'blocked', 'needs_review')
    or char_length(coalesce(p_thumbnail_path, '')) > 512
    or char_length(btrim(coalesce(p_note, ''))) not between 1 and 1000
  then
    raise exception 'invalid catalogue edit' using errcode = '22023';
  end if;

  perform 1 from public.websites where id = p_website_id and approval_status = 'approved' for update;
  if not found then raise exception 'website not found' using errcode = 'P0002'; end if;
  update public.websites
  set title = btrim(p_title), description = btrim(p_description),
    thumbnail_path = nullif(btrim(p_thumbnail_path), ''), active = p_active,
    embedding_status = p_embedding_status,
    last_validated_at = case when p_embedding_status = 'allowed' then now() else last_validated_at end
  where id = p_website_id;
  delete from public.website_categories where website_id = p_website_id;
  insert into public.website_categories (website_id, category_id)
  select p_website_id, unnest(p_category_ids);

  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'edit', 'website', p_website_id,
    pg_catalog.jsonb_build_object('note', p_note, 'active', p_active, 'embedding_status', p_embedding_status));
  return p_website_id;
end;
$$;

revoke all on function public.manage_website(uuid, uuid, text, text, text, uuid[], boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.manage_website(uuid, uuid, text, text, text, uuid[], boolean, text, text)
  to service_role;

create function public.manage_category(
  p_actor_id uuid, p_category_id uuid, p_slug text, p_name text,
  p_description text, p_active boolean, p_display_order integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if char_length(p_slug) not between 2 and 64
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(btrim(coalesce(p_name, ''))) not between 1 and 80
    or char_length(btrim(coalesce(p_description, ''))) not between 1 and 300
    or p_display_order not between -10000 and 10000
  then
    raise exception 'invalid category' using errcode = '22023';
  end if;

  if p_category_id is null then
    insert into public.categories (slug, display_name, description, active, display_order)
    values (p_slug, btrim(p_name), btrim(p_description), p_active, p_display_order)
    returning id into v_id;
  else
    update public.categories
    set slug = p_slug, display_name = btrim(p_name), description = btrim(p_description),
      active = p_active, display_order = p_display_order
    where id = p_category_id returning id into v_id;
    if v_id is null then raise exception 'category not found' using errcode = 'P0002'; end if;
  end if;

  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, case when p_category_id is null then 'create' else 'edit' end,
    'category', v_id, pg_catalog.jsonb_build_object('slug', p_slug, 'active', p_active));
  return v_id;
end;
$$;

revoke all on function public.manage_category(uuid, uuid, text, text, text, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.manage_category(uuid, uuid, text, text, text, boolean, integer)
  to service_role;
