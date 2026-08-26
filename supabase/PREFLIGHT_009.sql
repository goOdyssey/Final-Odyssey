-- PREFLIGHT_009.sql
-- READ ONLY. Run before 009 if you want to inspect the current production state.
-- This script makes no changes.

select
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regclass('public.student_profiles') is not null as student_profiles_exists,
  to_regclass('public.courses') is not null as courses_exists,
  to_regclass('public.exams') is not null as exams_exists,
  to_regclass('public.subscriptions') is not null as subscriptions_exists,
  to_regclass('public.promo_codes') is not null as promo_codes_exists;

select table_name,column_name,data_type,udt_name
from information_schema.columns
where table_schema='public'
  and ((table_name='profiles' and column_name in ('id','role','member_code'))
    or (table_name='student_profiles' and column_name in ('user_id','student_code'))
    or (table_name='promo_codes' and column_name in ('id','course_id','created_by','code','discount_type','discount_value','max_uses','uses_count','expires_at','status','created_at','updated_at')))
order by table_name,column_name;

select
  (select count(*) from public.profiles where member_code is null or member_code !~ '^[0-9]{8}$') as invalid_profile_codes,
  (select count(*) from public.student_profiles where student_code is null or student_code !~ '^[0-9]{8}$') as invalid_student_codes,
  (select count(*) from public.profiles p where p.member_code is not null and exists(select 1 from public.profiles d where d.member_code=p.member_code and d.id<>p.id)) as duplicate_profile_code_rows,
  case when to_regclass('public.promo_codes') is not null then (select count(*) from public.promo_codes where id is null) else 0 end as promo_rows_with_null_id;

select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'generate_odyssey_member_code',
    'increment_promo_code_usage',
    'create_instructor_promo_code',
    'odyssey_effective_limits',
    'odyssey_issue_member_code_v2',
    'odyssey_create_instructor_promo_code_v2',
    'odyssey_increment_promo_code_usage_v2'
  )
order by p.proname,identity_arguments;
