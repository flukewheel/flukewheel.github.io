-- Pin the named owner exemptions to user IDs at migration time. Usernames can change.
create table private.submission_quota_exemptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_from_username text not null,
  granted_at timestamptz not null default now()
);
alter table private.submission_quota_exemptions enable row level security;
revoke all on private.submission_quota_exemptions from public, anon, authenticated;

insert into private.submission_quota_exemptions (user_id, granted_from_username)
select p.id, lower(p.username)
from public.profiles p
where lower(p.username) in ('flukewheel', 'shaunschwegler');

create or replace function public.submit_website_intake(
  p_request_id uuid,
  p_submitter_id uuid,
  p_raw_url text,
  p_normalised_url text,
  p_suggested_categories text[],
  p_description text
)
returns table (submission_id uuid, result text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_now timestamptz := now();
  v_exempt boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('flukewheel-submission-intake'));

  select s.id into v_id
  from public.website_submissions s
  where s.request_id = p_request_id;
  if v_id is not null then
    return query select v_id, 'accepted'::text;
    return;
  end if;

  if exists (
    select 1 from public.websites w where w.normalised_url = p_normalised_url
  ) or exists (
    select 1 from public.website_submissions s
    where s.normalised_url = p_normalised_url and s.status = 'pending'
  ) then
    return query select null::uuid, 'duplicate'::text;
    return;
  end if;

  select exists (
    select 1 from private.submission_quota_exemptions e
    where e.user_id = p_submitter_id
  ) into v_exempt;

  if not v_exempt and (
    (select count(*) from public.website_submissions s
      where s.submitted_at > v_now - interval '1 day'
        and not exists (
          select 1 from private.submission_quota_exemptions e where e.user_id = s.submitter_id
        )) >= 5000
    or (p_submitter_id is null and
        (select count(*) from public.website_submissions s
         where s.submitter_id is null and s.submitted_at > v_now - interval '1 day') >= 1000)
    or (p_submitter_id is not null and
        (select count(*) from public.website_submissions s
         where s.submitter_id = p_submitter_id and s.submitted_at > v_now - interval '1 day') >= 20)
  ) then
    return query select null::uuid, 'rate_limited'::text;
    return;
  end if;

  insert into public.website_submissions (
    request_id, submitter_id, raw_url, normalised_url,
    suggested_categories, description
  ) values (
    p_request_id, p_submitter_id, p_raw_url, p_normalised_url,
    p_suggested_categories, p_description
  ) returning id into v_id;

  insert into private.validation_jobs (submission_id, status)
  values (v_id, 'pending');

  return query select v_id, 'accepted'::text;
end;
$$;

revoke all on function public.submit_website_intake(uuid, uuid, text, text, text[], text)
  from public, anon, authenticated;
grant execute on function public.submit_website_intake(uuid, uuid, text, text, text[], text)
  to service_role;
