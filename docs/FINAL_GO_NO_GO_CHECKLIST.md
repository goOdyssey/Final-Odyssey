# Final Go / No-Go Checklist

## Code
- [ ] Run JS syntax checks.
- [ ] Confirm no `.env` or real secrets are packaged.
- [ ] Confirm provider foundations return safe errors when unconfigured.
- [ ] Test all pages after CSP headers.
- [ ] Test comments, chat, portals, member codes and certificate generation.

## Security
- [ ] Apply migrations in staging.
- [ ] Test anonymous/student/instructor/institution/admin RLS paths.
- [ ] Verify live Edge Functions match audited source.
- [ ] Confirm production reCAPTCHA bypass is false.
- [ ] Confirm service-role keys exist only in server/Edge environments.

## Providers
- [ ] Stripe test checkout + webhook duplicate/retry tests.
- [ ] PayPal sandbox order + verified webhook implementation.
- [ ] Mux direct upload + signed playback + webhook verification.

## Operations
- [ ] Configure error monitoring.
- [ ] Configure external uptime check for /api/health.
- [ ] Verify backup/PITR and perform restore drill.
- [ ] Record rollback owner and incident contacts.
- [ ] Load-test expected critical paths.

Do not mark production ready until every applicable item is verified in the live staging environment.
