-- Keep the Phase 5 card contract while sharing Phase 6 eligibility and using
-- bounded signals from preferences, reactions, bookmarks and recent history.
create or replace function public.recommend_website_ids(
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
