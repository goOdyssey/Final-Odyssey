-- Odyssey Supabase auth/profile/admin access repair
-- Run this after 000, 001, and 002.

create extension if not exists "pgcrypto";

-- If the auth trigger ever misses a row, the frontend can safely create/repair
-- the signed-in user's own profile without opening access to other accounts.
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "student_self_insert" on public.student_profiles;
create policy "student_self_insert" on public.student_profiles
for insert
with check (user_id = auth.uid());

drop policy if exists "instructor_self_insert" on public.instructor_profiles;
create policy "instructor_self_insert" on public.instructor_profiles
for insert
with check (user_id = auth.uid());

drop policy if exists "institution_self_insert" on public.institution_profiles;
create policy "institution_self_insert" on public.institution_profiles
for insert
with check (user_id = auth.uid());

-- Make sure the auth trigger is current and tolerant of missing metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare selected_role public.app_role;
begin
  selected_role := case
    when new.raw_user_meta_data->>'role' in ('student','instructor','institution')
      then (new.raw_user_meta_data->>'role')::public.app_role
    else 'student'::public.app_role
  end;

  insert into public.profiles(id, role, full_name, email, country, city, preferred_language)
  values (
    new.id,
    selected_role,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'city',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = excluded.full_name,
    email = excluded.email,
    country = coalesce(excluded.country, public.profiles.country),
    city = coalesce(excluded.city, public.profiles.city),
    preferred_language = coalesce(excluded.preferred_language, public.profiles.preferred_language),
    updated_at = now();

  if selected_role = 'student' then
    insert into public.student_profiles(user_id, learning_goal, grade_level, school_name)
    values (
      new.id,
      new.raw_user_meta_data->>'learning_goal',
      new.raw_user_meta_data->>'grade_level',
      new.raw_user_meta_data->>'school_name'
    )
    on conflict (user_id) do update set
      learning_goal = coalesce(excluded.learning_goal, public.student_profiles.learning_goal),
      grade_level = coalesce(excluded.grade_level, public.student_profiles.grade_level),
      school_name = coalesce(excluded.school_name, public.student_profiles.school_name),
      updated_at = now();
  elsif selected_role = 'instructor' then
    insert into public.instructor_profiles(user_id, title, bio, teaching_languages)
    values (
      new.id,
      new.raw_user_meta_data->>'title',
      new.raw_user_meta_data->>'bio',
      coalesce(string_to_array(nullif(new.raw_user_meta_data->>'teaching_languages',''), ','), array['English'])
    )
    on conflict (user_id) do update set
      title = coalesce(excluded.title, public.instructor_profiles.title),
      bio = coalesce(excluded.bio, public.instructor_profiles.bio),
      teaching_languages = coalesce(excluded.teaching_languages, public.instructor_profiles.teaching_languages),
      updated_at = now();
  elsif selected_role = 'institution' then
    insert into public.institution_profiles(user_id, institution_name, institution_type, business_email, subject_area, instructor_count, expected_active_courses)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'institution_name', new.raw_user_meta_data->>'full_name', 'Institution'),
      new.raw_user_meta_data->>'institution_type',
      coalesce(new.raw_user_meta_data->>'business_email', new.email, ''),
      new.raw_user_meta_data->>'subject_area',
      coalesce(nullif(new.raw_user_meta_data->>'instructor_count','')::integer, 0),
      coalesce(nullif(new.raw_user_meta_data->>'expected_active_courses','')::integer, 0)
    )
    on conflict (user_id) do update set
      institution_name = coalesce(excluded.institution_name, public.institution_profiles.institution_name),
      business_email = coalesce(excluded.business_email, public.institution_profiles.business_email),
      subject_area = coalesce(excluded.subject_area, public.institution_profiles.subject_area),
      instructor_count = coalesce(excluded.instructor_count, public.institution_profiles.instructor_count),
      expected_active_courses = coalesce(excluded.expected_active_courses, public.institution_profiles.expected_active_courses),
      updated_at = now();
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Admin detail access is still protected by public.is_admin().
grant execute on function public.admin_dashboard_summary() to authenticated;
grant execute on function public.admin_student_full_detail(uuid) to authenticated;
grant execute on function public.admin_instructor_full_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_status(uuid, public.account_status) to authenticated;
grant execute on function public.admin_set_course_status(uuid, public.course_status) to authenticated;

grant select on public.admin_student_overview to authenticated;
grant select on public.admin_student_course_detail to authenticated;
grant select on public.admin_exam_results_detail to authenticated;
grant select on public.admin_instructor_overview to authenticated;
grant select on public.admin_instructor_course_detail to authenticated;
grant select on public.admin_payment_detail to authenticated;
grant select on public.admin_subscription_detail to authenticated;

-- After creating your own account, replace the email below and run only this
-- update line to make yourself admin:
-- update public.profiles set role = 'admin', status = 'active' where email = 'YOUR_EMAIL@example.com';
