-- 009_production_identity_publishing_promos.sql
-- Odyssey production migration 009 (rebuilt for upgrade safety)
--
-- Preconditions: 001-008 have already succeeded.
-- This migration is intentionally independent of legacy function signatures.
-- It DOES NOT replace/drop any pre-existing promo-code functions or the legacy
-- 007 member-code generator. New Odyssey application paths use the *_v2 objects
-- created here, so existing production functions cannot cause return-type or
-- overload conflicts.
--
-- If this migration fails, the transaction rolls back. Do not manually run
-- fragments from this file.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Preconditions
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception '009 requires public.profiles. Apply 001-008 first.';
  end if;
  if to_regclass('public.student_profiles') is null then
    raise exception '009 requires public.student_profiles. Apply 001-008 first.';
  end if;
  if to_regclass('public.courses') is null then
    raise exception '009 requires public.courses. Apply 001-008 first.';
  end if;
  if to_regclass('public.exams') is null then
    raise exception '009 requires public.exams. Apply 001-008 first.';
  end if;
  if to_regclass('public.subscriptions') is null then
    raise exception '009 requires public.subscriptions. Apply 001-008 first.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Canonical 8-digit member identity
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists member_code text;
alter table public.profiles drop constraint if exists profiles_member_code_format;
drop index if exists public.profiles_member_code_unique;

create table if not exists public.odyssey_member_code_registry (
  member_code text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

alter table public.odyssey_member_code_registry
  add column if not exists assigned_at timestamptz;

update public.odyssey_member_code_registry
set assigned_at = coalesce(assigned_at, now())
where assigned_at is null;

-- A registry row that is not a valid 8-digit reservation is not a usable identity.
-- Remove only malformed/orphan reservations; valid reservations are never recycled.
delete from public.odyssey_member_code_registry r
where r.member_code is null
   or r.member_code !~ '^[0-9]{8}$'
   or not exists (select 1 from auth.users u where u.id = r.user_id);

create unique index if not exists odyssey_member_code_registry_user_unique
  on public.odyssey_member_code_registry(user_id);

create unique index if not exists odyssey_member_code_registry_code_unique
  on public.odyssey_member_code_registry(member_code);

-- Registry format is added NOT VALID first so an unusual legacy row cannot make
-- the whole migration fail. The cleanup above means normal installations are valid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.odyssey_member_code_registry'::regclass
      and conname='odyssey_member_code_registry_format'
  ) then
    alter table public.odyssey_member_code_registry
      add constraint odyssey_member_code_registry_format
      check (member_code ~ '^[0-9]{8}$') not valid;
  end if;
end;
$$;

-- Existing profile codes become reservations when they are valid and not already
-- reserved by another account. Registry ownership wins over conflicting legacy data.
update public.profiles p
set member_code = r.member_code
from public.odyssey_member_code_registry r
where r.user_id = p.id
  and p.member_code is distinct from r.member_code;

insert into public.odyssey_member_code_registry(member_code,user_id,assigned_at)
select distinct on (p.member_code) p.member_code,p.id,coalesce(p.created_at,now())
from public.profiles p
where p.member_code ~ '^[0-9]{8}$'
  and not exists (
    select 1 from public.odyssey_member_code_registry r
    where r.user_id=p.id or r.member_code=p.member_code
  )
order by p.member_code,p.id;

-- ---------------------------------------------------------------------------
-- 2. Single authoritative concurrency-safe allocator (new signature/name)
-- ---------------------------------------------------------------------------
create or replace function public.odyssey_issue_member_code_v2(
  p_user_id uuid,
  p_role text default 'student',
  p_meta jsonb default '{}'::jsonb
)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  existing_code text;
  candidate text;
  first_digit text;
  second_digit text;
  track text := lower(coalesce(
    p_meta->>'study_track',
    p_meta->>'education_track',
    p_meta->>'field_group',
    p_meta->>'curriculum_type',
    ''
  ));
  attempts integer := 0;
