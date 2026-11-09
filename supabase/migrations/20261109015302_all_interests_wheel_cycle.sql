-- The All interests Wheel excludes every site seen in this browser session until all currently eligible sites have appeared.
create or replace function public.select_bump_website(
  p_category_id uuid,
  p_recent_ids uuid[],
  p_current_id uuid,
  p_request_id uuid,
  p_seed double precision
)
returns table (website_id uuid, exclusions_relaxed boolean)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_history uuid[] := '{}';
  v_cycle_complete boolean := false;
begin
  if p_request_id is null or p_seed is null or p_seed < 0 or p_seed >= 1
    or p_recent_ids is null or cardinality(p_recent_ids) > 5000 then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories c where c.id = p_category_id and c.active
  ) then
    raise exception 'INVALID_CATEGORY' using errcode = '22023';
  end if;

  perform public.consume_discovery_quota('bump');

  if (select auth.uid()) is not null then
    select coalesce(array_agg(id), '{}') into v_history
    from (
      select h.website_id as id from public.bump_history h
      where h.user_id = (select auth.uid())
      order by h.discovered_at desc, h.id desc limit 20
    ) recent;
  end if;

  if p_category_id is null then
    select not exists (
      select 1 from public.websites w
      where w.approval_status = 'approved' and w.active
        and w.embedding_status = 'allowed'
        and w.original_url !~* '^https?://flukewheel\.github\.io(?::[0-9]+)?(/|$)'
        and not (w.id = any(p_recent_ids))
    ) into v_cycle_complete;
  end if;

  return query
  with sampled as (
    select w.id, w.discovery_key from public.websites w
    where w.approval_status = 'approved' and w.active
      and w.embedding_status = 'allowed' and w.discovery_key >= p_seed
      and (p_category_id is not null or v_cycle_complete or not (w.id = any(p_recent_ids)))
      and w.original_url !~* '^https?://flukewheel\.github\.io(?::[0-9]+)?(/|$)'
      and (p_category_id is null or exists (
        select 1 from public.website_categories wc
        where wc.website_id = w.id and wc.category_id = p_category_id
      ))
    order by w.discovery_key, w.id limit 128
  ), wrapped as (
    select w.id, w.discovery_key from public.websites w
    where w.approval_status = 'approved' and w.active
      and w.embedding_status = 'allowed' and w.discovery_key < p_seed
      and (p_category_id is not null or v_cycle_complete or not (w.id = any(p_recent_ids)))
      and w.original_url !~* '^https?://flukewheel\.github\.io(?::[0-9]+)?(/|$)'
      and (p_category_id is null or exists (
        select 1 from public.website_categories wc
        where wc.website_id = w.id and wc.category_id = p_category_id
      ))
    order by w.discovery_key, w.id limit 128
  ), candidates as (
    select sampled.id from sampled union all select wrapped.id from wrapped
  ), ranked as (
    select c.id,
      case
        when c.id is distinct from p_current_id
          and not (c.id = any(p_recent_ids)) and not (c.id = any(v_history)) then 0
        when c.id is distinct from p_current_id
          and not (c.id = any(coalesce(p_recent_ids[greatest(1, cardinality(p_recent_ids) - 4):], '{}'))) then 1
        when c.id is distinct from p_current_id then 2
        else 3
      end as tier,
      (case when exists (
        select 1 from public.website_categories wc
        join public.user_interests ui on ui.category_id = wc.category_id
        where wc.website_id = c.id and ui.user_id = (select auth.uid())
      ) then 2 else 0 end
      + coalesce((
        select greatest(-3, least(3, sum(case
          when r.reaction = 'love' then 1
          when r.reason = 'not_interested' then -2
          when r.reaction = 'dislike' then -1
          else 0 end)))
        from public.website_categories target
        join public.website_categories past on past.category_id = target.category_id
        join public.website_reactions r on r.website_id = past.website_id
          and r.user_id = (select auth.uid())
        where target.website_id = c.id
      ), 0)
      + coalesce((
        select least(2, count(*))
        from public.website_categories target
        join public.website_categories past on past.category_id = target.category_id
        join public.bookmarks b on b.website_id = past.website_id
          and b.user_id = (select auth.uid())
        where target.website_id = c.id
      ), 0)) as affinity
    from candidates c
  )
  select r.id, r.tier > 0
  from ranked r
  order by r.tier, (case when p_seed < 0.75 then r.affinity else 0 end) desc,
    md5(r.id::text || p_request_id::text)
  limit 1;
end;
$$;
