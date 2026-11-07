-- Run against a reset local database; the transaction leaves no test records.
begin;

insert into auth.users (id, email) values
  ('71000000-0000-4000-8000-000000000001', 'phase7-visit-a@example.invalid'),
  ('71000000-0000-4000-8000-000000000002', 'phase7-visit-b@example.invalid');

insert into public.websites (id, original_url, normalised_url, title, description, approval_status, active, approved_at)
values ('71000000-0000-4000-8000-000000000010', 'https://inactive.example.invalid/', 'https://inactive.example.invalid/', 'Inactive visit test', 'Inactive visit test', 'approved', false, now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);

do $$
begin
  insert into public.bump_history (user_id, website_id, source, request_id)
  values ('71000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'card', '71000000-0000-4000-8000-000000000021');

  begin
    insert into public.bump_history (user_id, website_id, source, request_id)
    values ('71000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'card', '71000000-0000-4000-8000-000000000022');
    raise exception 'cross-account visit insert succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.bump_history (user_id, website_id, source, request_id)
    values ('71000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'bump', '71000000-0000-4000-8000-000000000023');
    raise exception 'member forged a Bump selection';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.bump_history (user_id, website_id, source, request_id)
    values ('71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', 'card', '71000000-0000-4000-8000-000000000024');
    raise exception 'inactive website visit insert succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    insert into public.bump_history (user_id, website_id, source, request_id)
    values ('71000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'card', '71000000-0000-4000-8000-000000000025');
    raise exception 'guest visit insert succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
