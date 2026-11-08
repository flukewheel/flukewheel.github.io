-- Curated second categories for identifiable existing catalogue sites. Keep their
-- former links so existing interests and broad discovery results remain valid.
-- Home, Garden intentionally has no assignment until a matching site is reviewed.
with assignments (slug, site_suffix) as (values
  ('business-economics', '0166'), ('business-economics', '0215'), ('business-economics', '0319'),
  ('culture-society', '0110'), ('culture-society', '0182'), ('culture-society', '0301'),
  ('education-learning', '0099'), ('education-learning', '0163'), ('education-learning', '0296'),
  ('food-cooking', '0014'), ('food-cooking', '0218'), ('food-cooking', '0295'), ('food-cooking', '0299'),
  ('gaming', '0041'), ('gaming', '0053'), ('gaming', '0121'), ('gaming', '0126'), ('gaming', '0205'),
  ('health', '0029'), ('health', '0058'), ('health', '0275'), ('health', '0280'), ('health', '0281'),
  ('history', '0110'), ('history', '0146'), ('history', '0149'), ('history', '0175'), ('history', '0179'),
  ('internet-software', '0097'), ('internet-software', '0140'), ('internet-software', '0160'), ('internet-software', '0290'), ('internet-software', '0332'),
  ('literature-writing', '0048'), ('literature-writing', '0095'), ('literature-writing', '0130'), ('literature-writing', '0344'), ('literature-writing', '0349'),
  ('music-audio', '0015'), ('music-audio', '0035'), ('music-audio', '0036'), ('music-audio', '0050'), ('music-audio', '0186'), ('music-audio', '0302'),
  ('nature-animals-earth', '0010'), ('nature-animals-earth', '0011'), ('nature-animals-earth', '0101'), ('nature-animals-earth', '0229'), ('nature-animals-earth', '0284'),
  ('philosophy-life', '0019'), ('philosophy-life', '0161'), ('philosophy-life', '0253'), ('philosophy-life', '0263'), ('philosophy-life', '0354'),
  ('science-math', '0016'), ('science-math', '0017'), ('science-math', '0040'), ('science-math', '0057'), ('science-math', '0119'), ('science-math', '0213'), ('science-math', '0297'),
  ('sports', '0088'), ('sports', '0089'), ('sports', '0123'), ('sports', '0128'), ('sports', '0294'),
  ('technology-hardware', '0064'), ('technology-hardware', '0065'), ('technology-hardware', '0148'), ('technology-hardware', '0154'), ('technology-hardware', '0201'), ('technology-hardware', '0261'),
  ('tv-movies-video', '0001'), ('tv-movies-video', '0030'), ('tv-movies-video', '0153'), ('tv-movies-video', '0264'), ('tv-movies-video', '0266'), ('tv-movies-video', '0267')
)
insert into public.website_categories (website_id, category_id)
select w.id, c.id
from assignments a
join public.websites w on w.id = ('20000000-0000-4000-8000-00000000' || a.site_suffix)::uuid
join public.categories c on c.slug = a.slug
on conflict do nothing;
