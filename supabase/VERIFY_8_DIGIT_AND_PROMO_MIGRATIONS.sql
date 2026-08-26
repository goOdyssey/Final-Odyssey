-- VERIFY_8_DIGIT_AND_PROMO_MIGRATIONS.sql
-- Read-only. Run only after 009 and 010 succeed.

select 'profiles_invalid_codes' check_name,count(*) failures from public.profiles where member_code is null or member_code !~ '^[0-9]{8}$'
union all select 'profiles_duplicate_codes',count(*) from (select member_code from public.profiles group by member_code having count(*)>1) q
union all select 'student_profiles_invalid_codes',count(*) from public.student_profiles where student_code is null or student_code !~ '^[0-9]{8}$'
union all select 'student_profiles_duplicate_codes',count(*) from (select student_code from public.student_profiles group by student_code having count(*)>1) q
union all select 'student_code_mirror_mismatches',count(*) from public.student_profiles sp join public.profiles p on p.id=sp.user_id where p.role::text='student' and sp.student_code is distinct from p.member_code
union all select 'registry_invalid_codes',count(*) from public.odyssey_member_code_registry where member_code is null or member_code !~ '^[0-9]{8}$'
union all select 'registry_duplicate_users',count(*) from (select user_id from public.odyssey_member_code_registry group by user_id having count(*)>1) q
union all select 'registry_profile_mismatches',count(*) from public.odyssey_member_code_registry r left join public.profiles p on p.id=r.user_id where p.id is null or p.member_code is distinct from r.member_code
union all select 'promo_rows_without_owner',count(*) from public.promo_codes where created_by is null
union all select 'promo_rows_without_course',count(*) from public.promo_codes where course_id is null;

select
  to_regclass('public.odyssey_member_code_registry') is not null as registry_exists,
  to_regclass('public.comment_profile_identity_v2') is not null as comment_identity_view_exists,
  to_regclass('public.promo_codes') is not null as promo_codes_exists,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='odyssey_issue_member_code_v2') as allocator_exists,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='odyssey_create_instructor_promo_code_v2') as promo_create_rpc_exists,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='odyssey_increment_promo_code_usage_v2') as promo_increment_rpc_exists,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='odyssey_effective_limits_v2') as limits_function_exists;
