-- Run against the local stack. Quota counters remain unchanged after rollback.
begin;
set local role anon;

do $$
declare
  eligible uuid[];
  target uuid;
  seen uuid[];
  picked uuid;
  repeated uuid;
begin
  select array_agg(w.id order by w.id) into eligible
  from public.websites w
  where w.approval_status = 'approved' and w.active
    and w.embedding_status = 'allowed'
    and w.original_url !~* '^https?://flukewheel\.github\.io(?::[0-9]+)?(/|$)';
  if cardinality(eligible) <= 20 or cardinality(eligible) > 5000 then
    raise exception 'cycle fixture needs between 21 and 5000 eligible sites';
  end if;
  target := eligible[1];
  seen := array_remove(eligible, target);

  select website_id into picked from public.select_bump_website(
    null, seen, seen[cardinality(seen)], gen_random_uuid(), 0.5
  );
  if picked is distinct from target then
    raise exception 'All interests repeated before every eligible site was seen';
  end if;

  select website_id into repeated from public.select_bump_website(
    null, eligible, target, gen_random_uuid(), 0.5
  );
  if repeated is null or repeated = target then
    raise exception 'All interests did not start a new cycle after exhausting the catalogue';
  end if;
end;
$$;

rollback;
