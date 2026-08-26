-- 007_member_codes_and_comment_identity.sql
-- Production migration: immutable 8-digit public member codes and authenticated comment identity.
-- Note: profiles.role is public.app_role (an enum), so cast it to text before COALESCE
-- with auth.users metadata text values.

alter table public.profiles add column if not exists member_code text;
create unique index if not exists profiles_member_code_unique on public.profiles(member_code) where member_code is not null;
alter table public.profiles drop constraint if exists profiles_member_code_format;
alter table public.profiles add constraint profiles_member_code_format check (member_code is null or member_code ~ '^[0-9]{8}$');

create or replace function public.odyssey_role_digit(p_role text)
returns text language sql immutable as $$
  select case lower(coalesce(p_role,'student'))
    when 'student' then (array['1','2','3'])[1+floor(random()*3)::int]
    when 'instructor' then (array['4','5','6','7'])[1+floor(random()*4)::int]
    when 'institution' then (array['8','9','0'])[1+floor(random()*3)::int]
    else '1' end;
$$;

-- The first two digits encode broad role/study-family ranges. Existing signup metadata
-- is used when present; unknown data falls back to the role's most likely family.
create or replace function public.odyssey_study_digit(p_role text,p_meta jsonb)
returns text language plpgsql volatile as $$
declare track text:=lower(coalesce(p_meta->>'study_track',p_meta->>'education_track',p_meta->>'field_group',p_meta->>'curriculum_type',''));
begin
  if track in ('k12','k-12','school','primary','secondary','curriculum') then return (array['1','2','3'])[1+floor(random()*3)::int]; end if;
  if track in ('university','higher_education','higher education','college','academic') then return (array['4','5','6','7'])[1+floor(random()*4)::int]; end if;
  if track in ('vocational','technical','trade','career','professional_training','professional training') then return (array['8','9','0'])[1+floor(random()*3)::int]; end if;
  if lower(coalesce(p_role,''))='institution' then return (array['8','9','0'])[1+floor(random()*3)::int]; end if;
  if lower(coalesce(p_role,''))='student' then return (array['1','2','3'])[1+floor(random()*3)::int]; end if;
  return (array['4','5','6','7'])[1+floor(random()*4)::int];
end $$;

create or replace function public.generate_odyssey_member_code(p_role text,p_meta jsonb default '{}'::jsonb)
returns text language plpgsql volatile security definer set search_path=public as $$
declare code text; prefix text;
begin
  loop
    prefix:=public.odyssey_role_digit(p_role)||public.odyssey_study_digit(p_role,p_meta);
    code:=prefix||lpad((floor(random()*1000000))::bigint::text,6,'0');
    exit when not exists(select 1 from public.profiles where member_code=code);
  end loop;
  return code;
end $$;

create or replace function public.ensure_profile_member_code()
returns trigger language plpgsql security definer set search_path=public as $$
declare meta jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb); role_name text:=coalesce(meta->>'role','student');
begin
  update public.profiles
  set member_code=public.generate_odyssey_member_code(role_name,meta)
  where id=new.id and member_code is null;
  return new;
end $$;

drop trigger if exists trg_auth_user_member_code on auth.users;
create trigger trg_auth_user_member_code after insert on auth.users for each row execute function public.ensure_profile_member_code();

do $$ declare r record; begin
  for r in select p.id,coalesce(p.role::text,u.raw_user_meta_data->>'role','student') role_name,coalesce(u.raw_user_meta_data,'{}'::jsonb) meta from public.profiles p left join auth.users u on u.id=p.id where p.member_code is null or p.member_code !~ '^[0-9]{8}$' loop
    update public.profiles set member_code=public.generate_odyssey_member_code(r.role_name,r.meta) where id=r.id;
  end loop;
end $$;

alter table public.course_comments add column if not exists user_id uuid references auth.users(id) on delete set null;
create or replace function public.enforce_comment_identity()
returns trigger language plpgsql security definer set search_path=public as $$
declare p record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  new.user_id:=auth.uid();
  select full_name,country into p from public.profiles where id=auth.uid();
  if found then new.display_name:=coalesce(p.full_name,new.display_name); new.country:=coalesce(p.country,new.country); end if;
  return new;
end $$;
drop trigger if exists trg_course_comments_identity on public.course_comments;
create trigger trg_course_comments_identity before insert on public.course_comments for each row execute function public.enforce_comment_identity();
