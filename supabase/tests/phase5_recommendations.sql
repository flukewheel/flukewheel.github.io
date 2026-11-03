-- Run with psql against the local stack. All test rows roll back.
begin;

insert into auth.users (id, email) values
  ('30000000-0000-4000-8000-000000000005', 'phase5-recommendations@example.invalid');

set local role anon;
do $$
begin
  begin
    perform public.recommend_website_ids(null, 6);
    raise exception 'guest could invoke private recommendations';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);

do $$
declare
  result_count integer;
  category_count integer;
begin
  select count(*) into result_count from public.recommend_website_ids(null, 6);
  if result_count <> 6 then raise exception 'cold start did not return six websites'; end if;

  select count(distinct wc.category_id) into category_count
  from public.recommend_website_ids(null, 6) r
  join public.website_categories wc on wc.website_id = r.website_id;
  if category_count < 2 then raise exception 'cold start lacks category variety'; end if;

  if exists (
    select 1 from public.recommend_website_ids('10000000-0000-4000-8000-000000000003', 6) r
    where not exists (
      select 1 from public.website_categories wc
      where wc.website_id = r.website_id
        and wc.category_id = '10000000-0000-4000-8000-000000000003'
    )
  ) then raise exception 'explicit category boundary was ignored'; end if;

  begin
    perform public.recommend_website_ids(null, 21);
    raise exception 'oversized recommendation request was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

insert into public.user_interests (user_id, category_id)
values ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003');

do $$
declare
  first_website_id uuid;
begin
  select website_id into first_website_id
  from public.recommend_website_ids(null, 6)
  limit 1;
  if not exists (
    select 1 from public.website_categories wc
    where wc.website_id = first_website_id
      and wc.category_id = '10000000-0000-4000-8000-000000000003'
  ) then raise exception 'selected interest did not influence recommendations'; end if;
end;
$$;

rollback;
