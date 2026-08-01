-- Odyssey Supabase foundation
-- Run in Supabase SQL editor after enabling Auth email/password.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('student','instructor','institution','admin','support');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active','pending','suspended','deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_status as enum ('draft','review','published','suspended','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','paid','failed','refunded','chargeback');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_plan as enum ('free','pro','institutional');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  status public.account_status not null default 'active',
  full_name text not null default '',
  email text not null,
  phone text,
  country text,
  city text,
  avatar_url text,
  timezone text default 'UTC',
  preferred_language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  student_code text unique not null default lpad((floor(random()*1000000000000))::bigint::text, 12, '0'),
  learning_goal text,
  grade_level text,
  school_name text,
  guardian_email text,
  profile_visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  instructor_code text unique not null default 'INS-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,12)),
  title text,
  bio text,
  expertise text[],
  teaching_languages text[] default array['English'],
  verification_status text not null default 'pending',
  payout_method text,
  payout_country text,
  public_profile boolean not null default true,
  rating numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.instructor_profiles add column if not exists instructor_code text unique default 'INS-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,12));
alter table public.instructor_profiles add column if not exists title text;
alter table public.instructor_profiles add column if not exists bio text;
alter table public.instructor_profiles add column if not exists expertise text[];
alter table public.instructor_profiles add column if not exists teaching_languages text[] default array['English'];
alter table public.instructor_profiles add column if not exists verification_status text not null default 'pending';
alter table public.instructor_profiles add column if not exists payout_method text;
alter table public.instructor_profiles add column if not exists payout_country text;
alter table public.instructor_profiles add column if not exists public_profile boolean not null default true;
alter table public.instructor_profiles add column if not exists rating numeric(3,2) not null default 0;
alter table public.instructor_profiles add column if not exists created_at timestamptz not null default now();
alter table public.instructor_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.institution_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  institution_name text not null,
  institution_type text,
  business_email text not null,
  subject_area text,
  instructor_count integer default 0 check (instructor_count >= 0),
  expected_active_courses integer default 0 check (expected_active_courses >= 0),
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  field text,
  discipline text,
  subject text,
  country text,
  language text,
  level text check (level is null or level in ('beginner','elementary','intermediate','upper_intermediate','advanced','expert')),
  price_cents integer not null default 0 check (price_cents >= 0),
  qa_price_cents integer not null default 0 check (qa_price_cents >= 0),
  qa_enabled boolean not null default true,
  status public.course_status not null default 'draft',
  thumbnail_url text,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  rating numeric(3,2) not null default 0,
  enrolled_count bigint not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  title text not null,
  description text,
  video_url text,
  video_duration_seconds integer default 0 check (video_duration_seconds >= 0),
  pdf_url text,
  material_urls text[] default array[]::text[],
  created_at timestamptz not null default now(),
  unique(course_id, session_number)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','cancelled','refunded','completed')),
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(student_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  required_seconds integer not null default 0 check (required_seconds >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  last_watched_at timestamptz not null default now(),
  unique(enrollment_id, session_id)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  instructor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  exam_type text not null default 'course' check (exam_type in ('course','marketplace','entrance','competition','language')),
  country text,
  subject text,
  difficulty text,
  question_count integer not null default 0,
  time_limit_minutes integer not null default 60,
  status text not null default 'draft' check (status in ('draft','published','suspended','archived')),
  price_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  status text not null default 'started' check (status in ('started','submitted','auto_submitted','kicked_out','graded')),
  score_percent numeric(5,2) check (score_percent is null or score_percent between 0 and 100),
  correct_count integer default 0,
  wrong_count integer default 0,
  tab_switch_count integer not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  provider text not null default 'stripe',
  provider_payment_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status public.payment_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled','expired')),
  price_cents integer not null default 0,
  course_limit integer not null default 5,
  exam_limit integer,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled')),
  provider text,
  provider_payout_id text,
  period_start date,
  period_end date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.course_analytics_daily (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  day date not null,
  views integer not null default 0,
  likes integer not null default 0,
  enrollments integer not null default 0,
  revenue_cents integer not null default 0,
  unique(course_id, day)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  subject text,
  body text not null,
  status text not null default 'sent' check (status in ('sent','read','archived','flagged')),
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid references public.profiles(id) on delete set null,
  verification_code text unique not null default upper(substr(encode(gen_random_bytes(9),'hex'),1,12)),
  status text not null default 'issued' check (status in ('issued','revoked','expired')),
  final_score_percent numeric(5,2),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ declare t text;
begin
  foreach t in array array['profiles','student_profiles','instructor_profiles','institution_profiles','courses','exams','subscriptions']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare selected_role public.app_role;
begin
  selected_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);
  insert into public.profiles(id, role, full_name, email, country, city, preferred_language)
  values (
    new.id,
    selected_role,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'city',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  if selected_role = 'student' then
    insert into public.student_profiles(user_id, learning_goal, grade_level)
    values (new.id, new.raw_user_meta_data->>'learning_goal', new.raw_user_meta_data->>'grade_level')
    on conflict (user_id) do nothing;
  elsif selected_role = 'instructor' then
    insert into public.instructor_profiles(user_id, title, bio, teaching_languages)
    values (
      new.id,
      new.raw_user_meta_data->>'title',
      new.raw_user_meta_data->>'bio',
      coalesce(string_to_array(new.raw_user_meta_data->>'teaching_languages', ','), array['English'])
    )
    on conflict (user_id) do nothing;
  elsif selected_role = 'institution' then
    insert into public.institution_profiles(user_id, institution_name, institution_type, business_email, subject_area, instructor_count)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'institution_name', 'Institution'),
      new.raw_user_meta_data->>'institution_type',
      coalesce(new.raw_user_meta_data->>'business_email', new.email),
      new.raw_user_meta_data->>'subject_area',
      coalesce((new.raw_user_meta_data->>'instructor_count')::integer, 0)
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.current_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','support')
      and status = 'active'
  )
$$;

create or replace function public.is_instructor_or_admin(target uuid)
returns boolean
language sql
stable
as $$
  select public.is_admin() or auth.uid() = target
$$;

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.instructor_profiles enable row level security;
alter table public.institution_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exams enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payouts enable row level security;
alter table public.course_analytics_daily enable row level security;
alter table public.messages enable row level security;
alter table public.certificates enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "profiles_self_or_admin_select" on public.profiles;
create policy "profiles_self_or_admin_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "student_self_or_admin" on public.student_profiles;
create policy "student_self_or_admin" on public.student_profiles for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "instructor_public_select" on public.instructor_profiles;
create policy "instructor_public_select" on public.instructor_profiles for select using (public_profile or user_id = auth.uid() or public.is_admin());
drop policy if exists "instructor_self_or_admin_write" on public.instructor_profiles;
create policy "instructor_self_or_admin_write" on public.instructor_profiles for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "institution_self_or_admin" on public.institution_profiles;
create policy "institution_self_or_admin" on public.institution_profiles for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "courses_public_or_owner" on public.courses;
create policy "courses_public_or_owner" on public.courses for select using (status = 'published' or instructor_id = auth.uid() or institution_id = auth.uid() or public.is_admin());
drop policy if exists "courses_owner_write" on public.courses;
create policy "courses_owner_write" on public.courses for all using (instructor_id = auth.uid() or institution_id = auth.uid() or public.is_admin()) with check (instructor_id = auth.uid() or institution_id = auth.uid() or public.is_admin());

drop policy if exists "sessions_by_course_access" on public.course_sessions;
create policy "sessions_by_course_access" on public.course_sessions for select using (
  exists(select 1 from public.courses c where c.id = course_id and (c.status='published' or c.instructor_id=auth.uid() or c.institution_id=auth.uid()))
  or exists(select 1 from public.enrollments e where e.course_id = course_sessions.course_id and e.student_id = auth.uid())
  or public.is_admin()
);
drop policy if exists "sessions_owner_write" on public.course_sessions;
create policy "sessions_owner_write" on public.course_sessions for all using (
  exists(select 1 from public.courses c where c.id = course_id and (c.instructor_id=auth.uid() or c.institution_id=auth.uid()))
  or public.is_admin()
) with check (
  exists(select 1 from public.courses c where c.id = course_id and (c.instructor_id=auth.uid() or c.institution_id=auth.uid()))
  or public.is_admin()
);

drop policy if exists "enrollments_student_instructor_admin" on public.enrollments;
create policy "enrollments_student_instructor_admin" on public.enrollments for select using (
  student_id = auth.uid()
  or exists(select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  or public.is_admin()
);
drop policy if exists "enrollments_student_insert" on public.enrollments;
create policy "enrollments_student_insert" on public.enrollments for insert with check (student_id = auth.uid() or public.is_admin());
drop policy if exists "enrollments_student_update" on public.enrollments;
create policy "enrollments_student_update" on public.enrollments for update using (student_id = auth.uid() or public.is_admin()) with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "lesson_progress_access" on public.lesson_progress;
create policy "lesson_progress_access" on public.lesson_progress for all using (
  exists(select 1 from public.enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
  or exists(select 1 from public.enrollments e join public.courses c on c.id=e.course_id where e.id = enrollment_id and c.instructor_id = auth.uid())
  or public.is_admin()
) with check (
  exists(select 1 from public.enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "exams_visible" on public.exams;
create policy "exams_visible" on public.exams for select using (status='published' or instructor_id=auth.uid() or public.is_admin());
drop policy if exists "exams_owner_write" on public.exams;
create policy "exams_owner_write" on public.exams for all using (instructor_id=auth.uid() or public.is_admin()) with check (instructor_id=auth.uid() or public.is_admin());

drop policy if exists "exam_attempts_access" on public.exam_attempts;
create policy "exam_attempts_access" on public.exam_attempts for all using (
  student_id=auth.uid()
  or exists(select 1 from public.exams e where e.id=exam_id and e.instructor_id=auth.uid())
  or public.is_admin()
) with check (student_id=auth.uid() or public.is_admin());

drop policy if exists "payments_student_instructor_admin" on public.payments;
create policy "payments_student_instructor_admin" on public.payments for select using (
  student_id=auth.uid()
  or exists(select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
  or public.is_admin()
);

drop policy if exists "subscriptions_owner_admin" on public.subscriptions;
create policy "subscriptions_owner_admin" on public.subscriptions for select using (owner_id=auth.uid() or public.is_admin());
drop policy if exists "subscriptions_owner_admin_write" on public.subscriptions;
create policy "subscriptions_owner_admin_write" on public.subscriptions for all using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());

drop policy if exists "payouts_instructor_admin" on public.payouts;
create policy "payouts_instructor_admin" on public.payouts for select using (instructor_id=auth.uid() or public.is_admin());

drop policy if exists "analytics_course_owner_admin" on public.course_analytics_daily;
create policy "analytics_course_owner_admin" on public.course_analytics_daily for select using (
  exists(select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
  or public.is_admin()
);

drop policy if exists "messages_participants_admin" on public.messages;
create policy "messages_participants_admin" on public.messages for all using (sender_id=auth.uid() or recipient_id=auth.uid() or public.is_admin()) with check (sender_id=auth.uid() or recipient_id=auth.uid() or public.is_admin());

drop policy if exists "certificates_access" on public.certificates;
create policy "certificates_access" on public.certificates for select using (
  student_id=auth.uid()
  or instructor_id=auth.uid()
  or exists(select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
  or public.is_admin()
);

drop policy if exists "audit_admin_only" on public.admin_audit_logs;
create policy "audit_admin_only" on public.admin_audit_logs for select using (public.is_admin());

create index if not exists idx_profiles_role_status on public.profiles(role,status);
create index if not exists idx_courses_instructor_status on public.courses(instructor_id,status);
create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);
create index if not exists idx_exam_attempts_student_exam on public.exam_attempts(student_id,exam_id);
create index if not exists idx_payments_student_course on public.payments(student_id,course_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id,created_at desc);