begin
  if p_user_id is null then
    raise exception 'A user id is required to issue a member code.';
  end if;

  select r.member_code into existing_code
  from public.odyssey_member_code_registry r
  where r.user_id=p_user_id;
  if existing_code is not null then
    return existing_code;
  end if;

  -- Serialize allocation for the small registry operation. The unique index is
  -- still the final authority, so a collision can never create a duplicate.
  perform pg_advisory_xact_lock(hashtextextended('odyssey-member-code-allocator',0));

  select r.member_code into existing_code
  from public.odyssey_member_code_registry r
  where r.user_id=p_user_id;
  if existing_code is not null then
    return existing_code;
  end if;

  select p.member_code into existing_code
  from public.profiles p
  where p.id=p_user_id and p.member_code ~ '^[0-9]{8}$';

  if existing_code is not null
     and not exists (select 1 from public.odyssey_member_code_registry r where r.member_code=existing_code) then
    insert into public.odyssey_member_code_registry(member_code,user_id,assigned_at)
    values(existing_code,p_user_id,now());
    return existing_code;
  end if;

  loop
    attempts := attempts + 1;
    if attempts > 1000 then
      raise exception 'Unable to allocate a unique 8-digit Odyssey member code after 1000 attempts.';
    end if;

    first_digit := case lower(coalesce(p_role,'student'))
      when 'student' then (array['1','2','3'])[1+floor(random()*3)::int]
      when 'instructor' then (array['4','5','6','7'])[1+floor(random()*4)::int]
      when 'institution' then (array['8','9','0'])[1+floor(random()*3)::int]
      else (array['1','2','3'])[1+floor(random()*3)::int]
    end;

    second_digit := case
      when track in ('k12','k-12','school','primary','secondary','curriculum')
        then (array['1','2','3'])[1+floor(random()*3)::int]
      when track in ('university','higher_education','higher education','college','academic')
        then (array['4','5','6','7'])[1+floor(random()*4)::int]
      when track in ('vocational','technical','trade','career','professional_training','professional training')
        then (array['8','9','0'])[1+floor(random()*3)::int]
      when lower(coalesce(p_role,'student'))='institution'
        then (array['8','9','0'])[1+floor(random()*3)::int]
      when lower(coalesce(p_role,'student'))='student'
        then (array['1','2','3'])[1+floor(random()*3)::int]
      else (array['4','5','6','7'])[1+floor(random()*4)::int]
    end;

    candidate := first_digit||second_digit||lpad((floor(random()*1000000))::bigint::text,6,'0');

    begin
      insert into public.odyssey_member_code_registry(member_code,user_id,assigned_at)
      values(candidate,p_user_id,now());
      return candidate;
    exception when unique_violation then
      select r.member_code into existing_code
      from public.odyssey_member_code_registry r
      where r.user_id=p_user_id;
      if existing_code is not null then return existing_code; end if;
    end;
  end loop;
end;
$$;

