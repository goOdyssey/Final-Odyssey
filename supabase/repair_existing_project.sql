-- Odyssey Supabase repair for existing/partial database runs.
-- Run this first if Supabase reports: column "public_profile" does not exist.

create extension if not exists "pgcrypto";

alter table if exists public.instructor_profiles
  add column if not exists instructor_code text unique default 'INS-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,12));

alter table if exists public.instructor_profiles
  add column if not exists title text;

alter table if exists public.instructor_profiles
  add column if not exists bio text;

alter table if exists public.instructor_profiles
  add column if not exists expertise text[];

alter table if exists public.instructor_profiles
  add column if not exists teaching_languages text[] default array['English'];

alter table if exists public.instructor_profiles
  add column if not exists verification_status text not null default 'pending';

alter table if exists public.instructor_profiles
  add column if not exists payout_method text;

alter table if exists public.instructor_profiles
  add column if not exists payout_country text;

alter table if exists public.instructor_profiles
  add column if not exists public_profile boolean not null default true;

alter table if exists public.instructor_profiles
  add column if not exists rating numeric(3,2) not null default 0;

alter table if exists public.instructor_profiles
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.instructor_profiles
  add column if not exists updated_at timestamptz not null default now();

update public.instructor_profiles
set public_profile = true
where public_profile is null;
