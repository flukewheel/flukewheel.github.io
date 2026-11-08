-- Bound expensive catalogue selection at the RPC boundary. A shared guest
-- allowance is intentional until the hosting platform's trusted IP contract
-- is verified; client-supplied forwarding headers are never identity.
create table private.discovery_request_windows (
  scope text not null check (scope in ('bump', 'recommend')),
  actor_key text not null,
  minute_bucket bigint not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, actor_key)
);
alter table private.discovery_request_windows enable row level security;
revoke all on private.discovery_request_windows from public, anon, authenticated;

create function public.consume_discovery_quota(p_scope text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_key text;
  v_limit integer;
  v_bucket bigint := floor(extract(epoch from clock_timestamp()) / 60)::bigint;
  v_count integer;
begin
  if p_scope = 'bump' then
    -- Guest requests share a global cap because the database has no verified
    -- guest identity. Member identity comes from the verified JWT.
    v_actor_key := coalesce(v_user_id::text, 'guest:shared');
    v_limit := case when v_user_id is null then 600 else 60 end;
  elsif p_scope = 'recommend' and v_user_id is not null then
    v_actor_key := v_user_id::text;
    v_limit := 90;
  else
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  insert into private.discovery_request_windows as w
    (scope, actor_key, minute_bucket, request_count)
  values (p_scope, v_actor_key, v_bucket, 1)
  on conflict (scope, actor_key) do update
    set minute_bucket = excluded.minute_bucket,
        request_count = case when w.minute_bucket = excluded.minute_bucket
          then w.request_count + 1 else 1 end
    where w.minute_bucket <> excluded.minute_bucket or w.request_count < v_limit
  returning request_count into v_count;

  if v_count is null then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.consume_discovery_quota(text) from public, anon, authenticated;
grant execute on function public.consume_discovery_quota(text) to anon, authenticated;

select cron.schedule('flukewheel-discovery-quota-cleanup', '17 4 * * *',
  $$delete from private.discovery_request_windows
    where minute_bucket < floor(extract(epoch from clock_timestamp()) / 60)::bigint - 2880$$);


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
begin
  if p_request_id is null or p_seed is null or p_seed < 0 or p_seed >= 1
    or p_recent_ids is null or cardinality(p_recent_ids) > 20 then
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

  return query
  with sampled as (
    select w.id, w.discovery_key from public.websites w
    where w.approval_status = 'approved' and w.active
      and w.embedding_status = 'allowed' and w.discovery_key >= p_seed
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


-- Keep the Phase 5 card contract while sharing Phase 6 eligibility and using
-- bounded signals from preferences, reactions, bookmarks and recent history.
create or replace function public.recommend_website_ids(
  p_category_id uuid default null,
  p_limit integer default 6
)
returns table (website_id uuid)
language plpgsql
volatile
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

  perform public.consume_discovery_quota('recommend');

  return query
  with recent as (
    select h.website_id from public.bump_history h
    where h.user_id = v_user_id
    order by h.discovered_at desc, h.id desc limit 20
  ), category_signals as (
    select wc.category_id,
      greatest(-3, least(3, sum(case
        when r.reaction = 'love' then 1
        when r.reason = 'not_interested' then -2
        when r.reaction = 'dislike' then -1
        else 0 end))) as score
    from public.website_reactions r
    join public.website_categories wc on wc.website_id = r.website_id
    where r.user_id = v_user_id
    group by wc.category_id
  ), bookmark_signals as (
    select wc.category_id, least(2, count(*)) as score
    from public.bookmarks b
    join public.website_categories wc on wc.website_id = b.website_id
    where b.user_id = v_user_id
    group by wc.category_id
  ), eligible as (
    select w.id,
      coalesce((
        select wc.category_id from public.website_categories wc
        join public.categories c on c.id = wc.category_id and c.active
        where wc.website_id = w.id order by wc.category_id limit 1
      ), w.id) as group_id,
      (case when exists (
        select 1 from public.website_categories wc
        join public.user_interests ui on ui.category_id = wc.category_id
        where wc.website_id = w.id and ui.user_id = v_user_id
      ) then 3 else 0 end
      + coalesce((select max(cs.score) from public.website_categories wc
        join category_signals cs on cs.category_id = wc.category_id
        where wc.website_id = w.id), 0)
      + coalesce((select max(bs.score) from public.website_categories wc
        join bookmark_signals bs on bs.category_id = wc.category_id
        where wc.website_id = w.id), 0)
      - case when exists (select 1 from recent r where r.website_id = w.id) then 4 else 0 end
      ) as score,
      md5(w.id::text || v_user_id::text || current_date::text) as sort_key
    from public.websites w
    where w.approval_status = 'approved' and w.active and w.embedding_status = 'allowed'
      and w.original_url !~* '^https?://flukewheel\.github\.io(?::[0-9]+)?(/|$)'
      and (p_category_id is null or exists (
        select 1 from public.website_categories wc
        where wc.website_id = w.id and wc.category_id = p_category_id
      ))
  ), ranked as (
    select e.id, e.score, e.sort_key,
      row_number() over (partition by e.group_id order by e.score desc, e.sort_key) as category_position
    from eligible e
  )
  select r.id from ranked r
  order by r.category_position, r.score desc, r.sort_key
  limit p_limit;
end;
$$;
