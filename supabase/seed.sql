-- Local development catalogue only. Hosted projects receive curated entries
-- through the moderation workflow; `db push` does not run this seed file.
insert into public.categories (id, slug, display_name, description, display_order)
values
  ('10000000-0000-4000-8000-000000000001', 'educational', 'Educational', 'Learn something curious, useful or unexpectedly absorbing.', 1),
  ('10000000-0000-4000-8000-000000000002', 'funny', 'Funny', 'Playful corners of the web made to brighten a spare minute.', 2),
  ('10000000-0000-4000-8000-000000000003', 'art', 'Art', 'Independent illustration, design, archives and experiments.', 3),
  ('10000000-0000-4000-8000-000000000004', 'free', 'Free', 'Generous tools, software and resources worth keeping close.', 4)
on conflict (id) do update set
  slug = excluded.slug,
  display_name = excluded.display_name,
  description = excluded.description,
  display_order = excluded.display_order;

insert into public.websites (
  id, original_url, normalised_url, title, description,
  approval_status, active, embedding_status, approved_at
) values
  (
    '20000000-0000-4000-8000-000000000001',
    'https://www.hypertext.tv',
    'https://www.hypertext.tv/',
    'Hypertext TV',
    'An independent corner of the web from Hypertext TV.',
    'approved', true, 'unknown', now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'https://normalbobsmith.com',
    'https://normalbobsmith.com/',
    'Normal Bob Smith',
    'An independent website by Normal Bob Smith.',
    'approved', true, 'unknown', now() - interval '1 minute'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'https://www.kbs.im',
    'https://www.kbs.im/',
    'KBS',
    'A small independent web project.',
    'approved', true, 'unknown', now() - interval '2 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'http://www.dobi.nu/yourscenesucks/',
    'http://www.dobi.nu/yourscenesucks/',
    'Your Scene Sucks',
    'Illustrated music and style subcultures by Rob Dobi.',
    'approved', true, 'blocked', now() - interval '3 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'https://maptap.gg/',
    'https://maptap.gg/',
    'MapTap',
    'A daily geography puzzle.',
    'approved', true, 'unknown', now() - interval '4 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'https://radio.garden/',
    'https://radio.garden/',
    'Radio Garden',
    'Listen to live radio from cities around the world.',
    'approved', true, 'unknown', now() - interval '1 day'
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    'https://www.mapcrunch.com/',
    'https://www.mapcrunch.com/',
    'MapCrunch',
    'Explore a random street-level view.',
    'approved', true, 'unknown', now() - interval '7 days'
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    'https://weavesilk.com/',
    'https://weavesilk.com/',
    'Silk',
    'Make luminous generative drawings in your browser.',
    'approved', true, 'unknown', now() - interval '30 days'
  )
on conflict (id) do update set
  original_url = excluded.original_url,
  normalised_url = excluded.normalised_url,
  title = excluded.title,
  description = excluded.description,
  approval_status = excluded.approval_status,
  active = excluded.active,
  embedding_status = excluded.embedding_status,
  approved_at = excluded.approved_at;

insert into public.website_categories (website_id, category_id)
select w.id, c.id
from (values
  ('20000000-0000-4000-8000-000000000001'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000001'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000005'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000005'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000007'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000007'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000008'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000008'::uuid, 'free')
) as assignment(website_id, slug)
join public.websites w on w.id = assignment.website_id
join public.categories c on c.slug = assignment.slug
on conflict do nothing;
