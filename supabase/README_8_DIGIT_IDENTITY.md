# Odyssey 8-Digit Member Identity — Production Notes

## Required migrations

Run the Supabase migrations in numeric order. The 8-digit identity is introduced by `007_member_codes_and_comment_identity.sql`. Corrected `009_production_identity_publishing_promos.sql` is the main production finalization: it installs the concurrency-safe allocator, repairs legacy codes, mirrors the legacy student column, enforces publishing limits, creates promo-code controls, and exposes the narrow comment identity view. `010_member_code_allocator_and_comment_identity.sql` remains safe to run afterward as an idempotent hardening pass.

**For an existing production project, apply `007`, `008`, `009`, then `010` if those migrations are not already recorded as applied. Do not skip `009` when migrating an older database that may still contain legacy student codes.**

## Canonical identifier

`public.profiles.member_code` is the canonical public Odyssey member identity.

- Exactly 8 ASCII digits.
- Unique across all profiles.
- Assigned by the database, not by browser JavaScript.
- Immutable after assignment.
- Never reused: `public.odyssey_member_code_registry` permanently reserves issued codes.
- `public.student_profiles.student_code` is retained only as a compatibility mirror for older database/application code.

## Issuance flow

1. Supabase creates `auth.users`.
2. `on_auth_user_created` creates `public.profiles` and the role-specific profile.
3. The 009 `BEFORE INSERT` profile trigger calls `odyssey_issue_member_code_v2(...)` when needed.
4. `odyssey_member_code_registry` atomically reserves the candidate.
5. The profile receives the reserved code.
6. Student records mirror the same value into `student_profiles.student_code`.

The rebuilt migration deliberately leaves older generator functions untouched, so an existing overloaded legacy function cannot interfere with the production allocator.

The registry makes concurrent signups safe: if two signups randomly choose the same candidate, the unique constraint causes one allocation to retry rather than issuing a duplicate.

## Comments

Course and test comments read `public.comment_profile_identity_v2`, a narrow public view exposing only:

- `id`
- `member_code`
- `avatar_url`

This avoids granting public read access to the full `profiles` table merely to display a commenter’s member ID/avatar.

## Important distinction

Certificate verification codes remain a separate identifier and are not the same as the 8-digit member code. Existing certificate-code formats must not be changed as part of this migration.
