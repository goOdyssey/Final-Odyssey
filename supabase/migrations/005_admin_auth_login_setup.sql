-- Odyssey admin authentication setup
-- Run this migration after the base auth/profile migrations.
--
-- Important:
-- Supabase Auth owns passwords. Do not store or set admin passwords in public
-- tables. Create the admin user in Supabase Dashboard > Authentication > Users
-- with your chosen email and password, then promote the email with the SELECT
-- statement near the bottom of this file.

create or replace function public.admin_set_role_by_email(
  target_email text,
  new_role public.app_role default 'admin'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  clean_email text;
begin
  clean_email := lower(trim(target_email));

  if clean_email is null or clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'Provide a valid admin email address.';
  end if;

  if new_role not in ('admin', 'support') then
    raise exception 'Admin setup only accepts admin or support roles.';
  end if;

  select id
    into target_user_id
  from auth.users
  where lower(email) = clean_email
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase Auth user exists for %. Create the user in Authentication > Users first.', clean_email;
  end if;

  insert into public.profiles (
    id,
    role,
    status,
    full_name,
    email,
    preferred_language,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    new_role,
    'active',
    clean_email,
    clean_email,
    'en',
    now(),
    now()
  )
  on conflict (id) do update
    set role = excluded.role,
        status = 'active',
        email = coalesce(public.profiles.email, excluded.email),
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        updated_at = now();

  return target_user_id;
end;
$$;

revoke all on function public.admin_set_role_by_email(text, public.app_role) from public;
revoke all on function public.admin_set_role_by_email(text, public.app_role) from anon;
revoke all on function public.admin_set_role_by_email(text, public.app_role) from authenticated;

comment on function public.admin_set_role_by_email(text, public.app_role)
is 'Promotes an existing Supabase Auth user to Odyssey admin/support. Run only from the Supabase SQL editor or trusted server-side maintenance.';

-- After creating your admin user in Supabase Authentication > Users, replace
-- the email below and run this one line in the SQL editor:
--
-- select public.admin_set_role_by_email('YOUR_ADMIN_EMAIL@example.com', 'admin');
--
-- For future admins, create their Auth user first, then run:
--
-- select public.admin_set_role_by_email('NEW_ADMIN_EMAIL@example.com', 'admin');
--
-- For support staff with limited operational access, use:
--
-- select public.admin_set_role_by_email('SUPPORT_EMAIL@example.com', 'support');
