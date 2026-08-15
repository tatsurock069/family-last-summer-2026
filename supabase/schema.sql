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
  requester_profile text not null check (requester_profile in ('parent','yusuke','ayana','keisuke','anna','haruna')),
  mission_id text not null,
  status text not null check (status in ('requested','completed','cancelled')),
  photographed boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id,request_key)
);

update public.capture_requests
set requester_profile = case requester_profile
  when '優典' then 'yusuke' when '綾菜' then 'ayana' when '慶典' then 'keisuke'
  when '杏菜' then 'anna' when '波瑠菜' then 'haruna' else requester_profile end;

do $$
begin
  alter table public.capture_requests add constraint capture_requests_requester_profile_check
    check (requester_profile in ('parent','yusuke','ayana','keisuke','anna','haruna'));
exception when duplicate_object then null;
end $$;

create table if not exists public.mission_progress (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  profile_id text not null check (profile_id in ('yusuke','ayana','keisuke','anna','haruna')),
  mission_id text not null,
  completed boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (trip_id,profile_id,mission_id)
);

create table if not exists public.shot_progress (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  shot_id text not null,
  completed boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (trip_id,shot_id)
);

alter table public.family_trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.capture_requests enable row level security;
alter table public.mission_progress enable row level security;
alter table public.shot_progress enable row level security;

drop policy if exists "members can see own membership" on public.trip_members;
create policy "members can see own membership"
on public.trip_members for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members can update own profile" on public.trip_members;
create policy "members can update own profile"
on public.trip_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "family members can read capture requests" on public.capture_requests;
drop policy if exists "parent and requester can read capture requests" on public.capture_requests;
create policy "parent and requester can read capture requests"
on public.capture_requests for select to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or m.profile_id = capture_requests.requester_profile)
));

drop policy if exists "family members can add capture requests" on public.capture_requests;
drop policy if exists "members can add own capture requests" on public.capture_requests;
create policy "members can add own capture requests"
on public.capture_requests for insert to authenticated
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
    and m.profile_id = capture_requests.requester_profile
));

drop policy if exists "family members can update capture requests" on public.capture_requests;
drop policy if exists "parent completes requester manages capture requests" on public.capture_requests;
create policy "parent completes requester manages capture requests"
on public.capture_requests for update to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or m.profile_id = capture_requests.requester_profile)
))
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = capture_requests.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or (
      m.profile_id = capture_requests.requester_profile
      and capture_requests.status in ('requested','cancelled')
      and capture_requests.photographed = false
    ))
));

drop policy if exists "parent reads every mission progress" on public.mission_progress;
create policy "parent reads every mission progress"
on public.mission_progress for select to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = mission_progress.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or m.profile_id = mission_progress.profile_id)
));

drop policy if exists "parent or owner adds mission progress" on public.mission_progress;
create policy "parent or owner adds mission progress"
on public.mission_progress for insert to authenticated
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = mission_progress.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or m.profile_id = mission_progress.profile_id)
));

drop policy if exists "parent or owner updates mission progress" on public.mission_progress;
create policy "parent or owner updates mission progress"
on public.mission_progress for update to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = mission_progress.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or m.profile_id = mission_progress.profile_id)
))
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = mission_progress.trip_id and m.user_id = (select auth.uid())
    and (m.profile_id = 'parent' or m.profile_id = mission_progress.profile_id)
));

drop policy if exists "shooting team reads shot progress" on public.shot_progress;
create policy "shooting team reads shot progress"
on public.shot_progress for select to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = shot_progress.trip_id and m.user_id = (select auth.uid())
    and m.profile_id in ('parent','yusuke','ayana')
));

drop policy if exists "shooting team adds shot progress" on public.shot_progress;
create policy "shooting team adds shot progress"
on public.shot_progress for insert to authenticated
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = shot_progress.trip_id and m.user_id = (select auth.uid())
    and m.profile_id in ('parent','yusuke','ayana')
));

