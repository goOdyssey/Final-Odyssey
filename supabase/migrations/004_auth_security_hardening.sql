-- Odyssey Supabase auth security hardening
-- Run after 003. This prevents self-service role/status escalation.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin','support')
      and status = 'active'
  )
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.prevent_profile_privilege_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id
     and not public.is_admin()
     and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Users cannot change their own role or account status';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_profile_privilege_self_change on public.profiles;
create trigger trg_prevent_profile_privilege_self_change
before update on public.profiles
for each row execute function public.prevent_profile_privilege_self_change();

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
for insert
with check (
  id = auth.uid()
  and role in ('student','instructor','institution')
  and status = 'active'
);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role in ('student','instructor','institution')
    and status <> 'deleted'
  )
);

create or replace function public.admin_promote_user(target_email text, new_role public.app_role default 'admin')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_role not in ('admin','support') then
    raise exception 'Only admin/support promotion is allowed through this helper';
  end if;

  update public.profiles
  set role = new_role,
      status = 'active',
      updated_at = now()
  where lower(email) = lower(target_email);

  if not found then
    raise exception 'No profile found for email %', target_email;
  end if;
end $$;

revoke all on function public.admin_promote_user(text, public.app_role) from public;
revoke all on function public.admin_promote_user(text, public.app_role) from anon;
revoke all on function public.admin_promote_user(text, public.app_role) from authenticated;

-- Use this after you create your own account:
-- select public.admin_promote_user('YOUR_EMAIL@example.com', 'admin');
