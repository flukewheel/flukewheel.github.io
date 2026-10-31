-- Reports are personal reactions; administrators only see aggregate review signals.
create table private.report_reviews (
  website_id uuid primary key references public.websites (id) on delete cascade,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  note text not null,
  constraint report_reviews_note_length check (char_length(btrim(note)) between 1 and 1000)
);
alter table private.report_reviews enable row level security;
revoke all on private.report_reviews from public, anon, authenticated;
grant all on private.report_reviews to service_role;

create index website_reactions_report_review_idx
  on public.website_reactions (website_id, updated_at desc)
  where reason in ('broken', 'inappropriate', 'low_quality');

create function public.admin_report_queue(p_actor_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_items jsonb;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'website_id', item.website_id, 'title', item.title, 'original_url', item.original_url,
    'active', item.active, 'broken', item.broken, 'inappropriate', item.inappropriate,
    'low_quality', item.low_quality, 'last_reported_at', item.last_reported_at
  ) order by item.last_reported_at desc, item.website_id), '[]'::jsonb)
  into v_items
  from (
    select w.id as website_id, w.title, w.original_url, w.active,
      count(*) filter (where r.reason = 'broken')::integer as broken,
      count(*) filter (where r.reason = 'inappropriate')::integer as inappropriate,
      count(*) filter (where r.reason = 'low_quality')::integer as low_quality,
      max(r.updated_at) as last_reported_at
    from public.website_reactions r
    join public.websites w on w.id = r.website_id
    left join private.report_reviews review on review.website_id = w.id
    where r.reaction = 'dislike'
      and r.reason in ('broken', 'inappropriate', 'low_quality')
      and r.updated_at > coalesce(review.reviewed_at, '-infinity'::timestamptz)
    group by w.id
    order by max(r.updated_at) desc, w.id
    limit 50
  ) item;
  return v_items;
end;
$$;
revoke all on function public.admin_report_queue(uuid) from public, anon, authenticated;
grant execute on function public.admin_report_queue(uuid) to service_role;

create function public.review_reports(p_actor_id uuid, p_website_id uuid, p_note text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 1 and 1000 then
    raise exception 'review note required' using errcode = '22023';
  end if;
  perform 1 from public.websites where id = p_website_id and approval_status = 'approved';
  if not found then raise exception 'website not found' using errcode = 'P0002'; end if;
  insert into private.report_reviews (website_id, reviewed_by, reviewed_at, note)
  values (p_website_id, p_actor_id, now(), btrim(p_note))
  on conflict (website_id) do update
  set reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at, note = excluded.note;
  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'reports_reviewed', 'website', p_website_id,
    pg_catalog.jsonb_build_object('note', p_note));
  return p_website_id;
end;
$$;
revoke all on function public.review_reports(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.review_reports(uuid, uuid, text) to service_role;

-- A bounded daily SQL job queues stale catalogue entries for manual review.
create table private.catalogue_recheck_jobs (
  website_id uuid primary key references public.websites (id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  checked_at timestamptz,
  checked_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_recheck_status_check check (status in ('pending', 'complete', 'failed')),
  constraint catalogue_recheck_attempts_check check (attempts between 0 and 3),
  constraint catalogue_recheck_note_length check (note is null or char_length(note) <= 1000),
  constraint catalogue_recheck_url_length check (checked_url is null or char_length(checked_url) <= 2048)
);
create index catalogue_recheck_ready_idx
  on private.catalogue_recheck_jobs (next_attempt_at, website_id)
  where status in ('pending', 'failed');
create trigger catalogue_recheck_updated_at before update on private.catalogue_recheck_jobs
  for each row execute function private.touch_updated_at();
alter table private.catalogue_recheck_jobs enable row level security;
revoke all on private.catalogue_recheck_jobs from public, anon, authenticated;
grant all on private.catalogue_recheck_jobs to service_role;

create function private.enqueue_catalogue_rechecks()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  with stale as (
    select w.id from public.websites w
    left join private.catalogue_recheck_jobs j on j.website_id = w.id
    where w.approval_status = 'approved' and w.active
      and (w.last_validated_at is null or w.last_validated_at < now() - interval '30 days')
      and (j.website_id is null or j.status = 'complete'
        or (j.status = 'failed' and j.attempts < 3 and j.next_attempt_at <= now()))
    order by w.last_validated_at asc nulls first, w.id
    limit 25
  ), queued as (
    insert into private.catalogue_recheck_jobs (website_id, status, next_attempt_at)
    select id, 'pending', now() from stale
    on conflict (website_id) do update
      set status = 'pending', next_attempt_at = now(), note = null
    returning website_id
  ) select count(*) into v_count from queued;
  return v_count;
end;
$$;
revoke all on function private.enqueue_catalogue_rechecks() from public, anon, authenticated;

create function public.admin_recheck_queue(p_actor_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_items jsonb;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'website_id', item.website_id, 'title', item.title, 'original_url', item.original_url,
    'status', item.status, 'attempts', item.attempts,
    'last_validated_at', item.last_validated_at, 'note', item.note
  ) order by item.last_validated_at asc nulls first, item.website_id), '[]'::jsonb)
  into v_items
  from (
    select j.website_id, w.title, w.original_url, j.status, j.attempts,
      w.last_validated_at, j.note
    from private.catalogue_recheck_jobs j
    join public.websites w on w.id = j.website_id
    where j.status in ('pending', 'failed') and w.active and w.approval_status = 'approved'
    order by w.last_validated_at asc nulls first, j.website_id
    limit 50
  ) item;
  return v_items;
