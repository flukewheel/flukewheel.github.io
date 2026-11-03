-- Phase 5 keeps the recommendation surface small and owner-scoped. Phase 6
-- can replace its ranking without changing the browser's card contract.
-- RLS already exposes only approved active rows; these two columns let the
-- invoker-rights function retain an explicit eligibility predicate.
grant select (approval_status, active) on public.websites to authenticated;

create function public.recommend_website_ids(
  p_category_id uuid default null,
  p_limit integer default 6
)
returns table (website_id uuid)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 20 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories c where c.id = p_category_id and c.active
  ) then
    raise exception 'INVALID_CATEGORY' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select
      w.id,
      exists (
        select 1
        from public.website_categories wc
        join public.user_interests ui
          on ui.category_id = wc.category_id and ui.user_id = v_user_id
        where wc.website_id = w.id
      ) as preferred,
      coalesce((
        select wc.category_id
        from public.website_categories wc
        join public.categories c on c.id = wc.category_id and c.active
        where wc.website_id = w.id
        order by wc.category_id
        limit 1
      ), w.id) as group_id,
      md5(w.id::text || v_user_id::text || current_date::text) as sort_key
    from public.websites w
    where w.approval_status = 'approved'
      and w.active
      and (p_category_id is null or exists (
        select 1 from public.website_categories wc
        where wc.website_id = w.id and wc.category_id = p_category_id
      ))
  ), ranked as (
    select
      eligible.id,
      eligible.preferred,
      eligible.sort_key,
      row_number() over (
        partition by eligible.group_id
        order by eligible.preferred desc, eligible.sort_key
      ) as category_position
    from eligible
  )
  select ranked.id
  from ranked
  order by ranked.category_position, ranked.preferred desc, ranked.sort_key
  limit p_limit;
end;
$$;

revoke all on function public.recommend_website_ids(uuid, integer) from public, anon;
grant execute on function public.recommend_website_ids(uuid, integer) to authenticated;