revoke all on function public.odyssey_issue_member_code_v2(uuid,text,jsonb) from public;
grant execute on function public.odyssey_issue_member_code_v2(uuid,text,jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Repair profiles before final constraints
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  assigned text;
begin
  for r in
    select p.id,
           coalesce(p.role::text,u.raw_user_meta_data->>'role','student') as role_name,
           coalesce(u.raw_user_meta_data,'{}'::jsonb) as meta
    from public.profiles p
    left join auth.users u on u.id=p.id
    where p.member_code is null
       or p.member_code !~ '^[0-9]{8}$'
       or exists (
         select 1 from public.profiles d
         where d.member_code=p.member_code and d.id<>p.id
       )
    order by p.id
  loop
    assigned := public.odyssey_issue_member_code_v2(r.id,r.role_name,r.meta);
    update public.profiles set member_code=assigned where id=r.id;
  end loop;
end;
$$;

-- Reconcile every profile with its registry reservation.
update public.profiles p
set member_code=r.member_code
from public.odyssey_member_code_registry r
where r.user_id=p.id
  and p.member_code is distinct from r.member_code;

-- Final identity health gate before adding hard constraints.
do $$
begin
  if exists(select 1 from public.profiles where member_code is null or member_code !~ '^[0-9]{8}$') then
    raise exception '009 stopped: profiles still contain an invalid member_code.';
  end if;
  if exists(select member_code from public.profiles group by member_code having count(*)>1) then
    raise exception '009 stopped: duplicate profile member_code values remain.';
  end if;
end;
$$;

alter table public.profiles
  add constraint profiles_member_code_format check(member_code ~ '^[0-9]{8}$');
create unique index profiles_member_code_unique on public.profiles(member_code);

-- BEFORE INSERT is the authoritative profile path for future users.
create or replace function public.odyssey_assign_profile_member_code_v2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare meta jsonb:='{}'::jsonb; role_name text:=coalesce(new.role::text,'student');
begin
  if new.member_code is null or new.member_code !~ '^[0-9]{8}$' then
    select coalesce(u.raw_user_meta_data,'{}'::jsonb) into meta from auth.users u where u.id=new.id;
    new.member_code:=public.odyssey_issue_member_code_v2(new.id,role_name,meta);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_odyssey_assign_profile_member_code_v2 on public.profiles;
create trigger trg_odyssey_assign_profile_member_code_v2
before insert on public.profiles
for each row execute function public.odyssey_assign_profile_member_code_v2();

-- ---------------------------------------------------------------------------
-- 4. Student profile mirror: repair data first, constraint second
-- ---------------------------------------------------------------------------
alter table public.student_profiles alter column student_code drop default;
alter table public.student_profiles drop constraint if exists student_profiles_student_code_format;
alter table public.student_profiles drop constraint if exists student_profiles_student_code_key;
drop index if exists public.student_profiles_student_code_key;

update public.student_profiles sp
set student_code=p.member_code
from public.profiles p
where p.id=sp.user_id and p.member_code ~ '^[0-9]{8}$';

do $$
begin
  if exists(select 1 from public.student_profiles where student_code is null or student_code !~ '^[0-9]{8}$') then
    raise exception '009 stopped: a student_profiles row could not be synchronized to an 8-digit member_code.';
  end if;
  if exists(select student_code from public.student_profiles group by student_code having count(*)>1) then
    raise exception '009 stopped: duplicate student_code values remain.';
  end if;
end;
$$;

alter table public.student_profiles
  add constraint student_profiles_student_code_format check(student_code ~ '^[0-9]{8}$');
create unique index student_profiles_student_code_key on public.student_profiles(student_code);

create or replace function public.odyssey_sync_student_code_v2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.role::text='student' then
    update public.student_profiles set student_code=new.member_code
    where user_id=new.id and student_code is distinct from new.member_code;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_odyssey_sync_student_code_v2 on public.profiles;
create trigger trg_odyssey_sync_student_code_v2
after insert or update of member_code,role on public.profiles
for each row execute function public.odyssey_sync_student_code_v2();

create or replace function public.odyssey_sync_member_code_to_student_v2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  select p.member_code into new.student_code
  from public.profiles p where p.id=new.user_id and p.role::text='student';
  return new;
end;
$$;
drop trigger if exists trg_odyssey_sync_member_code_to_student_v2 on public.student_profiles;
create trigger trg_odyssey_sync_member_code_to_student_v2
before insert or update of user_id on public.student_profiles
for each row execute function public.odyssey_sync_member_code_to_student_v2();

-- ---------------------------------------------------------------------------
-- 5. Immutable identity + new narrow public comment projection
-- ---------------------------------------------------------------------------
create or replace function public.odyssey_prevent_member_code_change_v2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.member_code is not null and new.member_code is distinct from old.member_code then
    raise exception 'Odyssey member codes are immutable.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_odyssey_member_code_immutable_v2 on public.profiles;
create trigger trg_odyssey_member_code_immutable_v2
before update of member_code on public.profiles
for each row execute function public.odyssey_prevent_member_code_change_v2();

create or replace view public.comment_profile_identity_v2 as
select id,member_code,avatar_url from public.profiles where member_code is not null;
grant select on public.comment_profile_identity_v2 to anon,authenticated;
comment on view public.comment_profile_identity_v2 is
'Public comment identity projection: id, immutable 8-digit member_code, and avatar_url only.';
comment on column public.profiles.member_code is
'Canonical immutable 8-digit public member identity. Database-assigned and never manually edited.';
comment on column public.student_profiles.student_code is
'Compatibility mirror of profiles.member_code. New issuance uses the database allocator.';

-- ---------------------------------------------------------------------------
-- 6. Publishing limits using a new function name (avoids return-type conflicts)
-- ---------------------------------------------------------------------------
create or replace function public.odyssey_effective_limits_v2(p_owner uuid default auth.uid())
returns table(plan public.subscription_plan, course_limit integer, exam_limit integer)
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(s.plan,'free'::public.subscription_plan),coalesce(s.course_limit,5),s.exam_limit
  from (select 1) x
  left join lateral (
    select plan,course_limit,exam_limit
    from public.subscriptions
    where owner_id=p_owner and status in ('active','trialing')
    order by updated_at desc nulls last,created_at desc limit 1
  ) s on true;
$$;
revoke all on function public.odyssey_effective_limits_v2(uuid) from public;
grant execute on function public.odyssey_effective_limits_v2(uuid) to authenticated,service_role;

create or replace function public.odyssey_enforce_publish_limit_v2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid; role_name text; plan_name public.subscription_plan; course_cap integer; exam_cap integer; used_count integer;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  owner_id:=coalesce(new.instructor_id,new.institution_id);
  if owner_id is null or owner_id<>auth.uid() then return new; end if;
  select role::text into role_name from public.profiles where id=auth.uid();
  if role_name not in ('instructor','institution') then return new; end if;
  select e.plan,e.course_limit,e.exam_limit into plan_name,course_cap,exam_cap
  from public.odyssey_effective_limits_v2(auth.uid()) e;
  if TG_TABLE_NAME='courses' and new.status::text='published' then
    select count(*) into used_count from public.courses c
    where (c.instructor_id=auth.uid() or c.institution_id=auth.uid())
      and c.status::text='published'
      and c.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid);
    if used_count>=coalesce(course_cap,5) then
      raise exception 'COURSE_PUBLISH_LIMIT_REACHED: Your % plan allows % active published courses.',plan_name,course_cap using errcode='check_violation';
    end if;
  elsif TG_TABLE_NAME='exams' and new.status::text='published' and exam_cap is not null then
    select count(*) into used_count from public.exams e
    where e.instructor_id=auth.uid() and e.status::text='published'
      and e.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid);
    if used_count>=exam_cap then
      raise exception 'EXAM_PUBLISH_LIMIT_REACHED: Your % plan allows % published tests.',plan_name,exam_cap using errcode='check_violation';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_odyssey_courses_publish_limit_v2 on public.courses;
