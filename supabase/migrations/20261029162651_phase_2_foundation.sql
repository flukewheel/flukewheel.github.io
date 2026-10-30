-- Phase 2 schema. Every public table is protected by RLS and explicit grants below.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or (char_length(username) between 3 and 32 and username ~ '^[A-Za-z0-9_]+$')
  ),
  constraint profiles_avatar_owner_path check (
    avatar_path is null or (
      char_length(avatar_path) <= 256 and
      left(avatar_path, char_length(id::text) + 1) = id::text || '/'
    )
  )
);
create unique index profiles_username_lower_unique
  on public.profiles (lower(username)) where username is not null;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.touch_updated_at();

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  original_url text not null,
  normalised_url text not null unique,
  title text not null,
  description text not null,
  thumbnail_path text,
  approval_status text not null default 'pending',
  active boolean not null default false,
  embedding_status text not null default 'unknown',
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  last_validated_at timestamptz,
  constraint websites_original_url_length check (
    char_length(original_url) between 8 and 2048 and original_url ~* '^https?://'
  ),
  constraint websites_normalised_url_length check (
    char_length(normalised_url) between 8 and 2048 and normalised_url ~* '^https?://'
  ),
  constraint websites_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint websites_description_length check (char_length(btrim(description)) between 1 and 1000),
  constraint websites_thumbnail_path_length check (
    thumbnail_path is null or char_length(thumbnail_path) <= 512
  ),
  constraint websites_approval_status_check check (
    approval_status in ('pending', 'approved', 'rejected')
  ),
  constraint websites_embedding_status_check check (
    embedding_status in ('unknown', 'allowed', 'blocked', 'needs_review')
  ),
  constraint websites_approved_at_check check (
    approval_status <> 'approved' or approved_at is not null
  )
);
create index websites_public_recent_idx
  on public.websites (approved_at desc, id desc)
  where approval_status = 'approved' and active;
create index websites_validation_queue_idx
  on public.websites (last_validated_at asc nulls first, id)
  where approval_status = 'approved' and active;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  description text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (
    char_length(slug) between 2 and 64 and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint categories_display_name_length check (
    char_length(btrim(display_name)) between 1 and 80
  ),
  constraint categories_description_length check (
    char_length(btrim(description)) between 1 and 300
  )
);
create index categories_active_order_idx
  on public.categories (display_order, id) where active;
create trigger categories_updated_at before update on public.categories
  for each row execute function private.touch_updated_at();

create table public.website_categories (
  website_id uuid not null references public.websites (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  primary key (website_id, category_id)
);
create index website_categories_category_website_idx
  on public.website_categories (category_id, website_id);

create table public.user_interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);
create index user_interests_category_id_idx on public.user_interests (category_id);

create table public.website_reactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  website_id uuid not null references public.websites (id) on delete restrict,
  reaction text not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, website_id),
  constraint website_reactions_reaction_check check (reaction in ('love', 'dislike')),
  constraint website_reactions_reason_check check (
    reason is null or (
      reaction = 'dislike' and
      reason in ('not_interested', 'low_quality', 'seen_before', 'broken', 'inappropriate')
    )
  )
);
create index website_reactions_website_id_idx
  on public.website_reactions (website_id);
create trigger website_reactions_updated_at before update on public.website_reactions
  for each row execute function private.touch_updated_at();

create table public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  website_id uuid not null references public.websites (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, website_id)
);
create index bookmarks_user_recent_idx
  on public.bookmarks (user_id, created_at desc, website_id);
create index bookmarks_website_id_idx on public.bookmarks (website_id);

create table public.bump_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  website_id uuid not null references public.websites (id) on delete restrict,
  discovered_at timestamptz not null default now(),
  source text not null,
  request_id uuid not null,
  constraint bump_history_source_check check (
    source in ('bump', 'card', 'bookmark', 'history')
  ),
  constraint bump_history_request_unique unique (user_id, request_id)
);
create index bump_history_user_recent_idx
  on public.bump_history (user_id, discovered_at desc, id desc);
create index bump_history_website_id_idx on public.bump_history (website_id);

create table public.website_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid references auth.users (id) on delete set null,
  raw_url text not null,
  normalised_url text not null,
  suggested_categories text[] not null default '{}',
  description text,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  resolved_website_id uuid references public.websites (id) on delete set null,
  constraint website_submissions_raw_url_length check (
    char_length(raw_url) between 8 and 2048 and raw_url ~* '^https?://'
  ),
  constraint website_submissions_normalised_url_length check (
    char_length(normalised_url) between 8 and 2048 and normalised_url ~* '^https?://'
  ),
  constraint website_submissions_categories_limit check (
    cardinality(suggested_categories) <= 8
  ),
  constraint website_submissions_description_length check (
    description is null or char_length(description) <= 1000
  ),
  constraint website_submissions_status_check check (
    status in ('pending', 'approved', 'rejected', 'duplicate')
  ),
  constraint website_submissions_review_check check (
    (status = 'pending' and reviewed_at is null)
    or (status <> 'pending' and reviewed_at is not null)
  )
);
create index website_submissions_pending_idx
  on public.website_submissions (submitted_at, id) where status = 'pending';
