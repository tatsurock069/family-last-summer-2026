create extension if not exists pgcrypto;

create table if not exists public.family_trips (
  id uuid primary key,
  name text not null,
  join_code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null check (profile_id in ('parent','yusuke','ayana','keisuke','anna','haruna')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (trip_id,user_id)
);

create table if not exists public.capture_requests (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  request_key text not null,
  requester_profile text not null,
  mission_id text not null,
  status text not null check (status in ('requested','completed','cancelled')),
  photographed boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id,request_key)
);

alter table public.family_trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.capture_requests enable row level security;

create policy "members can see own membership"
on public.trip_members for select to authenticated
using (user_id = (select auth.uid()));

create policy "members can update own profile"
on public.trip_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "family members can read capture requests"
on public.capture_requests for select to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
));

create policy "family members can add capture requests"
on public.capture_requests for insert to authenticated
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
));

create policy "family members can update capture requests"
on public.capture_requests for update to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
));

create or replace function public.join_family_trip(
  p_trip_id uuid,
  p_join_code text,
  p_profile_id text
) returns uuid
language plpgsql
security definer
set search_path = public,extensions
as $$
declare
  matched_trip uuid;
begin
  if p_profile_id not in ('parent','yusuke','ayana','keisuke','anna','haruna') then
    raise exception 'invalid profile';
  end if;

  select id into matched_trip
  from public.family_trips
  where id = p_trip_id
    and join_code_hash = crypt(upper(trim(p_join_code)),join_code_hash);

  if matched_trip is null then
    raise exception 'invalid family code';
  end if;

  insert into public.trip_members (trip_id,user_id,profile_id)
  values (matched_trip,(select auth.uid()),p_profile_id)
  on conflict (trip_id,user_id)
  do update set profile_id = excluded.profile_id,last_seen_at = now();

  return matched_trip;
end;
$$;

revoke all on function public.join_family_trip(uuid,text,text) from public;
grant execute on function public.join_family_trip(uuid,text,text) to authenticated;

grant select,update on public.trip_members to authenticated;
grant select,insert,update on public.capture_requests to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.capture_requests;
exception when duplicate_object then null;
end $$;