create trigger trg_odyssey_courses_publish_limit_v2 before insert or update of status on public.courses for each row execute function public.odyssey_enforce_publish_limit_v2();
drop trigger if exists trg_odyssey_exams_publish_limit_v2 on public.exams;
create trigger trg_odyssey_exams_publish_limit_v2 before insert or update of status on public.exams for each row execute function public.odyssey_enforce_publish_limit_v2();

-- ---------------------------------------------------------------------------
-- 7. Promo-code table: upgrade existing schema without assuming it is new
-- ---------------------------------------------------------------------------
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid,
  created_by uuid,
  code text,
  discount_type text default 'percent',
  discount_value numeric(12,2) default 0,
  max_uses integer default 1,
  uses_count integer default 0,
  expires_at timestamptz,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.promo_codes add column if not exists course_id uuid;
alter table public.promo_codes add column if not exists created_by uuid;
alter table public.promo_codes add column if not exists code text;
alter table public.promo_codes add column if not exists discount_type text default 'percent';
alter table public.promo_codes add column if not exists discount_value numeric(12,2) default 0;
alter table public.promo_codes add column if not exists max_uses integer default 1;
alter table public.promo_codes add column if not exists uses_count integer default 0;
alter table public.promo_codes add column if not exists expires_at timestamptz;
alter table public.promo_codes add column if not exists status text default 'active';
alter table public.promo_codes add column if not exists created_at timestamptz default now();
alter table public.promo_codes add column if not exists updated_at timestamptz default now();

