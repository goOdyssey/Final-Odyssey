# Odyssey Supabase Setup

This folder turns the Odyssey demo into a real Supabase-backed app foundation.

## 1. Create Supabase Project

Create a Supabase project, then open **SQL Editor** and run these files in order:

1. `supabase/migrations/001_odyssey_core_auth_and_admin_schema.sql`
2. `supabase/migrations/002_odyssey_admin_reporting_views.sql`

These migrations create:

- Supabase Auth profile trigger
- student, instructor, institution, admin roles
- student enrollment records
- course publishing and session/material records
- video progress tracking
- exam attempts and results
- payments and subscriptions
- instructor payouts/payroll
- certificates
- messages
- admin audit logs
- admin views and RPC functions

## 2. Configure Browser Client

Edit:

`js/supabase-config.js`

Set:

```js
window.ODYSSEY_SUPABASE = {
  url: 'https://your-project-ref.supabase.co',
  anonKey: 'your-public-anon-key',
  enabled: true
};
```

Keep the service-role key private. Never place it in browser files.

## 3. Authentication Flow

`auth.html` now tries Supabase first when `enabled: true`.

The signup metadata passes the selected role to Supabase. The database trigger creates the matching records:

- `student` creates `profiles` + `student_profiles`
- `instructor` creates `profiles` + `instructor_profiles`
- `institution` creates `profiles` + `institution_profiles`

Login redirects by role:

- student -> `student_portal.html`
- instructor -> `instructor_portal.html`
- institution -> `instructor_portal.html#subscriptions`
- admin/support -> `admin_dashboard.html`

## 4. Create The First Admin

After signing up your own account, run this in Supabase SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'your-email@example.com';
```

Then log out and log back in. The admin dashboard can call the admin RPCs.

## 5. Admin Interface Data

`admin_dashboard.html` now reads these real Supabase sources when configured:

- `admin_dashboard_summary()`
- `admin_student_overview`
- `admin_student_course_detail`
- `admin_exam_results_detail`
- `admin_instructor_overview`
- `admin_instructor_course_detail`
- `admin_payment_detail`
- `admin_subscription_detail`
- `admin_set_user_status(...)`
- `admin_set_course_status(...)`

This gives admins visibility into:

- each student profile, enrollments, payments, progress, exam attempts, certificates, messages
- each instructor profile, posted courses, subscription, likes, views, students, sales, payouts, exams, messages
- course moderation and user suspension/activation

## 6. Next Production Steps

Supabase Auth and database are ready as a foundation. For launch you still need:

- connect Stripe/PayPal payment webhooks to insert `payments`, `subscriptions`, and `payouts`
- connect video hosting to `course_sessions.video_url`
- connect file storage policies for PDFs/materials
- replace demo course arrays in portal pages with Supabase queries
- add Edge Functions for privileged payment and payout operations
- add email confirmation and password reset templates in Supabase Auth
