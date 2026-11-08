-- Run against the local database. Fixtures are rolled back.
begin;

insert into auth.users (id, email)
values ('83000000-0000-4000-8000-000000000001', 'catalogue-editor@example.invalid');
insert into private.user_roles (user_id, role)
values ('83000000-0000-4000-8000-000000000001', 'admin');

insert into public.websites (id, original_url, normalised_url, title, description, approval_status, active, approved_at)
values
  ('83000000-0000-4000-8000-000000000011', 'https://edit-one.example.org/', 'https://edit-one.example.org/', 'Edit one', 'Initial description', 'approved', true, now()),
  ('83000000-0000-4000-8000-000000000012', 'https://edit-two.example.org/', 'https://edit-two.example.org/', 'Edit two', 'Initial description', 'approved', true, now());

do $$
declare
  v_categories uuid[];
begin
  select array_agg(id order by display_order) into v_categories
  from (select id, display_order from public.categories where active order by display_order limit 2) selected;
  if cardinality(v_categories) <> 2 then raise exception 'test needs two active categories'; end if;

  perform public.manage_website(
    '83000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000011',
    'https://updated.example.org/path', 'https://updated.example.org/path',
    'Edit one', 'Updated description', null, v_categories,
    true, 'allowed', ''
  );
  if not exists (
    select 1 from public.websites where id = '83000000-0000-4000-8000-000000000011'
      and original_url = 'https://updated.example.org/path'
      and normalised_url = 'https://updated.example.org/path'
      and description = 'Updated description'
  ) or (select count(*) from public.website_categories
        where website_id = '83000000-0000-4000-8000-000000000011') <> 2 then
    raise exception 'catalogue edit did not persist metadata and categories';
  end if;

  begin
    perform public.manage_website(
      '83000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000011',
      'https://edit-two.example.org/', 'https://edit-two.example.org/',
      'Edit one', 'Should not persist', null, v_categories,
      true, 'allowed', ''
    );
    raise exception 'duplicate URL was accepted';
  exception when unique_violation then null;
  end;
  if not exists (
    select 1 from public.websites where id = '83000000-0000-4000-8000-000000000011'
      and original_url = 'https://updated.example.org/path'
      and description = 'Updated description'
  ) then raise exception 'duplicate URL partially saved'; end if;
end;
$$;

rollback;
