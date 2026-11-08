-- Keep the four original IDs so existing website links and member interests survive.
-- The former Free category becomes Other; editors can recategorise those sites.
insert into public.categories (id, slug, display_name, description, display_order, active)
values
  ('10000000-0000-4000-8000-000000000003', 'arts-design-crafts', 'Arts, Design & Crafts', 'Art, illustration, fashion, photography', 1, true),
  ('10000000-0000-4000-8000-000000000005', 'business-economics', 'Business, Economics', 'Business, finance, markets, entrepreneurship', 2, true),
  ('10000000-0000-4000-8000-000000000006', 'culture-society', 'Culture, Society', 'Politics, law, travel, people, society', 3, true),
  ('10000000-0000-4000-8000-000000000001', 'education-learning', 'Education, Learning', 'Teaching, learning, schools, knowledge', 4, true),
  ('10000000-0000-4000-8000-000000000007', 'food-cooking', 'Food, Cooking', 'Recipes, cuisines, baking, nutrition', 5, true),
  ('10000000-0000-4000-8000-000000000002', 'fun-stuff', 'Fun Stuff', 'Humour, satire, oddities, weird discoveries', 6, true),
  ('10000000-0000-4000-8000-000000000008', 'gaming', 'Gaming', 'Video games, board games, consoles, toys', 7, true),
  ('10000000-0000-4000-8000-000000000009', 'health', 'Health', 'Fitness, medicine, psychology, wellbeing', 8, true),
  ('10000000-0000-4000-8000-000000000010', 'history', 'History', 'Archaeology, ancient history, wars, heritage', 9, true),
  ('10000000-0000-4000-8000-000000000011', 'home-garden', 'Home, Garden', 'Interiors, gardening, DIY, home improvement', 10, true),
  ('10000000-0000-4000-8000-000000000012', 'internet-software', 'Internet, Software', 'Websites, programming, apps, web tools', 11, true),
  ('10000000-0000-4000-8000-000000000013', 'literature-writing', 'Literature, Writing', 'Books, poetry, publishing, creative writing', 12, true),
  ('10000000-0000-4000-8000-000000000014', 'music-audio', 'Music, Audio', 'Artists, instruments, production, sound', 13, true),
  ('10000000-0000-4000-8000-000000000015', 'nature-animals-earth', 'Nature, Animals, Earth', 'Wildlife, ecology, farming, environment', 14, true),
  ('10000000-0000-4000-8000-000000000016', 'philosophy-life', 'Philosophy, Life', 'Beliefs, religion, ethics, personal growth', 15, true),
  ('10000000-0000-4000-8000-000000000017', 'science-math', 'Science, Math', 'Physics, biology, chemistry, mathematics', 16, true),
  ('10000000-0000-4000-8000-000000000018', 'sports', 'Sports', 'Football, athletics, competitions, recreation', 17, true),
  ('10000000-0000-4000-8000-000000000019', 'technology-hardware', 'Technology, Hardware', 'Engineering, electronics, gadgets, computers', 18, true),
  ('10000000-0000-4000-8000-000000000020', 'tv-movies-video', 'TV, Movies, Video', 'Films, television, streaming, animation', 19, true),
  ('10000000-0000-4000-8000-000000000004', 'other', 'Other', 'Everything else, uncategorised discoveries', 20, true)
on conflict (id) do update set
  slug = excluded.slug,
  display_name = excluded.display_name,
  description = excluded.description,
  display_order = excluded.display_order,
  active = excluded.active;
