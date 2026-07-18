-- Odyssey Supabase admin reporting layer.
-- These views/RPCs are designed for the admin interface and protected by public.is_admin().

create or replace view public.admin_student_overview as
select
  p.id as student_id,
  p.full_name,
  p.email,
  p.country,
  p.city,
  p.status,
  sp.student_code,
  count(distinct e.id) as enrolled_courses,
  count(distinct e.id) filter (where e.status = 'completed') as completed_courses,
  coalesce(round(avg(e.progress_percent),2),0) as average_progress_percent,
  count(distinct ea.id) as exam_attempts,
  coalesce(round(avg(ea.score_percent),2),0) as average_exam_score_percent,
  count(distinct cert.id) as certificates_issued,
  coalesce(sum(pay.amount_cents) filter (where pay.status = 'paid'),0) as total_paid_cents,
  max(e.enrolled_at) as last_enrollment_at,
  p.created_at
from public.profiles p
left join public.student_profiles sp on sp.user_id = p.id
left join public.enrollments e on e.student_id = p.id
left join public.exam_attempts ea on ea.student_id = p.id
left join public.certificates cert on cert.student_id = p.id
left join public.payments pay on pay.student_id = p.id
where p.role = 'student'
group by p.id, sp.student_code;

create or replace view public.admin_student_course_detail as
select
  e.id as enrollment_id,
  e.student_id,
  student.full_name as student_name,
  student.email as student_email,
  c.id as course_id,
  c.title as course_title,
  instructor.id as instructor_id,
  instructor.full_name as instructor_name,
  c.field,
  c.discipline,
  c.subject,
  c.country,
  c.language,
  e.status as enrollment_status,
  e.progress_percent,
  e.enrolled_at,
  e.completed_at,
  count(lp.id) as tracked_sessions,
  count(lp.id) filter (where lp.completed) as completed_sessions,
  coalesce(sum(lp.watched_seconds),0) as watched_seconds,
  coalesce(sum(pay.amount_cents) filter (where pay.status = 'paid'),0) as paid_cents
from public.enrollments e
join public.profiles student on student.id = e.student_id
join public.courses c on c.id = e.course_id
join public.profiles instructor on instructor.id = c.instructor_id
left join public.lesson_progress lp on lp.enrollment_id = e.id
left join public.payments pay on pay.enrollment_id = e.id
group by e.id, student.id, c.id, instructor.id;

create or replace view public.admin_exam_results_detail as
select
  ea.id as attempt_id,
  ea.student_id,
  student.full_name as student_name,
  student.email as student_email,
  ex.id as exam_id,
  ex.title as exam_title,
  ex.exam_type,
  ex.country,
  ex.subject,
  ex.difficulty,
  c.id as course_id,
  c.title as course_title,
  instructor.id as instructor_id,
  instructor.full_name as instructor_name,
  ea.status,
  ea.score_percent,
  ea.correct_count,
  ea.wrong_count,
  ea.tab_switch_count,
  ea.started_at,
  ea.submitted_at
from public.exam_attempts ea
join public.profiles student on student.id = ea.student_id
join public.exams ex on ex.id = ea.exam_id
left join public.courses c on c.id = ex.course_id
left join public.profiles instructor on instructor.id = coalesce(ex.instructor_id, c.instructor_id);

create or replace view public.admin_instructor_overview as
select
  p.id as instructor_id,
  p.full_name,
  p.email,
  p.country,
  p.city,
  p.status,
  ip.instructor_code,
  ip.verification_status,
  ip.rating,
  count(distinct c.id) as courses_posted,
  count(distinct c.id) filter (where c.status = 'published') as active_courses,
  coalesce(sum(c.like_count),0) as total_likes,
  coalesce(sum(c.view_count),0) as total_views,
  coalesce(sum(c.enrolled_count),0) as total_students,
  count(distinct e.id) as total_enrollments,
  coalesce(sum(pay.amount_cents) filter (where pay.status='paid'),0) as gross_sales_cents,
  coalesce(sum(po.amount_cents) filter (where po.status='paid'),0) as payroll_received_cents,
  coalesce(sum(po.amount_cents) filter (where po.status in ('pending','processing')),0) as payroll_pending_cents,
  sub.plan as subscription_plan,
  sub.status as subscription_status,
  sub.current_period_end as subscription_renews_at,
  p.created_at
