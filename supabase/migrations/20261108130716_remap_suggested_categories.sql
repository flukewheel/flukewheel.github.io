-- Suggestions store slugs rather than category IDs. Translate historic choices
-- so pending moderation continues to show the current category names.
update public.website_submissions s
set suggested_categories = array(
  select case value
    when 'art' then 'arts-design-crafts'
    when 'educational' then 'education-learning'
    when 'funny' then 'fun-stuff'
    when 'free' then 'other'
    else value
  end
  from unnest(s.suggested_categories) with ordinality as choices(value, position)
  order by position
)
where s.suggested_categories && array['art', 'educational', 'funny', 'free'];
