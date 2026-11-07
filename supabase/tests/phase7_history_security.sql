-- Run against a reset local database; the transaction leaves no test records.
begin;

insert into auth.users (id, email) values
  ('70000000-0000-4000-8000-000000000001', 'phase7-a@example.invalid'),
  ('70000000-0000-4000-8000-000000000002', 'phase7-b@example.invalid');

insert into public.bump_history (id, user_id, website_id, source, request_id) values
  ('70000000-0000-4000-8000-000000000011', '70000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'bump', '70000000-0000-4000-8000-000000000021'),
  ('70000000-0000-4000-8000-000000000012', '70000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'bump', '70000000-0000-4000-8000-000000000022');

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);

do $$
declare deleted_count integer;
begin
  if (select count(*) from public.bump_history where id in (
    '70000000-0000-4000-8000-000000000011', '70000000-0000-4000-8000-000000000012'
  )) <> 1 then
    raise exception 'history read leaked another account';
  end if;

  delete from public.bump_history where id = '70000000-0000-4000-8000-000000000012';
  get diagnostics deleted_count = row_count;
  if deleted_count <> 0 then raise exception 'cross-account history deletion succeeded'; end if;

  delete from public.bump_history where user_id = '70000000-0000-4000-8000-000000000001';
  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 then raise exception 'owner history deletion failed'; end if;
end;
$$;

reset role;
do $$
begin
  if not exists (select 1 from public.bump_history where id = '70000000-0000-4000-8000-000000000012') then
    raise exception 'other account history was removed';
  end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    delete from public.bump_history where id = '70000000-0000-4000-8000-000000000012';
    raise exception 'guest history deletion succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
