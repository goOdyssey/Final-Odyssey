-- Odyssey Supabase preflight repair
-- Run this BEFORE 001 and 002 if your Supabase project has partial/old tables.
-- It is designed to preserve data while adding missing tables/columns.

create extension if not exists "pgcrypto";

do $$ begin create type public.app_role as enum ('student','instructor','institution','admin','support'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active','pending','suspended','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.course_status as enum ('draft','review','published','suspended','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending','paid','failed','refunded','chargeback'); exception when duplicate_object then null; end $$;
do $$ begin create type public.subscription_plan as enum ('free','pro','institutional'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade);
alter table public.profiles add column if not exists role public.app_role not null default 'student';
alter table public.profiles add column if not exists status public.account_status not null default 'active';
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists timezone text default 'UTC';
alter table public.profiles add column if not exists preferred_language text default 'en';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.student_profiles (user_id uuid primary key references public.profiles(id) on delete cascade);
alter table public.student_profiles add column if not exists student_code text unique not null default lpad((floor(random()*1000000000000))::bigint::text, 12, '0');
alter table public.student_profiles add column if not exists learning_goal text;
alter table public.student_profiles add column if not exists grade_level text;
alter table public.student_profiles add column if not exists school_name text;
alter table public.student_profiles add column if not exists guardian_email text;
alter table public.student_profiles add column if not exists profile_visibility text not null default 'private';
alter table public.student_profiles add column if not exists created_at timestamptz not null default now();
alter table public.student_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.instructor_profiles (user_id uuid primary key references public.profiles(id) on delete cascade);
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

create table if not exists public.institution_profiles (user_id uuid primary key references public.profiles(id) on delete cascade);
alter table public.institution_profiles add column if not exists institution_name text not null default 'Institution';
alter table public.institution_profiles add column if not exists institution_type text;
alter table public.institution_profiles add column if not exists business_email text not null default '';
alter table public.institution_profiles add column if not exists subject_area text;
alter table public.institution_profiles add column if not exists instructor_count integer default 0;
alter table public.institution_profiles add column if not exists expected_active_courses integer default 0;
alter table public.institution_profiles add column if not exists verification_status text not null default 'pending';
alter table public.institution_profiles add column if not exists created_at timestamptz not null default now();
alter table public.institution_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.courses (id uuid primary key default gen_random_uuid());
alter table public.courses add column if not exists instructor_id uuid references public.profiles(id) on delete cascade;
alter table public.courses add column if not exists institution_id uuid references public.profiles(id) on delete set null;
alter table public.courses add column if not exists title text not null default 'Untitled course';
alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists field text;
alter table public.courses add column if not exists discipline text;
alter table public.courses add column if not exists subject text;
alter table public.courses add column if not exists country text;
alter table public.courses add column if not exists language text;
alter table public.courses add column if not exists level text;
alter table public.courses add column if not exists price_cents integer not null default 0;
alter table public.courses add column if not exists qa_price_cents integer not null default 0;
alter table public.courses add column if not exists qa_enabled boolean not null default true;
alter table public.courses add column if not exists status public.course_status not null default 'draft';
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists view_count bigint not null default 0;
alter table public.courses add column if not exists like_count bigint not null default 0;
alter table public.courses add column if not exists rating numeric(3,2) not null default 0;
alter table public.courses add column if not exists enrolled_count bigint not null default 0;
alter table public.courses add column if not exists published_at timestamptz;
alter table public.courses add column if not exists created_at timestamptz not null default now();
alter table public.courses add column if not exists updated_at timestamptz not null default now();

create table if not exists public.course_sessions (id uuid primary key default gen_random_uuid());
alter table public.course_sessions add column if not exists course_id uuid references public.courses(id) on delete cascade;
alter table public.course_sessions add column if not exists session_number integer not null default 1;
alter table public.course_sessions add column if not exists title text not null default 'Session';
alter table public.course_sessions add column if not exists description text;
alter table public.course_sessions add column if not exists video_url text;
alter table public.course_sessions add column if not exists video_duration_seconds integer default 0;
alter table public.course_sessions add column if not exists pdf_url text;
alter table public.course_sessions add column if not exists material_urls text[] default array[]::text[];
alter table public.course_sessions add column if not exists created_at timestamptz not null default now();

create table if not exists public.enrollments (id uuid primary key default gen_random_uuid());
alter table public.enrollments add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.enrollments add column if not exists course_id uuid references public.courses(id) on delete cascade;
alter table public.enrollments add column if not exists status text not null default 'active';
alter table public.enrollments add column if not exists progress_percent numeric(5,2) not null default 0;
alter table public.enrollments add column if not exists enrolled_at timestamptz not null default now();
alter table public.enrollments add column if not exists completed_at timestamptz;

create table if not exists public.lesson_progress (id uuid primary key default gen_random_uuid());
alter table public.lesson_progress add column if not exists enrollment_id uuid references public.enrollments(id) on delete cascade;
alter table public.lesson_progress add column if not exists session_id uuid references public.course_sessions(id) on delete cascade;
alter table public.lesson_progress add column if not exists watched_seconds integer not null default 0;
alter table public.lesson_progress add column if not exists required_seconds integer not null default 0;
alter table public.lesson_progress add column if not exists completed boolean not null default false;
alter table public.lesson_progress add column if not exists completed_at timestamptz;
alter table public.lesson_progress add column if not exists last_watched_at timestamptz not null default now();

create table if not exists public.exams (id uuid primary key default gen_random_uuid());
alter table public.exams add column if not exists course_id uuid references public.courses(id) on delete cascade;
alter table public.exams add column if not exists instructor_id uuid references public.profiles(id) on delete set null;
alter table public.exams add column if not exists title text not null default 'Untitled exam';
alter table public.exams add column if not exists exam_type text not null default 'course';
alter table public.exams add column if not exists country text;
alter table public.exams add column if not exists subject text;
alter table public.exams add column if not exists difficulty text;
alter table public.exams add column if not exists question_count integer not null default 0;
alter table public.exams add column if not exists time_limit_minutes integer not null default 60;
alter table public.exams add column if not exists status text not null default 'draft';
alter table public.exams add column if not exists price_cents integer not null default 0;
alter table public.exams add column if not exists created_at timestamptz not null default now();
alter table public.exams add column if not exists updated_at timestamptz not null default now();

create table if not exists public.exam_attempts (id uuid primary key default gen_random_uuid());
alter table public.exam_attempts add column if not exists exam_id uuid references public.exams(id) on delete cascade;
alter table public.exam_attempts add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.exam_attempts add column if not exists enrollment_id uuid references public.enrollments(id) on delete set null;
alter table public.exam_attempts add column if not exists status text not null default 'started';
alter table public.exam_attempts add column if not exists score_percent numeric(5,2);
alter table public.exam_attempts add column if not exists correct_count integer default 0;
alter table public.exam_attempts add column if not exists wrong_count integer default 0;
alter table public.exam_attempts add column if not exists tab_switch_count integer not null default 0;
alter table public.exam_attempts add column if not exists started_at timestamptz not null default now();
alter table public.exam_attempts add column if not exists submitted_at timestamptz;

create table if not exists public.payments (id uuid primary key default gen_random_uuid());
alter table public.payments add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.payments add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.payments add column if not exists enrollment_id uuid references public.enrollments(id) on delete set null;
alter table public.payments add column if not exists provider text not null default 'stripe';
alter table public.payments add column if not exists provider_payment_id text;
alter table public.payments add column if not exists amount_cents integer not null default 0;
alter table public.payments add column if not exists currency text not null default 'USD';
alter table public.payments add column if not exists status public.payment_status not null default 'pending';
alter table public.payments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists created_at timestamptz not null default now();

create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid());
alter table public.subscriptions add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.subscriptions add column if not exists plan public.subscription_plan not null default 'free';
alter table public.subscriptions add column if not exists status text not null default 'active';
alter table public.subscriptions add column if not exists price_cents integer not null default 0;
alter table public.subscriptions add column if not exists course_limit integer not null default 5;
alter table public.subscriptions add column if not exists exam_limit integer;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.payouts (id uuid primary key default gen_random_uuid());
alter table public.payouts add column if not exists instructor_id uuid references public.profiles(id) on delete cascade;
alter table public.payouts add column if not exists amount_cents integer not null default 0;
alter table public.payouts add column if not exists currency text not null default 'USD';
alter table public.payouts add column if not exists status text not null default 'pending';
alter table public.payouts add column if not exists provider text;
alter table public.payouts add column if not exists provider_payout_id text;
alter table public.payouts add column if not exists period_start date;
alter table public.payouts add column if not exists period_end date;
alter table public.payouts add column if not exists paid_at timestamptz;
alter table public.payouts add column if not exists created_at timestamptz not null default now();

