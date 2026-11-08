-- Run against the local database. Fixtures are rolled back.
begin;

insert into auth.users (id, email)
values ('84000000-0000-4000-8000-000000000001', 'approval-admin@example.invalid');
insert into private.user_roles (user_id, role)
values ('84000000-0000-4000-8000-000000000001', 'admin');
insert into public.website_submissions (id, raw_url, normalised_url)
values ('84000000-0000-4000-8000-000000000011',
  'https://approval-without-note.example.org/', 'https://approval-without-note.example.org/');
insert into private.validation_jobs (submission_id)
values ('84000000-0000-4000-8000-000000000011');

do $$
declare
  v_category_id uuid;
  v_status text;
  v_website_id uuid;
begin
  select id into v_category_id from public.categories where active order by display_order limit 1;
  if v_category_id is null then raise exception 'test needs one active category'; end if;

  select review_status, website_id into v_status, v_website_id
  from public.review_submission(
    '84000000-0000-4000-8000-000000000001',
    '84000000-0000-4000-8000-000000000011',
    'approve', 'Published title', 'Published description', array[v_category_id], null
  );
  if v_status <> 'approved' or v_website_id is null then
    raise exception 'approval without note did not publish';
  end if;
  if not exists (
    select 1 from public.websites where id = v_website_id
      and title = 'Published title' and description = 'Published description'
      and approval_status = 'approved' and active and embedding_status = 'allowed'
      and last_validated_at is null
  ) or not exists (
    select 1 from public.website_categories
    where website_id = v_website_id and category_id = v_category_id
  ) then raise exception 'published website is incomplete'; end if;
  if not exists (
    select 1 from private.validation_jobs
    where submission_id = '84000000-0000-4000-8000-000000000011'
      and status = 'complete' and checked_at is null and checked_url is null
      and verification_notes is null
  ) then raise exception 'preview check was falsely recorded'; end if;
  if exists (
    select 1 from private.moderation_events
    where target_id = '84000000-0000-4000-8000-000000000011'
      and details ? 'verification_note'
  ) then raise exception 'verification note audit remains'; end if;
end;
$$;

rollback;