from public.profiles p
left join public.instructor_profiles ip on ip.user_id = p.id
left join public.courses c on c.instructor_id = p.id
left join public.enrollments e on e.course_id = c.id
left join public.payments pay on pay.course_id = c.id
left join public.payouts po on po.instructor_id = p.id
left join lateral (
  select s.*
  from public.subscriptions s
  where s.owner_id = p.id
  order by s.created_at desc
  limit 1
) sub on true
where p.role in ('instructor','institution')
group by p.id, ip.instructor_code, ip.verification_status, ip.rating, sub.plan, sub.status, sub.current_period_end;

create or replace view public.admin_instructor_course_detail as
select
  c.id as course_id,
  c.instructor_id,
  instructor.full_name as instructor_name,
  instructor.email as instructor_email,
  c.title,
  c.field,
  c.discipline,
  c.subject,
  c.country,
  c.language,
  c.level,
  c.status,
  c.price_cents,
  c.qa_price_cents,
  c.qa_enabled,
  c.view_count,
  c.like_count,
  c.rating,
  count(distinct cs.id) as sessions,
  count(distinct e.id) as enrollments,
  coalesce(avg(e.progress_percent),0) as average_student_progress,
  coalesce(sum(pay.amount_cents) filter (where pay.status='paid'),0) as gross_sales_cents,
  coalesce(sum(cad.views),0) as analytics_views,
  coalesce(sum(cad.likes),0) as analytics_likes,
  coalesce(sum(cad.revenue_cents),0) as analytics_revenue_cents,
  c.created_at,
  c.published_at
from public.courses c
join public.profiles instructor on instructor.id = c.instructor_id
left join public.course_sessions cs on cs.course_id = c.id
left join public.enrollments e on e.course_id = c.id
left join public.payments pay on pay.course_id = c.id
left join public.course_analytics_daily cad on cad.course_id = c.id
group by c.id, instructor.id;

create or replace view public.admin_payment_detail as
select
  pay.id,
  pay.student_id,
  student.full_name as student_name,
  student.email as student_email,
  pay.course_id,
  c.title as course_title,
  c.instructor_id,
  instructor.full_name as instructor_name,
  pay.provider,
  pay.provider_payment_id,
  pay.amount_cents,
  pay.currency,
  pay.status,
  pay.paid_at,
  pay.created_at
from public.payments pay
join public.profiles student on student.id = pay.student_id
left join public.courses c on c.id = pay.course_id
left join public.profiles instructor on instructor.id = c.instructor_id;

create or replace view public.admin_subscription_detail as
select
  sub.id,
  sub.owner_id,
  p.full_name as owner_name,
  p.email as owner_email,
  p.role as owner_role,
  sub.plan,
  sub.status,
  sub.price_cents,
  sub.course_limit,
  sub.exam_limit,
  sub.current_period_start,
  sub.current_period_end,
  sub.created_at
from public.subscriptions sub
join public.profiles p on p.id = sub.owner_id;

create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'totalUsers', (select count(*) from public.profiles),
      'students', (select count(*) from public.profiles where role='student'),
      'instructors', (select count(*) from public.profiles where role in ('instructor','institution')),
      'admins', (select count(*) from public.profiles where role in ('admin','support')),
      'activeUsers', (select count(*) from public.profiles where status='active'),
      'publishedCourses', (select count(*) from public.courses where status='published'),
      'enrollments', (select count(*) from public.enrollments),
      'examAttempts', (select count(*) from public.exam_attempts),
      'certificatesIssued', (select count(*) from public.certificates where status='issued'),
      'revenueCents', coalesce((select sum(amount_cents) from public.payments where status='paid'),0),
      'pendingPayoutCents', coalesce((select sum(amount_cents) from public.payouts where status in ('pending','processing')),0)
    ),
    'recentStudents', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.admin_student_overview order by created_at desc limit 8) x),'[]'::jsonb),
    'recentInstructors', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.admin_instructor_overview order by created_at desc limit 8) x),'[]'::jsonb),
    'recentPayments', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.admin_payment_detail order by created_at desc limit 8) x),'[]'::jsonb)
  ) into result;

  return result;
