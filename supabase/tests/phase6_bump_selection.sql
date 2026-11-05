begin;

insert into public.categories (id, slug, display_name, description) values
  ('40000000-0000-4000-8000-000000000001', 'phase6-single', 'Phase 6 single', 'Single-site test'),
  ('40000000-0000-4000-8000-000000000002', 'phase6-empty', 'Phase 6 empty', 'Empty test'),
  ('40000000-0000-4000-8000-000000000003', 'phase6-own-origin', 'Phase 6 own origin', 'Own-origin test');
insert into public.website_categories (website_id, category_id)
select w.id, '40000000-0000-4000-8000-000000000001'
from public.websites w
where w.approval_status = 'approved' and w.active and w.embedding_status = 'allowed'
order by w.id limit 1;
insert into public.websites (
  id, original_url, normalised_url, title, description,
  approval_status, active, embedding_status, approved_at
) values (
  '40000000-0000-4000-8000-000000000004',
  'https://flukewheel.github.io/', 'https://flukewheel.github.io/',
  'Own origin', 'Must never enter external discovery',
  'approved', true, 'allowed', now()
);
insert into public.website_categories (website_id, category_id) values
  ('40000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003');

set local role anon;
do $$
declare
  picked uuid;
  target uuid;
  repeated uuid;
  relaxed boolean;
begin
  select website_id into picked from public.select_bump_website(
    null, '{}', null, gen_random_uuid(), 0.5
  );
  if picked is null then raise exception 'Guest Bump returned no eligible website'; end if;
  if not exists (
    select 1 from public.websites w where w.id = picked
      and w.approval_status = 'approved' and w.active and w.embedding_status = 'allowed'
  ) then raise exception 'Guest Bump selected an ineligible website'; end if;

  select website_id into target from public.select_bump_website(
    null, array[picked], picked, gen_random_uuid(), 0.5
  );
  if target = picked then raise exception 'Bump repeated current site despite alternatives'; end if;

  select website_id into repeated from public.select_bump_website(
    null, array[picked], picked, gen_random_uuid(), 0.5
  );
  if repeated is null then raise exception 'Recent exclusion exhausted the catalogue'; end if;

  if exists (select 1 from public.select_bump_website(
    '40000000-0000-4000-8000-000000000002', '{}', null, gen_random_uuid(), 0.5
  )) then raise exception 'Empty category escaped its boundary'; end if;
  if exists (select 1 from public.select_bump_website(
    '40000000-0000-4000-8000-000000000003', '{}', null, gen_random_uuid(), 0.5
  )) then raise exception 'Own app origin entered discovery'; end if;

  select website_id into target from public.select_bump_website(
    '40000000-0000-4000-8000-000000000001', '{}', null, gen_random_uuid(), 0.5
  );
  select exclusions_relaxed into relaxed from public.select_bump_website(
    '40000000-0000-4000-8000-000000000001', array[target], target, gen_random_uuid(), 0.5
  );
  if not relaxed then raise exception 'One-site repeat was not disclosed'; end if;

  begin
    perform public.select_bump_website(gen_random_uuid(), '{}', null, gen_random_uuid(), 0.5);
    raise exception 'Invalid category was accepted';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

rollback;
