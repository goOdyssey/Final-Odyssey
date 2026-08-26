-- 010_member_code_allocator_and_comment_identity.sql
-- Final hardening after the rebuilt 009. Uses only the v2 objects from 009.
-- Safe to rerun after a successful 009.

begin;

do $$
begin
  if to_regclass('public.odyssey_member_code_registry') is null then raise exception '010 requires successful 009.'; end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='odyssey_issue_member_code_v2') then raise exception '010 requires odyssey_issue_member_code_v2 from 009.'; end if;
end;
$$;

-- Reconcile registry -> profiles and profiles -> student mirror.
update public.profiles p
set member_code=r.member_code
from public.odyssey_member_code_registry r
where r.user_id=p.id and p.member_code is distinct from r.member_code;

update public.student_profiles sp
set student_code=p.member_code
from public.profiles p
where p.id=sp.user_id and p.role::text='student' and sp.student_code is distinct from p.member_code;

-- Ensure the public comment projection exists without replacing an older view.
create or replace view public.comment_profile_identity_v2 as
select id,member_code,avatar_url from public.profiles where member_code is not null;
grant select on public.comment_profile_identity_v2 to anon,authenticated;
comment on view public.comment_profile_identity_v2 is 'Public comment identity: id, immutable 8-digit member code, avatar URL only.';

-- Final synchronization/immutability triggers.
create or replace function public.odyssey_sync_student_code_v2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.role::text='student' then
    update public.student_profiles set student_code=new.member_code where user_id=new.id and student_code is distinct from new.member_code;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_odyssey_sync_student_code_v2 on public.profiles;
create trigger trg_odyssey_sync_student_code_v2 after insert or update of member_code,role on public.profiles for each row execute function public.odyssey_sync_student_code_v2();

create or replace function public.odyssey_sync_member_code_to_student_v2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  select p.member_code into new.student_code from public.profiles p where p.id=new.user_id and p.role::text='student';
  return new;
end;
$$;
drop trigger if exists trg_odyssey_sync_member_code_to_student_v2 on public.student_profiles;
create trigger trg_odyssey_sync_member_code_to_student_v2 before insert or update of user_id on public.student_profiles for each row execute function public.odyssey_sync_member_code_to_student_v2();

-- Health gate.
do $$
begin
  if exists(select 1 from public.profiles where member_code is null or member_code !~ '^[0-9]{8}$') then raise exception '010 stopped: invalid profile member code remains.'; end if;
  if exists(select 1 from public.student_profiles where student_code is null or student_code !~ '^[0-9]{8}$') then raise exception '010 stopped: invalid student code remains.'; end if;
  if exists(select 1 from public.student_profiles sp join public.profiles p on p.id=sp.user_id where p.role::text='student' and sp.student_code is distinct from p.member_code) then raise exception '010 stopped: student code mirror mismatch remains.'; end if;
  if exists(select member_code from public.profiles group by member_code having count(*)>1) then raise exception '010 stopped: duplicate profile member code remains.'; end if;
end;
$$;

commit;
