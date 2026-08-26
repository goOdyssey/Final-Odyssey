# Odyssey migration 009/010 — safe run order

This package was rebuilt to avoid changing the signatures/return types of functions that may already exist in production.

## Current database situation

If 007 and 008 have already succeeded, **do not rerun them**.

Run:

1. `009_production_identity_publishing_promos.sql`
2. only if 009 succeeds: `010_member_code_allocator_and_comment_identity.sql`
3. then run the read-only `VERIFY_8_DIGIT_AND_PROMO_MIGRATIONS.sql`

## Why this version is safer

- It does not replace or drop `increment_promo_code_usage(uuid)`.
- It does not replace or drop `create_instructor_promo_code(...)`.
- It does not replace or drop `odyssey_effective_limits(...)`.
- It does not replace or call the legacy `generate_odyssey_member_code(...)` overloads.
- New application paths use uniquely named `*_v2` functions.
- Existing `promo_codes` tables are upgraded column-by-column.
- Existing promo IDs must be UUIDs because the application/webhook contract uses UUID promo IDs; if not, the migration stops before committing promo changes with a clear message.
- Student codes are repaired before the 8-digit constraint is added.
- Member-code issuance is atomic and registry-backed.
- Failed runs are transactional: do not manually run fragments from the migration.
