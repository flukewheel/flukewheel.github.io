-- Curated catalogue for local resets and explicit hosted imports. These destinations are all
-- available through the inline-only viewer; remote sites control whether their
-- own content can actually render in a frame.
-- `db push` does not run this file automatically.
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
    'https://hypertext.tv/',
    'https://hypertext.tv/',
    'Hypertext TV',
    'An independent corner of the web from Hypertext TV.',
    'approved', true, 'allowed', now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'http://normalbobsmith.com/',
    'http://normalbobsmith.com/',
    'Normal Bob Smith',
    'An independent website by Normal Bob Smith.',
    'approved', true, 'allowed', now() - interval '1 minute'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'https://kbs.im/',
    'https://kbs.im/',
    'KBS',
    'A small independent web project.',
    'approved', true, 'allowed', now() - interval '2 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'http://www.dobi.nu/yourscenesucks/',
    'http://www.dobi.nu/yourscenesucks/',
    'Your Scene Sucks',
    'Illustrated music and style subcultures by Rob Dobi.',
    'approved', true, 'allowed', now() - interval '3 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'https://maptap.gg/',
    'https://maptap.gg/',
    'MapTap',
    'A daily geography puzzle.',
    'approved', true, 'allowed', now() - interval '4 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'https://radio.garden/',
    'https://radio.garden/',
    'Radio Garden',
    'Listen to live radio from cities around the world.',
    'approved', true, 'allowed', now() - interval '1 day'
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    'https://www.mapcrunch.com/',
    'https://www.mapcrunch.com/',
    'MapCrunch',
    'Explore a random street-level view.',
    'approved', true, 'allowed', now() - interval '7 days'
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    'https://weavesilk.com/',
    'https://weavesilk.com/',
    'Silk',
    'Make luminous generative drawings in your browser.',
    'approved', true, 'allowed', now() - interval '30 days'
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

-- Additional user-curated sites. Original URLs are kept for the inline viewer;
-- fragments are excluded from the unique database URL key.
-- FMHY and Wolfram|Alpha are retained as inactive records because they block framing.
insert into public.websites (
  id, original_url, normalised_url, title, description,
  approval_status, active, embedding_status, approved_at
)
select id, url, split_part(url, '#', 1), title, description,
  'approved',
  id not in (
    '20000000-0000-4000-8000-000000000043'::uuid,
    '20000000-0000-4000-8000-000000000044'::uuid
  ),
  case when id in (
    '20000000-0000-4000-8000-000000000043'::uuid,
    '20000000-0000-4000-8000-000000000044'::uuid
  ) then 'blocked' else 'allowed' end,
  now() - ordinal * interval '1 minute'