end $$;

create or replace function public.admin_student_full_detail(target_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return jsonb_build_object(
    'profile', (select to_jsonb(s) from public.admin_student_overview s where s.student_id = target_student_id),
    'enrollments', coalesce((select jsonb_agg(to_jsonb(e) order by e.enrolled_at desc) from public.admin_student_course_detail e where e.student_id = target_student_id),'[]'::jsonb),
    'examResults', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at desc) from public.admin_exam_results_detail x where x.student_id = target_student_id),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.admin_payment_detail p where p.student_id = target_student_id),'[]'::jsonb),
    'certificates', coalesce((select jsonb_agg(to_jsonb(c) order by c.issued_at desc) from public.certificates c where c.student_id = target_student_id),'[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from public.messages m where m.sender_id = target_student_id or m.recipient_id = target_student_id),'[]'::jsonb)
  );
end $$;

create or replace function public.admin_instructor_full_detail(target_instructor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return jsonb_build_object(
    'profile', (select to_jsonb(i) from public.admin_instructor_overview i where i.instructor_id = target_instructor_id),
    'courses', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.admin_instructor_course_detail c where c.instructor_id = target_instructor_id),'[]'::jsonb),
    'subscriptions', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.admin_subscription_detail s where s.owner_id = target_instructor_id),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.admin_payment_detail p where p.instructor_id = target_instructor_id),'[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(to_jsonb(po) order by po.created_at desc) from public.payouts po where po.instructor_id = target_instructor_id),'[]'::jsonb),
    'examResults', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at desc) from public.admin_exam_results_detail x where x.instructor_id = target_instructor_id),'[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from public.messages m where m.sender_id = target_instructor_id or m.recipient_id = target_instructor_id),'[]'::jsonb)
  );
end $$;

create or replace function public.admin_set_user_status(target_user_id uuid, new_status public.account_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare before_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  select to_jsonb(p) into before_row from public.profiles p where p.id = target_user_id;
  update public.profiles set status = new_status, updated_at = now() where id = target_user_id;
  insert into public.admin_audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  values(auth.uid(), 'admin.user.status_update', 'profiles', target_user_id, before_row, jsonb_build_object('status', new_status));
end $$;

create or replace function public.admin_set_course_status(target_course_id uuid, new_status public.course_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare before_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  select to_jsonb(c) into before_row from public.courses c where c.id = target_course_id;
  update public.courses
  set status = new_status,
      published_at = case when new_status = 'published' and published_at is null then now() else published_at end,
      updated_at = now()
  where id = target_course_id;
  insert into public.admin_audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  values(auth.uid(), 'admin.course.status_update', 'courses', target_course_id, before_row, jsonb_build_object('status', new_status));
end $$;

grant execute on function public.admin_dashboard_summary() to authenticated;
grant execute on function public.admin_student_full_detail(uuid) to authenticated;
grant execute on function public.admin_instructor_full_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_status(uuid, public.account_status) to authenticated;
grant execute on function public.admin_set_course_status(uuid, public.course_status) to authenticated;

alter view public.admin_student_overview set (security_invoker = true);
alter view public.admin_student_course_detail set (security_invoker = true);
alter view public.admin_exam_results_detail set (security_invoker = true);
alter view public.admin_instructor_overview set (security_invoker = true);
alter view public.admin_instructor_course_detail set (security_invoker = true);
alter view public.admin_payment_detail set (security_invoker = true);
alter view public.admin_subscription_detail set (security_invoker = true);

grant select on public.admin_student_overview to authenticated;
grant select on public.admin_student_course_detail to authenticated;
grant select on public.admin_exam_results_detail to authenticated;
grant select on public.admin_instructor_overview to authenticated;
grant select on public.admin_instructor_course_detail to authenticated;
grant select on public.admin_payment_detail to authenticated;
grant select on public.admin_subscription_detail to authenticated;