end;
$$;
revoke all on function public.admin_recheck_queue(uuid) from public, anon, authenticated;
grant execute on function public.admin_recheck_queue(uuid) to service_role;

create function public.complete_recheck(
  p_actor_id uuid, p_website_id uuid, p_outcome text, p_checked_url text, p_note text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_attempts integer;
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if p_outcome not in ('allowed', 'blocked', 'needs_review', 'failed')
    or char_length(btrim(coalesce(p_note, ''))) not between 10 and 1000
    or char_length(coalesce(p_checked_url, '')) > 2048
    or (p_checked_url is not null and p_checked_url !~* '^https?://')
  then
    raise exception 'invalid recheck' using errcode = '22023';
  end if;
  select attempts into v_attempts from private.catalogue_recheck_jobs
  where website_id = p_website_id and status in ('pending', 'failed') for update;
  if not found then raise exception 'recheck not found' using errcode = 'P0002'; end if;
  if p_outcome = 'failed' then
    update private.catalogue_recheck_jobs
    set status = 'failed', attempts = least(3, v_attempts + 1),
      next_attempt_at = now() + interval '7 days', note = btrim(p_note),
      checked_url = p_checked_url, checked_at = now()
    where website_id = p_website_id;
  else
    update public.websites
    set embedding_status = p_outcome, last_validated_at = now()
    where id = p_website_id;
    update private.catalogue_recheck_jobs
    set status = 'complete', note = btrim(p_note), checked_url = p_checked_url,
      checked_at = now()
    where website_id = p_website_id;
  end if;
  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'recheck_' || p_outcome, 'website', p_website_id,
    pg_catalog.jsonb_build_object('checked_url', p_checked_url, 'note', p_note));
  return p_website_id;
end;
$$;
revoke all on function public.complete_recheck(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_recheck(uuid, uuid, text, text, text)
  to service_role;

-- Ordinary catalogue edits do not constitute a new compatibility check.
create or replace function public.manage_website(
  p_actor_id uuid, p_website_id uuid, p_title text, p_description text,
  p_thumbnail_path text, p_category_ids uuid[], p_active boolean,
  p_embedding_status text, p_note text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.catalogue_admin(p_actor_id) then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
    or char_length(btrim(coalesce(p_description, ''))) not between 1 and 1000
    or coalesce(cardinality(p_category_ids), 0) not between 1 and 8
    or (select count(distinct id) from public.categories
        where id = any(p_category_ids) and active) <> cardinality(p_category_ids)
    or p_embedding_status not in ('unknown', 'allowed', 'blocked', 'needs_review')
    or char_length(coalesce(p_thumbnail_path, '')) > 512
    or char_length(btrim(coalesce(p_note, ''))) not between 1 and 1000
  then
    raise exception 'invalid catalogue edit' using errcode = '22023';
  end if;
  perform 1 from public.websites where id = p_website_id and approval_status = 'approved' for update;
  if not found then raise exception 'website not found' using errcode = 'P0002'; end if;
  update public.websites
  set title = btrim(p_title), description = btrim(p_description),
    thumbnail_path = nullif(btrim(p_thumbnail_path), ''), active = p_active,
    embedding_status = p_embedding_status
  where id = p_website_id;
  delete from public.website_categories where website_id = p_website_id;
  insert into public.website_categories (website_id, category_id)
  select p_website_id, unnest(p_category_ids);
  insert into private.moderation_events (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'edit', 'website', p_website_id,
    pg_catalog.jsonb_build_object('note', p_note, 'active', p_active, 'embedding_status', p_embedding_status));
  return p_website_id;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('flukewheel-catalogue-rechecks', '0 3 * * *',
  'select private.enqueue_catalogue_rechecks()');
