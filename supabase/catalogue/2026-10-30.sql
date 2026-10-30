-- Catalogue update for 2026-10-30. Keep retired rows for visit/reaction history.
update public.websites
set active = false
where id in (
  '20000000-0000-4000-8000-000000000042',
  '20000000-0000-4000-8000-000000000047'
);

insert into public.websites (
  id, original_url, normalised_url, title, description,
  approval_status, active, embedding_status, approved_at
)
select id, url, split_part(url, '#', 1), title, description,
  'approved', true, 'allowed', now()
from (values
  ('20000000-0000-4000-8000-000000000088'::uuid, 'https://soccar-one.vercel.app/', 'Soccar One', 'A browser game mixing football and cars.'),
  ('20000000-0000-4000-8000-000000000089'::uuid, 'https://skate.soweme.com/', 'Skate', 'An interactive skateboarding experiment.'),
  ('20000000-0000-4000-8000-000000000090'::uuid, 'https://therantyhighwayman.blogspot.com/2025/10/liveable-leicester-redux.html', 'Liveable Leicester Redux', 'An illustrated look at streets and transport in Leicester.'),
  ('20000000-0000-4000-8000-000000000091'::uuid, 'https://dinahmoelabs.com/plink/', 'Plink', 'Make music together in a playful browser experiment.'),
  ('20000000-0000-4000-8000-000000000092'::uuid, 'https://ginacities.com/', 'Gina Cities', 'Explore a curious independent web project.'),
  ('20000000-0000-4000-8000-000000000093'::uuid, 'https://photoeditor.polarr.com/', 'Polarr Photo Editor', 'Edit photographs in your browser.'),
  ('20000000-0000-4000-8000-000000000094'::uuid, 'https://vndb.org/', 'Visual Novel Database', 'Browse a database of visual novels.'),
  ('20000000-0000-4000-8000-000000000095'::uuid, 'https://www.whichbook.net/', 'Whichbook', 'Find books by mood and story preferences.'),
  ('20000000-0000-4000-8000-000000000096'::uuid, 'https://neonaut.neocities.org/directory/', 'Neonaut Directory', 'A directory of independent websites.'),
  ('20000000-0000-4000-8000-000000000097'::uuid, 'https://evanhahn.com/uploads/ffmpeg-buddy/', 'FFmpeg Buddy', 'Build FFmpeg commands with a visual helper.'),
  ('20000000-0000-4000-8000-000000000098'::uuid, 'https://science.nasa.gov/specials/your-name-in-landsat/', 'Your Name in Landsat', 'Spell your name with satellite imagery from NASA.'),
  ('20000000-0000-4000-8000-000000000099'::uuid, 'https://sfpc.study/', 'School for Poetic Computation', 'Explore learning at the intersection of code, art and community.'),
  ('20000000-0000-4000-8000-000000000100'::uuid, 'https://www.agegeek.com/', 'Age Geek', 'Compare ages and discover age-related milestones.'),
  ('20000000-0000-4000-8000-000000000101'::uuid, 'https://mifsud.org/bee/', 'Bee', 'An independent website about bees.'),
  ('20000000-0000-4000-8000-000000000102'::uuid, 'https://celt.ucc.ie/', 'CELT', 'Browse the Corpus of Electronic Texts at University College Cork.'),
  ('20000000-0000-4000-8000-000000000103'::uuid, 'https://oimo.io/works/chill/', 'Chill', 'An interactive visual experiment by Oimo.'),
  ('20000000-0000-4000-8000-000000000104'::uuid, 'https://dogemuchwow.com/', 'Doge Much Wow', 'A playful corner of the web inspired by Doge.'),
  ('20000000-0000-4000-8000-000000000105'::uuid, 'https://www.i-mockery.com/', 'I-Mockery', 'An archive of pop culture and comedy.'),
  ('20000000-0000-4000-8000-000000000106'::uuid, 'https://www.australiangeographic.com.au/nature-wildlife/2011/10/animals-getting-high-10-common-drunks/', 'Animals Getting High', 'Australian Geographic on animals and intoxicating foods.'),
  ('20000000-0000-4000-8000-000000000107'::uuid, 'https://hhug.me/', 'Handheld Underground', 'Explore obscure handheld games and devices.'),
  ('20000000-0000-4000-8000-000000000108'::uuid, 'https://bookofshapes.com/', 'Book of Shapes', 'Explore and customize generative shapes and patterns.'),
  ('20000000-0000-4000-8000-000000000109'::uuid, 'https://explainprogrammerhumor.com/', 'Explain Programmer Humor', 'Explanations of jokes about programming.'),
  ('20000000-0000-4000-8000-000000000110'::uuid, 'https://historyofparliament.com/', 'History of Parliament', 'Explore research into parliamentary history.'),
  ('20000000-0000-4000-8000-000000000111'::uuid, 'https://otherlife.davidcanavese.com/galaxymap2/', 'Otherlife Galaxy Map', 'An interactive map of a fictional galaxy.'),
  ('20000000-0000-4000-8000-000000000112'::uuid, 'https://emojis.wiki/', 'Emojis Wiki', 'Look up emoji meanings and examples.'),
  ('20000000-0000-4000-8000-000000000113'::uuid, 'https://harrypotter.fandom.com/wiki/Albus_Dumbledore', 'Albus Dumbledore Wiki', 'A fan wiki article about the Harry Potter character.'),
  ('20000000-0000-4000-8000-000000000114'::uuid, 'https://www.loeser.us/flags/', 'Loeser Flags', 'Explore a collection of flags.'),
  ('20000000-0000-4000-8000-000000000115'::uuid, 'https://rainmirage.neocities.org/', 'Rain Mirage', 'An independent Neocities website.'),
  ('20000000-0000-4000-8000-000000000116'::uuid, 'https://allthedamn.tools/', 'All the Damn Tools', 'A directory of online tools and resources.')
) as additions(id, url, title, description)
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
  ('20000000-0000-4000-8000-000000000088'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000088'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000089'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000089'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000090'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000091'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000091'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000092'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000093'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000093'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000094'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000094'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000095'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000095'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000096'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000096'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000097'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000097'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000098'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000098'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000099'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000099'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000100'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000100'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000101'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000102'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000102'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000103'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000103'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000104'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000105'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000106'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000106'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000107'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000107'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000108'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000108'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000109'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000109'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000110'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000111'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000111'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000112'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000112'::uuid, 'free'),
  ('20000000-0000-4000-8000-000000000113'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000113'::uuid, 'funny'),
  ('20000000-0000-4000-8000-000000000114'::uuid, 'educational'),
  ('20000000-0000-4000-8000-000000000114'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000115'::uuid, 'art'),
  ('20000000-0000-4000-8000-000000000116'::uuid, 'free')
) as assignment(website_id, slug)
join public.categories c on c.slug = assignment.slug
on conflict do nothing;

-- Retain records for references, but exclude reported broken viewers from discovery.
update public.websites
set active = false, embedding_status = 'blocked'
where id in (
  '20000000-0000-4000-8000-000000000094',
  '20000000-0000-4000-8000-000000000098',
  '20000000-0000-4000-8000-000000000102',
  '20000000-0000-4000-8000-000000000116'
);
