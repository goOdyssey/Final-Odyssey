# Odyssey Production Operations

## Before deployment
- Run the migration set in staging first.
- Confirm RECAPTCHA_SECRET_KEY is configured in production.
- Keep ODYSSEY_ALLOW_CAPTCHA_BYPASS=false in production.
- Confirm Stripe webhook secret and Supabase service-role key exist only in server/Edge Function environments.
- Verify RLS with anonymous, student, instructor and admin test accounts.

## Monitoring
- Check /api/health from an external uptime monitor.
- Alert on sustained 5xx errors, webhook failures, Edge Function failures and authentication spikes.
- Do not send passwords, tokens, authorization headers or cookies to logs.

## Rollback
1. Stop promotion of the failing deployment.
2. Redeploy the last known-good Vercel deployment.
3. Do not roll back database migrations by deleting production data.
4. Use a reviewed forward-fix migration unless a tested rollback migration exists.

## Recovery
- Verify Supabase backup/PITR availability in the production plan.
- Perform a staging restore drill before launch and periodically after launch.
- Record target RPO/RTO and owners for database, hosting, payments and incident communications.
