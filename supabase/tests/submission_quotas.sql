-- Run against the local database. The transaction rolls back all fixtures.
begin;

-- Isolate the rolling window from other local development submissions.
update public.website_submissions
set submitted_at = now() - interval '2 days'
where submitted_at > now() - interval '1 day';

insert into auth.users (id, email) values
  ('85000000-0000-4000-8000-000000000001', 'quota-member@example.invalid'),
  ('85000000-0000-4000-8000-000000000002', 'quota-admin@example.invalid'),
  ('85000000-0000-4000-8000-000000000003', 'quota-shaun@example.invalid'),
  ('85000000-0000-4000-8000-000000000004', 'quota-filler@example.invalid'),
  ('85000000-0000-4000-8000-000000000005', 'quota-fresh@example.invalid');
insert into public.profiles (id, username) values
  ('85000000-0000-4000-8000-000000000002', 'flukewheel'),
  ('85000000-0000-4000-8000-000000000003', 'shaunschwegler');
insert into private.user_roles (user_id, role)
values ('85000000-0000-4000-8000-000000000002', 'admin');
insert into private.submission_quota_exemptions (user_id, granted_from_username)
select id, lower(username) from public.profiles
where lower(username) in ('flukewheel', 'shaunschwegler');

insert into public.website_submissions
  (submitter_id, raw_url, normalised_url, status, reviewed_at)
select '85000000-0000-4000-8000-000000000001',
  'https://member-prior-' || n || '.example.org/',
  'https://member-prior-' || n || '.example.org/', 'rejected', now()
from generate_series(1, 19) n;

do $$
declare v_result text;
begin
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), '85000000-0000-4000-8000-000000000001',
    'https://member-twentieth.example.org/', 'https://member-twentieth.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'accepted' then raise exception '20th member submission was rejected'; end if;
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), '85000000-0000-4000-8000-000000000001',
    'https://member-twenty-first.example.org/', 'https://member-twenty-first.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'rate_limited' then raise exception '21st member submission was accepted'; end if;
end;
$$;

insert into public.website_submissions (raw_url, normalised_url)
select 'https://guest-prior-' || n || '.example.org/',
  'https://guest-prior-' || n || '.example.org/'
from generate_series(1, 999) n;

do $$
declare v_result text;
begin
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), null,
    'https://guest-thousandth.example.org/', 'https://guest-thousandth.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'accepted' then raise exception '1000th guest submission was rejected'; end if;
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), null,
    'https://guest-thousand-first.example.org/', 'https://guest-thousand-first.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'rate_limited' then raise exception '1001st guest submission was accepted'; end if;
end;
$$;

-- Reach the shared 5,000 ceiling with non-exempt submissions.
insert into public.website_submissions
  (submitter_id, raw_url, normalised_url, status, reviewed_at)
select '85000000-0000-4000-8000-000000000004',
  'https://shared-prior-' || n || '.example.org/',
  'https://shared-prior-' || n || '.example.org/', 'rejected', now()
from generate_series(1, 3980) n;

-- A username change does not transfer the exemption to a different account.
update public.profiles set username = 'formerly_flukewheel'
where id = '85000000-0000-4000-8000-000000000002';
insert into public.profiles (id, username)
values ('85000000-0000-4000-8000-000000000005', 'flukewheel');

do $$
declare v_result text;
begin
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), '85000000-0000-4000-8000-000000000002',
    'https://admin-unlimited.example.org/', 'https://admin-unlimited.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'accepted' then raise exception 'admin exemption failed'; end if;
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), '85000000-0000-4000-8000-000000000003',
    'https://shaun-unlimited.example.org/', 'https://shaun-unlimited.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'accepted' then raise exception 'second exemption failed'; end if;
  if (select count(*) from public.website_submissions s
      where s.submitted_at > now() - interval '1 day'
        and not exists (select 1 from private.submission_quota_exemptions e
          where e.user_id = s.submitter_id)) <> 5000 then
    raise exception 'exempt submissions consumed the shared quota';
  end if;
  select intake.result into v_result from public.submit_website_intake(
    gen_random_uuid(), '85000000-0000-4000-8000-000000000005',
    'https://claimed-name.example.org/', 'https://claimed-name.example.org/',
    '{}'::text[], null) intake;
  if v_result <> 'rate_limited' then raise exception 'username transfer bypassed shared quota'; end if;
end;
$$;

rollback;
