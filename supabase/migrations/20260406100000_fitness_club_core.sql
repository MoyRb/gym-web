-- FITNESS CLUB - Core schema for Auth + Profile + Routines + Resources + Analytics
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age int,
  sex text,
  weight_kg numeric,
  height_cm numeric,
  experience text,
  goal text,
  days_per_week int,
  bmi numeric,
  bmi_category text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_age_check check (age is null or age between 14 and 100),
  constraint profiles_days_per_week_check check (days_per_week is null or days_per_week between 1 and 7)
);

create table if not exists public.routine_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  goal text not null,
  experience text not null,
  days_per_week int not null,
  routine_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_recommendations_user_unique unique(user_id)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  file_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_resource_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists profiles_goal_idx on public.profiles(goal);
create index if not exists profiles_bmi_category_idx on public.profiles(bmi_category);
create index if not exists routine_recommendations_user_id_idx on public.routine_recommendations(user_id);
create index if not exists resources_active_category_idx on public.resources(is_active, category);
create index if not exists analytics_events_user_event_idx on public.analytics_events(user_id, event_type);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists user_resource_downloads_user_id_idx on public.user_resource_downloads(user_id);
create index if not exists user_resource_downloads_resource_id_idx on public.user_resource_downloads(resource_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_routine_recommendations_updated_at
before update on public.routine_recommendations
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.routine_recommendations enable row level security;
alter table public.resources enable row level security;
alter table public.analytics_events enable row level security;
alter table public.user_resource_downloads enable row level security;

-- profiles: each user can only read/write own profile
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- routine_recommendations: each user can only read/write own recommendation
create policy "routine_select_own"
on public.routine_recommendations
for select
to authenticated
using (auth.uid() = user_id);

create policy "routine_insert_own"
on public.routine_recommendations
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "routine_update_own"
on public.routine_recommendations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- resources: readable by authenticated users only
create policy "resources_read_authenticated"
on public.resources
for select
to authenticated
using (is_active = true);

-- analytics_events: users can insert their own/null events; no broad read policy
create policy "analytics_insert_authenticated"
on public.analytics_events
for insert
to authenticated
with check (user_id is null or user_id = auth.uid());

create policy "analytics_select_own"
on public.analytics_events
for select
to authenticated
using (user_id = auth.uid());

-- downloads: users can insert/read their own download rows
create policy "downloads_select_own"
on public.user_resource_downloads
for select
to authenticated
using (user_id = auth.uid());

create policy "downloads_insert_own"
on public.user_resource_downloads
for insert
to authenticated
with check (user_id = auth.uid());

-- helper function: auto-create base profile at signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