drop policy if exists "shooting team updates shot progress" on public.shot_progress;
create policy "shooting team updates shot progress"
on public.shot_progress for update to authenticated
using (exists (
  select 1 from public.trip_members m
  where m.trip_id = shot_progress.trip_id and m.user_id = (select auth.uid())
    and m.profile_id in ('parent','yusuke','ayana')
))
with check (exists (
  select 1 from public.trip_members m
  where m.trip_id = shot_progress.trip_id and m.user_id = (select auth.uid())
    and m.profile_id in ('parent','yusuke','ayana')
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
grant select,insert,update on public.mission_progress to authenticated;
grant select,insert,update on public.shot_progress to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.capture_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mission_progress;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shot_progress;
exception when duplicate_object then null;
end $$;

-- v18: trip operations, approvals, and role hardening
alter table public.family_trips add column if not exists admin_pin_hash text;
alter table public.mission_progress add column if not exists status text;
update public.mission_progress set status = case when completed then 'approved' else 'rejected' end where status is null;
alter table public.mission_progress alter column status set default 'pending';
alter table public.mission_progress alter column status set not null;
do $$ begin
  alter table public.mission_progress add constraint mission_progress_status_check check (status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;

alter table public.shot_progress add column if not exists status text;
alter table public.shot_progress add column if not exists assigned_profile text;
update public.shot_progress set status = case when completed then 'done' else 'open' end where status is null;
alter table public.shot_progress alter column status set default 'open';
alter table public.shot_progress alter column status set not null;
do $$ begin
  alter table public.shot_progress add constraint shot_progress_status_check check (status in ('open','done','retake'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.shot_progress add constraint shot_progress_assigned_profile_check check (assigned_profile is null or assigned_profile in ('parent','yusuke','ayana'));
exception when duplicate_object then null; end $$;

create table if not exists public.expenses (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  expense_id text not null,
  name text not null,
  amount integer not null check (amount >= 0),
  category text not null,
  deleted boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (trip_id,expense_id)
);

create table if not exists public.trip_runtime (
  trip_id uuid primary key references public.family_trips(id) on delete cascade,
  current_step_index integer not null default 0 check (current_step_index between 0 and 8),
  delay_minutes integer not null default 0 check (delay_minutes between -180 and 720),
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_items (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  item_id text not null,
  category text not null,
  name text not null,
  qty text not null default '',
  completed boolean not null default false,
  assigned_profile text,
  custom boolean not null default false,
  deleted boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (trip_id,item_id)
);

create table if not exists public.packing_progress (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  item_id text not null,
  completed boolean not null default false,
  assigned_profile text,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (trip_id,item_id)
);

create table if not exists public.meal_progress (
  trip_id uuid not null references public.family_trips(id) on delete cascade,
  item_id text not null,
  completed boolean not null default false,
  actor_profile text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (trip_id,item_id)
);

alter table public.expenses enable row level security;
alter table public.trip_runtime enable row level security;
alter table public.shopping_items enable row level security;
alter table public.packing_progress enable row level security;
alter table public.meal_progress enable row level security;

drop policy if exists "members can update own profile" on public.trip_members;
revoke update on public.trip_members from authenticated;

drop policy if exists "parent or owner adds mission progress" on public.mission_progress;
drop policy if exists "parent or owner updates mission progress" on public.mission_progress;
create policy "parent or owner adds mission progress" on public.mission_progress for insert to authenticated
with check (exists (select 1 from public.trip_members m where m.trip_id=mission_progress.trip_id and m.user_id=(select auth.uid()) and
  (m.profile_id='parent' or (m.profile_id=mission_progress.profile_id and mission_progress.completed=false and mission_progress.status in ('pending','rejected')))));
create policy "parent or owner updates mission progress" on public.mission_progress for update to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=mission_progress.trip_id and m.user_id=(select auth.uid()) and (m.profile_id='parent' or m.profile_id=mission_progress.profile_id)))
with check (exists (select 1 from public.trip_members m where m.trip_id=mission_progress.trip_id and m.user_id=(select auth.uid()) and
  (m.profile_id='parent' or (m.profile_id=mission_progress.profile_id and mission_progress.completed=false and mission_progress.status in ('pending','rejected')))));

drop policy if exists "parent manages expenses" on public.expenses;
create policy "parent manages expenses" on public.expenses for all to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=expenses.trip_id and m.user_id=(select auth.uid()) and m.profile_id='parent'))
with check (exists (select 1 from public.trip_members m where m.trip_id=expenses.trip_id and m.user_id=(select auth.uid()) and m.profile_id='parent'));

drop policy if exists "family reads runtime" on public.trip_runtime;
drop policy if exists "parent manages runtime" on public.trip_runtime;
drop policy if exists "parent updates runtime" on public.trip_runtime;
create policy "family reads runtime" on public.trip_runtime for select to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=trip_runtime.trip_id and m.user_id=(select auth.uid())));
create policy "parent manages runtime" on public.trip_runtime for insert to authenticated
with check (exists (select 1 from public.trip_members m where m.trip_id=trip_runtime.trip_id and m.user_id=(select auth.uid()) and m.profile_id='parent'));
create policy "parent updates runtime" on public.trip_runtime for update to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=trip_runtime.trip_id and m.user_id=(select auth.uid()) and m.profile_id='parent'))
with check (exists (select 1 from public.trip_members m where m.trip_id=trip_runtime.trip_id and m.user_id=(select auth.uid()) and m.profile_id='parent'));

