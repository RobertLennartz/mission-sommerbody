-- Mission Sommerbody: tables.
-- Ranges in the CHECK constraints mirror lib/limits.ts, so a buggy call can
-- never store nonsense even if form validation is bypassed.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z]+$'),
  name text not null check (char_length(name) between 1 and 40),
  sort_order smallint not null default 0,
  birth_year smallint check (birth_year between 1930 and 2012),
  height_cm numeric(4, 1) check (height_cm between 120 and 230),
  protein_target_g_per_kg numeric(3, 1) not null default 2.0
    check (protein_target_g_per_kg between 0.8 and 3.5),
  steps_target integer not null default 10000 check (steps_target between 1000 and 50000),
  strength_target_per_week smallint not null default 3 check (strength_target_per_week between 0 and 14),
  cardio_target_per_week smallint not null default 3 check (cardio_target_per_week between 0 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Checkups
-- ---------------------------------------------------------------------------

create table public.checkups (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  type text not null check (type in ('start', 'interim', 'end')),
  date date not null,
  weight_kg numeric(5, 2) check (weight_kg between 40 and 200),
  neck_cm numeric(4, 1) check (neck_cm between 25 and 60),
  chest_cm numeric(4, 1) check (chest_cm between 60 and 180),
  waist_cm numeric(4, 1) check (waist_cm between 50 and 180),
  hips_cm numeric(4, 1) check (hips_cm between 60 and 180),
  upper_arm_left_cm numeric(4, 1) check (upper_arm_left_cm between 15 and 60),
  upper_arm_right_cm numeric(4, 1) check (upper_arm_right_cm between 15 and 60),
  forearm_cm numeric(4, 1) check (forearm_cm between 15 and 50),
  thigh_left_cm numeric(4, 1) check (thigh_left_cm between 30 and 100),
  thigh_right_cm numeric(4, 1) check (thigh_right_cm between 30 and 100),
  calf_left_cm numeric(4, 1) check (calf_left_cm between 20 and 70),
  calf_right_cm numeric(4, 1) check (calf_right_cm between 20 and 70),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, type)
);

create table public.checkup_skinfolds (
  checkup_id uuid not null references public.checkups (id) on delete cascade,
  site text not null check (
    site in ('chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh')
  ),
  reading_no smallint not null check (reading_no between 1 and 3),
  value_mm numeric(4, 1) not null check (value_mm between 2 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (checkup_id, site, reading_no)
);

-- ---------------------------------------------------------------------------
-- Daily values and nutrition
-- ---------------------------------------------------------------------------

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  date date not null,
  steps integer check (steps between 0 and 100000),
  weight_kg numeric(5, 2) check (weight_kg between 40 and 200),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 16),
  energy smallint check (energy between 1 and 5),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, date)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null default '' check (char_length(description) <= 500),
  protein_g numeric(5, 1) check (protein_g between 0 and 300),
  kcal integer check (kcal between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meals_athlete_date_idx on public.meals (athlete_id, date);

-- ---------------------------------------------------------------------------
-- Training
-- ---------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercises_name_ci_idx on public.exercises (lower(btrim(name)));

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  category text not null check (category in ('strength', 'cardio', 'hiit')),
  default_duration_min smallint check (default_duration_min between 1 and 600),
  activity text check (char_length(activity) <= 60),
  default_distance_km numeric(5, 2) check (default_distance_km between 0 and 300),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.plan_templates (id) on delete cascade,
  position smallint not null check (position >= 1),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  target_sets smallint check (target_sets between 1 and 20),
  target_reps text check (char_length(target_reps) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plan_template_exercises_template_idx on public.plan_template_exercises (template_id, position);

create table public.week_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.week_template_items (
  id uuid primary key default gen_random_uuid(),
  week_template_id uuid not null references public.week_templates (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  slot smallint not null default 1 check (slot >= 1),
  plan_template_id uuid not null references public.plan_templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index week_template_items_template_idx on public.week_template_items (week_template_id, weekday, slot);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  date date not null,
  slot smallint not null default 1 check (slot >= 1),
  category text not null check (category in ('strength', 'cardio', 'hiit')),
  title text not null check (char_length(title) between 1 and 80),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  duration_min smallint check (duration_min between 1 and 600),
  rpe smallint check (rpe between 1 and 10),
  activity text check (char_length(activity) <= 60),
  distance_km numeric(5, 2) check (distance_km between 0 and 300),
  avg_hr smallint check (avg_hr between 40 and 220),
  notes text check (char_length(notes) <= 4000),
  template_id uuid references public.plan_templates (id) on delete set null,
  pair_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_athlete_date_idx on public.sessions (athlete_id, date, slot);
create index sessions_pair_idx on public.sessions (pair_id) where pair_id is not null;

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  position smallint not null check (position >= 1),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  target_sets smallint check (target_sets between 1 and 20),
  target_reps text check (char_length(target_reps) <= 20),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);

create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_no smallint not null check (set_no between 1 and 30),
  reps smallint check (reps between 0 and 100),
  weight_kg numeric(5, 2) check (weight_kg between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, set_no)
);

-- ---------------------------------------------------------------------------
-- Login brake
-- ---------------------------------------------------------------------------

create table public.login_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_ip_time_idx on public.login_attempts (ip_hash, attempted_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'athletes', 'checkups', 'checkup_skinfolds', 'daily_logs', 'meals', 'exercises',
    'plan_templates', 'plan_template_exercises', 'week_templates', 'week_template_items',
    'sessions', 'session_exercises', 'session_sets'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;