create table if not exists public.course_analytics_daily (id uuid primary key default gen_random_uuid());
alter table public.course_analytics_daily add column if not exists course_id uuid references public.courses(id) on delete cascade;
alter table public.course_analytics_daily add column if not exists day date not null default current_date;
alter table public.course_analytics_daily add column if not exists views integer not null default 0;
alter table public.course_analytics_daily add column if not exists likes integer not null default 0;
alter table public.course_analytics_daily add column if not exists enrollments integer not null default 0;
alter table public.course_analytics_daily add column if not exists revenue_cents integer not null default 0;

create table if not exists public.messages (id uuid primary key default gen_random_uuid());
alter table public.messages add column if not exists sender_id uuid references public.profiles(id) on delete set null;
alter table public.messages add column if not exists recipient_id uuid references public.profiles(id) on delete set null;
alter table public.messages add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.messages add column if not exists subject text;
alter table public.messages add column if not exists body text not null default '';
alter table public.messages add column if not exists status text not null default 'sent';
alter table public.messages add column if not exists created_at timestamptz not null default now();

create table if not exists public.certificates (id uuid primary key default gen_random_uuid());
alter table public.certificates add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.certificates add column if not exists course_id uuid references public.courses(id) on delete cascade;
alter table public.certificates add column if not exists instructor_id uuid references public.profiles(id) on delete set null;
alter table public.certificates add column if not exists verification_code text unique not null default upper(substr(encode(gen_random_bytes(9),'hex'),1,12));
alter table public.certificates add column if not exists status text not null default 'issued';
alter table public.certificates add column if not exists final_score_percent numeric(5,2);
alter table public.certificates add column if not exists issued_at timestamptz not null default now();
alter table public.certificates add column if not exists revoked_at timestamptz;

create table if not exists public.admin_audit_logs (id uuid primary key default gen_random_uuid());
alter table public.admin_audit_logs add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.admin_audit_logs add column if not exists action text not null default 'unknown';
alter table public.admin_audit_logs add column if not exists entity_type text;
alter table public.admin_audit_logs add column if not exists entity_id uuid;
alter table public.admin_audit_logs add column if not exists before_data jsonb;
alter table public.admin_audit_logs add column if not exists after_data jsonb;
alter table public.admin_audit_logs add column if not exists ip_address inet;
alter table public.admin_audit_logs add column if not exists created_at timestamptz not null default now();

create index if not exists idx_courses_instructor_status on public.courses(instructor_id,status);
create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_course on public.enrollments(course_id);
create index if not exists idx_exam_attempts_student_exam on public.exam_attempts(student_id,exam_id);
create index if not exists idx_payments_student_course on public.payments(student_id,course_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id,created_at desc);