drop policy if exists "family manages shopping" on public.shopping_items;
drop policy if exists "family manages packing" on public.packing_progress;
drop policy if exists "family manages meal" on public.meal_progress;
create policy "family manages shopping" on public.shopping_items for all to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=shopping_items.trip_id and m.user_id=(select auth.uid())))
with check (exists (select 1 from public.trip_members m where m.trip_id=shopping_items.trip_id and m.user_id=(select auth.uid())));
create policy "family manages packing" on public.packing_progress for all to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=packing_progress.trip_id and m.user_id=(select auth.uid())))
with check (exists (select 1 from public.trip_members m where m.trip_id=packing_progress.trip_id and m.user_id=(select auth.uid())));
create policy "family manages meal" on public.meal_progress for all to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id=meal_progress.trip_id and m.user_id=(select auth.uid())))
with check (exists (select 1 from public.trip_members m where m.trip_id=meal_progress.trip_id and m.user_id=(select auth.uid())));

drop function if exists public.join_family_trip(uuid,text,text);
create function public.join_family_trip(p_trip_id uuid,p_join_code text,p_profile_id text,p_admin_pin text default null) returns uuid
language plpgsql security definer set search_path=public,extensions as $$
declare matched_trip uuid;
begin
  if p_profile_id not in ('parent','yusuke','ayana','keisuke','anna','haruna') then raise exception 'invalid profile'; end if;
  select id into matched_trip from public.family_trips where id=p_trip_id and join_code_hash=crypt(upper(trim(p_join_code)),join_code_hash)
    and (p_profile_id<>'parent' or (admin_pin_hash is not null and admin_pin_hash=crypt(trim(p_admin_pin),admin_pin_hash)));
  if matched_trip is null then raise exception 'invalid family code or admin pin'; end if;
  insert into public.trip_members(trip_id,user_id,profile_id) values(matched_trip,(select auth.uid()),p_profile_id)
  on conflict(trip_id,user_id) do update set profile_id=excluded.profile_id,last_seen_at=now();
  return matched_trip;
end; $$;
revoke all on function public.join_family_trip(uuid,text,text,text) from public;
grant execute on function public.join_family_trip(uuid,text,text,text) to authenticated;

grant select,insert,update on public.expenses,public.trip_runtime,public.shopping_items,public.packing_progress,public.meal_progress to authenticated;
do $$ begin alter publication supabase_realtime add table public.expenses; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.trip_runtime; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shopping_items; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.packing_progress; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.meal_progress; exception when duplicate_object then null; end $$;
