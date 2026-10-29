-- Run with: Get-Content -Raw supabase/tests/phase2_security.sql |
--   docker exec -i supabase_db_flukewheel psql -U postgres -d postgres -v ON_ERROR_STOP=1
-- The enclosing transaction leaves the local development data untouched.
begin;

insert into auth.users (id, email) values
  ('30000000-0000-4000-8000-000000000001', 'phase2-a@example.invalid'),
  ('30000000-0000-4000-8000-000000000002', 'phase2-b@example.invalid'),
  ('30000000-0000-4000-8000-000000000003', 'phase2-admin@example.invalid');

insert into public.profiles (id, username) values
  ('30000000-0000-4000-8000-000000000001', 'phase2_a'),
  ('30000000-0000-4000-8000-000000000002', 'phase2_b');
insert into public.bookmarks (user_id, website_id) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002');
insert into public.website_submissions (
  id, submitter_id, raw_url, normalised_url
) values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'https://pending.example.invalid/',
  'https://pending.example.invalid/'
);
insert into public.websites (
  id, original_url, normalised_url, title, description, approval_status, active
) values
  (
    '50000000-0000-4000-8000-000000000001',
    'https://pending.example.invalid/',
    'https://pending.example.invalid/',
    'Pending', 'Should remain hidden.', 'pending', false
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'https://rejected.example.invalid/',
    'https://rejected.example.invalid/',
    'Rejected', 'Should remain hidden.', 'rejected', false
  );
insert into private.user_roles (user_id, role) values
  ('30000000-0000-4000-8000-000000000003', 'admin');

set local role anon;
do $$
begin
  if (select count(*) from public.categories) <> 4 then
    raise exception 'guest category access failed';
  end if;
  if (select count(*) from public.websites) <> 50 then
    raise exception 'pending or rejected website leaked to guest';
  end if;
  if (select count(*) from public.website_categories) <> 95 then
    raise exception 'guest category links mismatch';
  end if;
  begin
    perform normalised_url from public.websites limit 1;
    raise exception 'internal catalogue URL was exposed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform id from public.profiles limit 1;
    raise exception 'profiles exposed to guest';
  exception when insufficient_privilege then null;
  end;
  begin
    perform id from public.website_submissions limit 1;
    raise exception 'submissions exposed to guest';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.website_submissions (raw_url, normalised_url)
    values ('https://guest.example.invalid/', 'https://guest.example.invalid/');
    raise exception 'guest direct submission write succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
do $$
begin
  if (select auth.uid()) <> '30000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'test auth identity was not applied';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'profile owner isolation failed';
  end if;
  if (select count(*) from public.bookmarks) <> 1 then
    raise exception 'bookmark owner isolation failed';
  end if;
  if (select count(*) from public.website_submissions) <> 1 then
    raise exception 'submission owner isolation failed';
  end if;
  if (select count(*) from public.websites) <> 50 then
    raise exception 'pending or rejected website leaked to member';
  end if;
  begin
    insert into public.bookmarks (user_id, website_id)
    values (
      '30000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003'
    );
    raise exception 'cross-user bookmark insert succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles
    set id = '30000000-0000-4000-8000-000000000002'
    where id = '30000000-0000-4000-8000-000000000001';
    raise exception 'profile owner reassignment succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into private.user_roles (user_id, role)
    values ('30000000-0000-4000-8000-000000000001', 'admin');
    raise exception 'role escalation succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'avatars',
      '30000000-0000-4000-8000-000000000002/other.png',
      '30000000-0000-4000-8000-000000000001'
    );
    raise exception 'avatar cross-user path write succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'avatars',
      '30000000-0000-4000-8000-000000000001/unprocessed.png',
      '30000000-0000-4000-8000-000000000001'
    );
    raise exception 'direct avatar upload succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set avatar_path = '30000000-0000-4000-8000-000000000001/forged.webp'
    where id = '30000000-0000-4000-8000-000000000001';
    raise exception 'direct avatar path update succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.bump_history (user_id, website_id, source, request_id)
    values (
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'bump',
      gen_random_uuid()
    );
    raise exception 'direct history write succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role service_role;
insert into storage.objects (bucket_id, name, owner_id)
values (
  'avatars',
  '30000000-0000-4000-8000-000000000001/own.png',
  '30000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
do $$
begin
  if (select count(*) from storage.objects where bucket_id = 'avatars') <> 1 then
    raise exception 'owner cannot read processed avatar';
  end if;
end;
$$;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'second user profile isolation failed';
  end if;
  if (select count(*) from public.bookmarks) <> 1 then
    raise exception 'second user bookmark isolation failed';
  end if;
  if (select count(*) from public.website_submissions) <> 0 then
    raise exception 'another user submission leaked';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'avatars') <> 0 then
    raise exception 'another user avatar leaked';
  end if;
end;
$$;

set local role service_role;
do $$
begin
  if (select count(*) from private.user_roles where role = 'admin') <> 1 then
    raise exception 'trusted admin authority missing';
  end if;
  if (select count(*) from public.websites) <> 52 then
    raise exception 'service role cannot inspect moderation rows';
  end if;
end;
$$;

rollback;
