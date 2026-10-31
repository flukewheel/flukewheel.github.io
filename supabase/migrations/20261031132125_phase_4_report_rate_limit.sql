create table private.report_rate (
  user_id uuid not null references auth.users (id) on delete cascade,
  website_id uuid not null references public.websites (id) on delete cascade,
  last_report_at timestamptz not null,
  primary key (user_id, website_id)
);
alter table private.report_rate enable row level security;
revoke all on private.report_rate from public, anon, authenticated;
grant all on private.report_rate to service_role;

create function private.throttle_website_report()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_recorded uuid;
begin
  if new.reaction = 'dislike' and new.reason in ('broken', 'inappropriate', 'low_quality') then
    insert into private.report_rate (user_id, website_id, last_report_at)
    values (new.user_id, new.website_id, now())
    on conflict (user_id, website_id) do update
      set last_report_at = excluded.last_report_at
      where private.report_rate.last_report_at <= now() - interval '1 hour'
    returning website_id into v_recorded;
    if v_recorded is null then
      raise exception 'Please wait before reporting this website again.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.throttle_website_report() from public, anon, authenticated;
create trigger website_reactions_report_rate before insert or update on public.website_reactions
  for each row execute function private.throttle_website_report();
