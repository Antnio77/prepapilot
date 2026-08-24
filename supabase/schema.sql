-- PrépaPilot — Supabase schema (V1)
-- Run with: supabase db push   OR   paste into the Supabase SQL editor.
--
-- Notes:
-- - `users` mirrors auth.users (1:1) so the rest of the schema can foreign-key a plain
--   uuid without depending on the `auth` schema directly.
-- - Every table carries `user_id` + Row Level Security so each student only ever sees
--   their own data.
-- - Row ids are plain `text`, not `uuid`: the app generates its own short ids client-side
--   (some fixed, like "subj-maths", some random) and syncs them as-is — using `uuid` here
--   would reject every insert. Only `user_id` (sourced from Supabase Auth) is a real uuid.
-- - Left ready to extend: `study_sessions.source_type`/`source_id` already generalize to any
--   future generator (AI, premium plans, etc.), and every table has `created_at`/`updated_at`.

-- ---------------------------------------------------------------------------
-- users (profile row, 1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  color_key text not null default 'autre'
    check (color_key in ('maths', 'physique', 'chimie', 'si', 'francais', 'anglais', 'tipe', 'autre')),
  max_sessions_per_day smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent migration for tables created before this column existed.
alter table public.subjects add column if not exists max_sessions_per_day smallint not null default 3;

-- ---------------------------------------------------------------------------
-- chapters
-- ---------------------------------------------------------------------------
create table if not exists public.chapters (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  name text not null,
  mastery smallint not null default 0 check (mastery between 0 and 100),
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  last_reviewed_at date,
  sessions_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- schedule_events (fixed weekly timetable — cours)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_events (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id text references public.subjects (id) on delete set null,
  title text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Lundi..6=Dimanche
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- availability (recurring weekly free blocks + one-off unavailable periods)
-- ---------------------------------------------------------------------------
create table if not exists public.availability (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create table if not exists public.unavailable_periods (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- exams (DS)
-- ---------------------------------------------------------------------------
create table if not exists public.exams (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  name text not null,
  date date not null,
  duration integer not null default 120, -- minutes
  chapter_ids text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- oral_exams (colles)
-- ---------------------------------------------------------------------------
create table if not exists public.oral_exams (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  date date not null,
  time time,
  theme text not null,
  chapter_ids text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- assignments (DM / devoirs)
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  title text not null,
  due_date date not null,
  estimated_duration integer not null default 60, -- minutes
  importance smallint not null default 3 check (importance between 1 and 5),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- study_sessions (generated or manual work blocks)
-- ---------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id text references public.subjects (id) on delete set null,
  chapter_id text references public.chapters (id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null,
  title text not null,
  type text not null check (
    type in ('cours', 'exercices', 'preparation_ds', 'preparation_colle', 'devoir', 'revision', 'pause')
  ),
  priority text check (priority in ('haute', 'moyenne', 'basse')),
  priority_score numeric not null default 0,
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'termine', 'ignore')),
  reason text default '',
  source_type text check (source_type in ('exam', 'oral', 'assignment', 'spaced')),
  source_id text,
  actual_minutes integer not null default 0,
  auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_sessions_user_date_idx on public.study_sessions (user_id, date);
create index if not exists chapters_subject_idx on public.chapters (subject_id);
create index if not exists exams_user_date_idx on public.exams (user_id, date);
create index if not exists oral_exams_user_date_idx on public.oral_exams (user_id, date);
create index if not exists assignments_user_due_idx on public.assignments (user_id, due_date);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is scoped to the authenticated owner
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.schedule_events enable row level security;
alter table public.availability enable row level security;
alter table public.unavailable_periods enable row level security;
alter table public.exams enable row level security;
alter table public.oral_exams enable row level security;
alter table public.assignments enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Users manage their own row" on public.users;
create policy "Users manage their own row" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'subjects', 'chapters', 'schedule_events', 'availability', 'unavailable_periods',
      'exams', 'oral_exams', 'assignments', 'study_sessions'
    ])
  loop
    execute format('drop policy if exists "Owner full access" on public.%I;', t);
    execute format(
      'create policy "Owner full access" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- Auto-create a public.users row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
