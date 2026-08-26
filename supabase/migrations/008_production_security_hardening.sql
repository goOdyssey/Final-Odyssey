-- 008_production_security_hardening.sql
-- Conservative production hardening. Review in a staging project before production.

begin;

-- Ensure site content remains publicly readable but writable only by administrators.
alter table if exists public.site_content enable row level security;
drop policy if exists "site_content_public_insert" on public.site_content;
drop policy if exists "site_content_public_update" on public.site_content;
drop policy if exists "site_content_public_delete" on public.site_content;
drop policy if exists "Anyone can insert site content" on public.site_content;
drop policy if exists "Anyone can update site content" on public.site_content;
drop policy if exists "Anyone can delete site content" on public.site_content;

create policy "site_content_admin_insert"
on public.site_content for insert to authenticated
with check (public.is_admin());

create policy "site_content_admin_update"
on public.site_content for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "site_content_admin_delete"
on public.site_content for delete to authenticated
using (public.is_admin());

-- Payment/webhook idempotency: prevent duplicate provider references where a unique
-- constraint is available. Cart items use provider_payment_id suffixed by course id.
create unique index if not exists payments_provider_payment_id_unique
on public.payments (provider_payment_id)
where provider_payment_id is not null;

-- Helpful indexes for authenticated ownership and common portal queries.
create index if not exists course_comments_user_id_idx on public.course_comments(user_id);
create index if not exists course_comments_course_created_idx on public.course_comments(course_id, created_at);
create index if not exists messages_sender_user_id_idx on public.messages(sender_user_id);
create index if not exists messages_recipient_user_id_idx on public.messages(recipient_user_id);
create index if not exists storage_objects_owner_user_id_idx on public.storage_objects(owner_user_id);

commit;