-- The existing API contract requires UUID promo IDs. If a legacy installation has
-- a non-UUID id column, stop before making destructive changes and report it clearly.
do $$
declare t text;
begin
  select data_type into t from information_schema.columns
  where table_schema='public' and table_name='promo_codes' and column_name='id';
  if t is null then
    alter table public.promo_codes add column id uuid;
    update public.promo_codes set id=gen_random_uuid() where id is null;
    alter table public.promo_codes alter column id set default gen_random_uuid();
  elsif t<>'uuid' then
    raise exception '009 requires public.promo_codes.id to be uuid; found %. No promo-code schema changes were committed.',t;
  else
    alter table public.promo_codes alter column id set default gen_random_uuid();
  end if;
end;
$$;

update public.promo_codes set id=gen_random_uuid() where id is null;
create unique index if not exists promo_codes_id_unique on public.promo_codes(id);

do $$
declare t text;
begin
  select data_type into t from information_schema.columns where table_schema='public' and table_name='promo_codes' and column_name='course_id';
  if t is not null and t<>'uuid' then raise exception '009 requires public.promo_codes.course_id to be uuid; found %.',t; end if;
  select data_type into t from information_schema.columns where table_schema='public' and table_name='promo_codes' and column_name='created_by';
  if t is not null and t<>'uuid' then raise exception '009 requires public.promo_codes.created_by to be uuid; found %.',t; end if;
end;
$$;

update public.promo_codes set discount_type='percent' where discount_type is null or discount_type not in ('percent','fixed');
update public.promo_codes set discount_value=0 where discount_value is null or discount_value<0;
update public.promo_codes set max_uses=1 where max_uses is null or max_uses<1;
update public.promo_codes set uses_count=0 where uses_count is null or uses_count<0;
update public.promo_codes set status='active' where status is null or status not in ('active','paused','expired');
update public.promo_codes set created_at=now() where created_at is null;
update public.promo_codes set updated_at=now() where updated_at is null;

update public.promo_codes pc
set created_by=coalesce(c.instructor_id,c.institution_id)
from public.courses c
where c.id=pc.course_id and pc.created_by is null;

update public.promo_codes
set code=upper(regexp_replace(trim(code),'[^A-Z0-9_-]','','g'))
where code is not null;

-- Repair duplicate course/code pairs without touching the first legacy record.
do $$
declare r record;
begin
  for r in
    select id,course_id,code,row_number() over(partition by course_id,code order by created_at nulls first,id) rn
    from public.promo_codes
    where course_id is not null and code is not null
  loop
    if r.rn>1 then
      update public.promo_codes
      set code=left('LEGACY-'||replace(r.id::text,'-',''),32),updated_at=now()
      where id=r.id;
    end if;
  end loop;
end;
$$;

create index if not exists promo_codes_course_status_idx on public.promo_codes(course_id,status);
create index if not exists promo_codes_code_idx on public.promo_codes(code);
create index if not exists promo_codes_created_by_idx on public.promo_codes(created_by);
create unique index if not exists promo_codes_course_code_unique on public.promo_codes(course_id,code) where course_id is not null and code is not null;

