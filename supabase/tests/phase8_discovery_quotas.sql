-- Run against the local stack. Quota rows and fixtures roll back.
begin;

insert into auth.users (id, email) values
  ('30000000-0000-4000-8000-000000000081', 'phase8-quota-a@example.invalid'),
  ('30000000-0000-4000-8000-000000000082', 'phase8-quota-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000081', true);

do $$
declare i integer;
begin
  for i in 1..59 loop
    perform public.consume_discovery_quota('bump');
  end loop;
  -- The real RPC, including direct REST callers, must consume the last slot.
  perform public.select_bump_website(null, '{}', null,
    '30000000-0000-4000-8000-000000000081', 0.5);
  begin
    perform public.select_bump_website(null, '{}', null,
      '30000000-0000-4000-8000-000000000081', 0.5);
    raise exception 'member Bump quota was bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'RATE_LIMITED' then raise; end if;
  end;

  for i in 1..89 loop
    perform public.consume_discovery_quota('recommend');
  end loop;
  perform public.recommend_website_ids(null, 6);
  begin
    perform public.recommend_website_ids(null, 6);
    raise exception 'member recommendation quota was bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'RATE_LIMITED' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000082', true);
select public.consume_discovery_quota('bump');
select public.consume_discovery_quota('recommend');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare i integer;
begin
  for i in 1..599 loop
    perform public.consume_discovery_quota('bump');
  end loop;
  perform public.select_bump_website(null, '{}', null,
    '30000000-0000-4000-8000-000000000083', 0.5);
  begin
    perform public.select_bump_website(null, '{}', null,
      '30000000-0000-4000-8000-000000000083', 0.5);
    raise exception 'guest Bump quota was bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'RATE_LIMITED' then raise; end if;
  end;
  begin
    perform public.consume_discovery_quota('recommend');
    raise exception 'guest recommendation quota was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

rollback;