from (values
  ('20000000-0000-4000-8000-000000000009'::uuid, 'https://screen.toys/roadtrip/', 'Road Trip', 'An interactive road trip from Screen Toys.', 0),
  ('20000000-0000-4000-8000-000000000010'::uuid, 'https://apprundown.com/baitball', 'Bait Ball', 'An interactive 3D bait ball experience.', 1),
  ('20000000-0000-4000-8000-000000000011'::uuid, 'https://river-runner-global.samlearner.com/', 'River Runner Global', 'Trace a route through the world''s waterways.', 2),
  ('20000000-0000-4000-8000-000000000012'::uuid, 'https://dotsandboxes.org/', 'Dots and Boxes', 'Play the classic dots and boxes game online.', 3),
  ('20000000-0000-4000-8000-000000000013'::uuid, 'https://www.earthfliphd.com/', 'EarthFlip HD', 'Explore a visual view of Earth.', 4),
  ('20000000-0000-4000-8000-000000000014'::uuid, 'https://www.sugarologie.com/cakeculator', 'The Cakeculator', 'Calculate cake recipes and pan sizes.', 5),
  ('20000000-0000-4000-8000-000000000015'::uuid, 'https://metromusic.weisswideweb.com/', 'Metro Music', 'An interactive music project.', 6),
  ('20000000-0000-4000-8000-000000000016'::uuid, 'https://htwins.net/scale2/', 'The Scale of the Universe 2', 'Explore sizes across the universe.', 7),
  ('20000000-0000-4000-8000-000000000017'::uuid, 'https://www.spaceatlas.tech/', 'Space Atlas', 'Explore satellites and orbital objects on a 3D map.', 8),
  ('20000000-0000-4000-8000-000000000018'::uuid, 'https://storiedcolors.com/', 'Storied Colors', 'Explore stories behind colors.', 9),
  ('20000000-0000-4000-8000-000000000019'::uuid, 'https://iching-silk.vercel.app/', 'I Ching Silk', 'Explore an interactive I Ching reading.', 10),
  ('20000000-0000-4000-8000-000000000020'::uuid, 'https://theleo.zone/colorcontroversy/', 'Color Controversy', 'An interactive project about color.', 11),
  ('20000000-0000-4000-8000-000000000021'::uuid, 'https://keybegin.toolooz.com/', 'KeyBegin', 'Practice using a standard keyboard.', 12),
  ('20000000-0000-4000-8000-000000000022'::uuid, 'https://pointerpointer.com/', 'Pointer Pointer', 'A playful pointer-finding web experiment.', 13),
  ('20000000-0000-4000-8000-000000000023'::uuid, 'https://vole.wtf/hellmouth/', 'Hellmouth Finder', 'A playful web project from Vole.', 14),
  ('20000000-0000-4000-8000-000000000024'::uuid, 'https://www.slapkirk.com/', 'Slap Kirk', 'A playful interactive page.', 15),
  ('20000000-0000-4000-8000-000000000025'::uuid, 'https://newsasfacts.com/', 'News as Facts', 'Read concise world news summaries.', 16),
  ('20000000-0000-4000-8000-000000000026'::uuid, 'https://www.radio-browser.info/map', 'Radio Browser Map', 'Explore radio stations on a map.', 17),
  ('20000000-0000-4000-8000-000000000027'::uuid, 'https://wtfhappened2012.com/', 'WTF Happened in 2012?', 'Explore long-term data charts.', 18),
  ('20000000-0000-4000-8000-000000000028'::uuid, 'https://paveldogreat.github.io/WebGL-Fluid-Simulation/', 'WebGL Fluid Simulation', 'Play with an interactive fluid simulation.', 19),
  ('20000000-0000-4000-8000-000000000029'::uuid, 'https://exhaleroom.com/', 'Exhale Room', 'A quiet space for a short pause.', 20),
  ('20000000-0000-4000-8000-000000000030'::uuid, 'https://channelsurfer.tv/', 'Channel Surfer', 'Browse video channels like cable television.', 21),
  ('20000000-0000-4000-8000-000000000031'::uuid, 'https://368chickens.com/', '368 Chickens', 'A curious web game about chickens.', 22),
  ('20000000-0000-4000-8000-000000000032'::uuid, 'https://www.faceguesser.com/', 'Face Guesser', 'Try a daily face-guessing game.', 23),
  ('20000000-0000-4000-8000-000000000033'::uuid, 'https://bigpause.app/', 'Big Pause', 'Take a short mindful break.', 24),
  ('20000000-0000-4000-8000-000000000034'::uuid, 'https://driveandlisten.app/', 'Drive & Listen', 'Pair city drives with local radio.', 25),
  ('20000000-0000-4000-8000-000000000035'::uuid, 'https://players.rcast.net/sombras/71987', 'KNAC Radio', 'Listen to KNAC rock radio through its linked player.', 26),
  ('20000000-0000-4000-8000-000000000036'::uuid, 'https://app.radiooooo.com/#_=_', 'Radiooooo', 'Explore music across places and decades.', 27),
  ('20000000-0000-4000-8000-000000000037'::uuid, 'https://mrdoob.com/lab/javascript/spinpainter/', 'Spin Painter', 'Create spinning digital drawings.', 28),
  ('20000000-0000-4000-8000-000000000038'::uuid, 'https://erppy.co/', 'Erppy', 'Explore a music-driven visual experience.', 29),
  ('20000000-0000-4000-8000-000000000039'::uuid, 'https://www.ventusky.com/?p=59;7;2&l=rain-1h&w=strong', 'Ventusky', 'Explore weather conditions on an interactive map.', 30),
  ('20000000-0000-4000-8000-000000000040'::uuid, 'https://physics.info/', 'The Physics Hypertextbook', 'Read an online physics textbook.', 31),
  ('20000000-0000-4000-8000-000000000041'::uuid, 'https://classic.minecraft.net/', 'Minecraft Classic', 'Play Minecraft Classic in a browser.', 32),
  ('20000000-0000-4000-8000-000000000042'::uuid, 'https://randomstreetview.com/', 'Random Street View', 'Visit random street-level scenes.', 33),
  ('20000000-0000-4000-8000-000000000043'::uuid, 'https://fmhy.pages.dev/', 'FMHY', 'Browse a directory of free media resources.', 34),
  ('20000000-0000-4000-8000-000000000044'::uuid, 'https://www.wolframalpha.com/', 'Wolfram|Alpha', 'Explore computational answers and tools.', 35),
  ('20000000-0000-4000-8000-000000000045'::uuid, 'https://www.marinetraffic.com/en/ais/home/centerx:0.3/centery:51.9/zoom:5', 'MarineTraffic', 'Explore vessel positions on a map.', 36),
  ('20000000-0000-4000-8000-000000000046'::uuid, 'https://cync.app', 'CYNC', 'Make patterns with a cyclic drum machine.', 37),
  ('20000000-0000-4000-8000-000000000047'::uuid, 'https://medium.com/feed-fatigue/algorithmic-beauty-10-artists-pushing-the-boundaries-of-code-2d55b58aedea', 'Algorithmic Beauty', 'Read about artists working with code.', 38),
  ('20000000-0000-4000-8000-000000000048'::uuid, 'https://libgen.li/', 'Library Genesis', 'Browse an online book catalogue.', 39),
  ('20000000-0000-4000-8000-000000000049'::uuid, 'https://wikifeet.com/Olivia_Colman', 'Olivia Colman on WikiFeet', 'A celebrity photo page selected for the catalogue.', 40),
  ('20000000-0000-4000-8000-000000000050'::uuid, 'https://paperpcb.dernulleffekt.de/doku.php?id=paper_synth:ps808kd', 'Paper Synth PS808KD', 'Read documentation for a paper synthesizer project.', 41)
) as curated(id, url, title, description, ordinal)
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
select assignment.website_id, c.id
from (values
  ('20000000-0000-4000-8000-000000000009'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000009'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000010'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000010'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000011'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000011'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000012'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000012'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000013'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000013'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000014'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000014'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000015'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000015'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000016'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000016'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000017'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000017'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000018'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000018'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000019'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000019'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000020'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000020'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000021'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000021'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000022'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000022'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000023'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000023'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000024'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000025'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000025'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000026'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000026'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000027'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000027'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000028'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000028'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000029'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000029'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000030'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000030'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000031'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000032'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000033'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000034'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000034'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000035'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000035'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000036'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000036'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000037'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000037'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000038'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000038'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000039'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000039'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000040'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000040'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000041'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000041'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000042'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000042'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000043'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000043'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000044'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000044'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000045'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000045'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000046'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000046'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000047'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000047'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000048'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000048'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000049'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000050'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000050'::uuid, 'free')
) as assignment(website_id, slug)
join public.categories c on c.slug = assignment.slug
on conflict do nothing;