alter table public.promo_codes enable row level security;
drop policy if exists promo_codes_owner_select_v2 on public.promo_codes;
create policy promo_codes_owner_select_v2 on public.promo_codes for select to authenticated
using (created_by=auth.uid() or public.is_admin());
drop policy if exists promo_codes_owner_insert_v2 on public.promo_codes;
create policy promo_codes_owner_insert_v2 on public.promo_codes for insert to authenticated
with check ((created_by=auth.uid() and exists(select 1 from public.courses c where c.id=course_id and (c.instructor_id=auth.uid() or c.institution_id=auth.uid()))) or public.is_admin());
drop policy if exists promo_codes_owner_update_v2 on public.promo_codes;
create policy promo_codes_owner_update_v2 on public.promo_codes for update to authenticated
using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
drop policy if exists promo_codes_owner_delete_v2 on public.promo_codes;
create policy promo_codes_owner_delete_v2 on public.promo_codes for delete to authenticated
using (created_by=auth.uid() or public.is_admin());

-- New RPC names deliberately avoid changing an existing function's return type.
create or replace function public.odyssey_create_instructor_promo_code_v2(
  p_course_id uuid,p_code text,p_discount_type text,p_discount_value numeric,
  p_max_uses integer,p_expires_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid; normalized text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  normalized:=upper(regexp_replace(trim(coalesce(p_code,'')),'[^A-Z0-9_-]','','g'));
  if not exists(select 1 from public.courses c where c.id=p_course_id and c.status::text='published' and (c.instructor_id=auth.uid() or c.institution_id=auth.uid())) then
    raise exception 'You can only create promo codes for your own published course.';
  end if;
  if normalized !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then raise exception 'Promo code must be 3-32 letters, numbers, hyphens, or underscores.'; end if;
  if p_discount_type not in ('percent','fixed') then raise exception 'Discount type must be percent or fixed.'; end if;
  if p_discount_value<=0 then raise exception 'Discount value must be greater than zero.'; end if;
  if p_discount_type='percent' and p_discount_value>100 then raise exception 'Percentage discount cannot exceed 100.'; end if;
  if p_max_uses<1 then raise exception 'Maximum uses must be at least 1.'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expiry must be in the future.'; end if;
  insert into public.promo_codes(course_id,created_by,code,discount_type,discount_value,max_uses,uses_count,expires_at,status,created_at,updated_at)
  values(p_course_id,auth.uid(),normalized,p_discount_type,p_discount_value,p_max_uses,0,p_expires_at,'active',now(),now())
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'That promo code already exists for this course.';
end;
$$;
revoke all on function public.odyssey_create_instructor_promo_code_v2(uuid,text,text,numeric,integer,timestamptz) from public;
grant execute on function public.odyssey_create_instructor_promo_code_v2(uuid,text,text,numeric,integer,timestamptz) to authenticated;

create or replace function public.odyssey_increment_promo_code_usage_v2(p_promo_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
  update public.promo_codes
  set uses_count=uses_count+1,updated_at=now()
  where id=p_promo_id and status='active' and uses_count<max_uses
    and (expires_at is null or expires_at>now());
  get diagnostics n=row_count;
  return n=1;
end;
$$;
revoke all on function public.odyssey_increment_promo_code_usage_v2(uuid) from public;
grant execute on function public.odyssey_increment_promo_code_usage_v2(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Final data health gate
-- ---------------------------------------------------------------------------
do $$
begin
  if exists(select 1 from public.profiles where member_code is null or member_code !~ '^[0-9]{8}$') then raise exception '009 stopped: invalid profile member code remains.'; end if;
  if exists(select member_code from public.profiles group by member_code having count(*)>1) then raise exception '009 stopped: duplicate profile member code remains.'; end if;
  if exists(select 1 from public.student_profiles where student_code is null or student_code !~ '^[0-9]{8}$') then raise exception '009 stopped: invalid student code remains.'; end if;
  if exists(select student_code from public.student_profiles group by student_code having count(*)>1) then raise exception '009 stopped: duplicate student code remains.'; end if;
  if exists(select 1 from public.odyssey_member_code_registry r left join public.profiles p on p.id=r.user_id where p.id is null or p.member_code is distinct from r.member_code) then raise exception '009 stopped: member-code registry is not synchronized with profiles.'; end if;
end;
$$;

commit;
