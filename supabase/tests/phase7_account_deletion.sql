-- Run against the local database. The transaction rolls back all fixtures.
begin;

insert into auth.users (id, email) values
  ('72000000-0000-4000-8000-000000000001', 'phase7-delete-a@example.invalid'),
  ('72000000-0000-4000-8000-000000000002', 'phase7-delete-b@example.invalid');

insert into public.profiles (id, username) values
  ('72000000-0000-4000-8000-000000000001', 'phase7_delete_a'),
  ('72000000-0000-4000-8000-000000000002', 'phase7_delete_b');

insert into public.bookmarks (user_id, website_id) values
  ('72000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001');

insert into public.website_reactions (user_id, website_id, reaction) values
  ('72000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'love'),
  ('72000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'love');

insert into public.bump_history (user_id, website_id, source, request_id) values
  ('72000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'bump', '72000000-0000-4000-8000-000000000021'),
  ('72000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'bump', '72000000-0000-4000-8000-000000000022');

insert into public.website_submissions (id, submitter_id, raw_url, normalised_url) values
  ('72000000-0000-4000-8000-000000000011', '72000000-0000-4000-8000-000000000001', 'https://delete-a.example.invalid/', 'https://delete-a.example.invalid/'),
  ('72000000-0000-4000-8000-000000000012', '72000000-0000-4000-8000-000000000002', 'https://delete-b.example.invalid/', 'https://delete-b.example.invalid/');

insert into private.moderation_events (action, target_type, target_id) values
  ('reviewed', 'submission', '72000000-0000-4000-8000-000000000011'),
  ('reviewed', 'submission', '72000000-0000-4000-8000-000000000012');

delete from auth.users where id = '72000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (select 1 from public.website_submissions where id = '72000000-0000-4000-8000-000000000011')
    or exists (select 1 from public.bookmarks where user_id = '72000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.profiles where id = '72000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.website_reactions where user_id = '72000000-0000-4000-8000-000000000001')
    or exists (select 1 from public.bump_history where user_id = '72000000-0000-4000-8000-000000000001')
    or exists (select 1 from private.moderation_events where target_id = '72000000-0000-4000-8000-000000000011') then
    raise exception 'deleted account retained owned data';
  end if;
  if not exists (select 1 from public.website_submissions where id = '72000000-0000-4000-8000-000000000012')
    or not exists (select 1 from public.bookmarks where user_id = '72000000-0000-4000-8000-000000000002')
    or not exists (select 1 from public.profiles where id = '72000000-0000-4000-8000-000000000002')
    or not exists (select 1 from public.website_reactions where user_id = '72000000-0000-4000-8000-000000000002')
    or not exists (select 1 from public.bump_history where user_id = '72000000-0000-4000-8000-000000000002')
    or not exists (select 1 from private.moderation_events where target_id = '72000000-0000-4000-8000-000000000012') then
    raise exception 'other account data was changed';
  end if;
end;
$$;

rollback;
