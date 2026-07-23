-- Odyssey auth completion and profile creation repair
-- Run this after migrations 001-005.
--
-- Passwords are saved by Supabase Auth in auth.users. They should never be
-- stored in public.profiles or any Odyssey public table.

create extension if not exists "pgcrypto";

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.app_role;
  instructor_count_value integer := 0;
  expected_courses_value integer := 0;
begin
  selected_role := case
    when new.raw_user_meta_data->>'role' in ('student','instructor','institution')
      then (new.raw_user_meta_data->>'role')::public.app_role
    else 'student'::public.app_role
  end;

  if (new.raw_user_meta_data->>'instructor_count') ~ '^[0-9]+$' then
    instructor_count_value := (new.raw_user_meta_data->>'instructor_count')::integer;
  end if;

  if (new.raw_user_meta_data->>'expected_active_courses') ~ '^[0-9]+$' then
    expected_courses_value := (new.raw_user_meta_data->>'expected_active_courses')::integer;
  end if;

  insert into public.profiles (
    id,
    role,
    status,
    full_name,
    email,
    country,
    city,
    preferred_language,
    created_at,
    updated_at
  )
  values (
    new.id,
    selected_role,
    'active',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data->>'country', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_language', ''), 'en'),
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    country = coalesce(excluded.country, public.profiles.country),
    city = coalesce(excluded.city, public.profiles.city),
    preferred_language = coalesce(excluded.preferred_language, public.profiles.preferred_language),
    updated_at = now();

  if selected_role = 'student' then
    insert into public.student_profiles (
      user_id,
      learning_goal,
      grade_level,
      school_name,
      created_at,
      updated_at
    )
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'learning_goal', ''),
      nullif(new.raw_user_meta_data->>'grade_level', ''),
      nullif(new.raw_user_meta_data->>'school_name', ''),
      now(),
      now()
    )
    on conflict (user_id) do update set
      learning_goal = coalesce(excluded.learning_goal, public.student_profiles.learning_goal),
      grade_level = coalesce(excluded.grade_level, public.student_profiles.grade_level),
      school_name = coalesce(excluded.school_name, public.student_profiles.school_name),
      updated_at = now();
  elsif selected_role = 'instructor' then
    insert into public.instructor_profiles (
      user_id,
      title,
      bio,
      teaching_languages,
      created_at,
      updated_at
    )
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'title', ''),
      nullif(new.raw_user_meta_data->>'bio', ''),
      coalesce(string_to_array(nullif(new.raw_user_meta_data->>'teaching_languages',''), ','), array['English']),
      now(),
      now()
    )
    on conflict (user_id) do update set
      title = coalesce(excluded.title, public.instructor_profiles.title),
      bio = coalesce(excluded.bio, public.instructor_profiles.bio),
      teaching_languages = coalesce(excluded.teaching_languages, public.instructor_profiles.teaching_languages),
      updated_at = now();
  elsif selected_role = 'institution' then
    insert into public.institution_profiles (
      user_id,
      institution_name,
      institution_type,
      business_email,
      subject_area,
      instructor_count,
      expected_active_courses,
      created_at,
      updated_at
    )
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'institution_name', ''), nullif(new.raw_user_meta_data->>'full_name', ''), 'Institution'),
      nullif(new.raw_user_meta_data->>'institution_type', ''),
      coalesce(nullif(new.raw_user_meta_data->>'business_email', ''), new.email, ''),
      nullif(new.raw_user_meta_data->>'subject_area', ''),
      instructor_count_value,
      expected_courses_value,
      now(),
      now()
    )
    on conflict (user_id) do update set
      institution_name = coalesce(excluded.institution_name, public.institution_profiles.institution_name),
      institution_type = coalesce(excluded.institution_type, public.institution_profiles.institution_type),
      business_email = coalesce(excluded.business_email, public.institution_profiles.business_email),
      subject_area = coalesce(excluded.subject_area, public.institution_profiles.subject_area),
      instructor_count = coalesce(excluded.instructor_count, public.institution_profiles.instructor_count),
      expected_active_courses = coalesce(excluded.expected_active_courses, public.institution_profiles.expected_active_courses),
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists "student_self_insert" on public.student_profiles;
create policy "student_self_insert" on public.student_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "instructor_self_insert" on public.instructor_profiles;
create policy "instructor_self_insert" on public.instructor_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "institution_self_insert" on public.institution_profiles;
create policy "institution_self_insert" on public.institution_profiles
for insert to authenticated
with check (user_id = auth.uid());