create index website_submissions_submitter_recent_idx
  on public.website_submissions (submitter_id, submitted_at desc, id desc)
  where submitter_id is not null;
create index website_submissions_normalised_url_idx
  on public.website_submissions (normalised_url);
create index website_submissions_reviewed_by_idx
  on public.website_submissions (reviewed_by) where reviewed_by is not null;
create index website_submissions_resolved_website_idx
  on public.website_submissions (resolved_website_id)
  where resolved_website_id is not null;

create table private.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  constraint user_roles_role_check check (role = 'admin')
);

create table private.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_events_action_length check (
    char_length(action) between 1 and 80
  ),
  constraint moderation_events_target_type_check check (
    target_type in ('website', 'submission', 'category', 'user')
  )
);
create index moderation_events_target_recent_idx
  on private.moderation_events (target_type, target_id, created_at desc);
create index moderation_events_actor_recent_idx
  on private.moderation_events (actor_id, created_at desc)
  where actor_id is not null;

create table private.validation_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.website_submissions (id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  response_headers jsonb,
  redirect_chain jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint validation_jobs_status_check check (
    status in ('pending', 'leased', 'complete', 'failed')
  ),
  constraint validation_jobs_attempts_check check (attempts between 0 and 10),
  constraint validation_jobs_last_error_length check (
    last_error is null or char_length(last_error) <= 1000
  )
);
create index validation_jobs_ready_idx
  on private.validation_jobs (next_attempt_at, id) where status = 'pending';
create index validation_jobs_submission_id_idx
  on private.validation_jobs (submission_id);
create trigger validation_jobs_updated_at before update on private.validation_jobs
  for each row execute function private.touch_updated_at();

-- Explicit Data API permissions: new tables are not automatically exposed.
revoke all on table
  public.profiles,
  public.websites,
  public.categories,
  public.website_categories,
  public.user_interests,
  public.website_reactions,
  public.bookmarks,
  public.bump_history,
  public.website_submissions
from public, anon, authenticated;
revoke all on table
  private.user_roles,
  private.moderation_events,
  private.validation_jobs
from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.website_categories to anon, authenticated;
grant select (
  id, original_url, title, description, thumbnail_path, embedding_status, approved_at
) on public.websites to anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, username, avatar_path) on public.profiles to authenticated;
grant update (username, avatar_path) on public.profiles to authenticated;

grant select, insert, delete on public.user_interests to authenticated;
grant select, delete on public.website_reactions to authenticated;
grant insert (user_id, website_id, reaction, reason)
  on public.website_reactions to authenticated;
grant update (reaction, reason) on public.website_reactions to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select on public.bump_history, public.website_submissions to authenticated;

grant usage on schema private to service_role;
grant all on table
  public.profiles,
  public.websites,
  public.categories,
  public.website_categories,
  public.user_interests,
  public.website_reactions,
  public.bookmarks,
  public.bump_history,
  public.website_submissions,
  private.user_roles,
  private.moderation_events,
  private.validation_jobs
to service_role;

alter table public.profiles enable row level security;
alter table public.websites enable row level security;
alter table public.categories enable row level security;
alter table public.website_categories enable row level security;
alter table public.user_interests enable row level security;
alter table public.website_reactions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.bump_history enable row level security;
alter table public.website_submissions enable row level security;
alter table private.user_roles enable row level security;
alter table private.moderation_events enable row level security;
alter table private.validation_jobs enable row level security;

create policy profiles_owner_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_owner_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_owner_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy websites_public_read on public.websites
  for select to anon, authenticated
  using (approval_status = 'approved' and active);
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (active);
create policy website_categories_public_read on public.website_categories
  for select to anon, authenticated
  using (
    exists (select 1 from public.websites w where w.id = website_id)
    and exists (select 1 from public.categories c where c.id = category_id)
  );

create policy user_interests_owner_read on public.user_interests
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_interests_owner_insert on public.user_interests
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_interests_owner_delete on public.user_interests
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy website_reactions_owner_read on public.website_reactions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy website_reactions_owner_insert on public.website_reactions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy website_reactions_owner_update on public.website_reactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy website_reactions_owner_delete on public.website_reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy bookmarks_owner_read on public.bookmarks
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy bookmarks_owner_insert on public.bookmarks
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy bookmarks_owner_delete on public.bookmarks
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy bump_history_owner_read on public.bump_history
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy website_submissions_owner_read on public.website_submissions
  for select to authenticated
  using (submitter_id = (select auth.uid()));

-- Private rows are read and written only by trusted server code using service_role.
-- No anon/authenticated grants or permissive policies exist on private tables.

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values
  ('thumbnails', 'thumbnails', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
