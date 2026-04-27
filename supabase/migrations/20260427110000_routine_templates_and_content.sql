create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  goal text not null,
  experience text not null,
  days_per_week int not null check (days_per_week between 2 and 6),
  short_description text not null,
  duration_weeks int not null check (duration_weeks between 4 and 16),
  estimated_session_minutes int not null check (estimated_session_minutes between 25 and 120),
  level_label text not null,
  focus_areas text[] not null default '{}',
  routine_data jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_templates_goal_check check (goal in ('ganar_masa_muscular','bajar_grasa','mejorar_resistencia','mejorar_condicion_general')),
  constraint routine_templates_experience_check check (experience in ('principiante','intermedio','avanzado'))
);

create index if not exists routine_templates_goal_exp_days_idx on public.routine_templates(goal, experience, days_per_week);
create index if not exists routine_templates_active_idx on public.routine_templates(is_active);

create trigger set_routine_templates_updated_at
before update on public.routine_templates
for each row
execute function public.set_updated_at();

alter table public.routine_templates enable row level security;

create policy "routine_templates_read_authenticated"
on public.routine_templates
for select
to authenticated
using (is_active = true);
