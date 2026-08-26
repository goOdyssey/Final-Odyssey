# Odyssey Production Operations
## Before launch
- Set every value in `.env.example` in the correct platform; never commit real secrets.
- Confirm Supabase RLS and migrations in production match reviewed SQL.
- Deploy Edge Functions with production secrets.
- Configure Stripe webhook to `/api/stripe-webhook`.
- Check `/api/health` after every deployment.
## Rollback
Use Vercel to promote the previous known-good deployment. Do not roll back database migrations destructively; use a forward corrective migration.
## Recovery
Enable and verify Supabase backups/PITR for the selected plan. Document RPO/RTO with the team and perform a restore drill before launch.
## Incident handling
Preserve request IDs/logs, rotate exposed secrets immediately, disable compromised endpoints, then deploy a corrective change.
