# Investor Preview Without GitHub

The source repository does not need to be public or pushed to GitHub to demonstrate Odyssey.

## Recommended route: Vercel CLI preview
From the project root on your own computer:
1. Install/login to Vercel CLI.
2. Run `vercel link`.
3. Configure only safe preview environment variables.
4. Run `vercel deploy`.
5. Test the generated preview URL.
6. Share that URL with investors.

Do not use `--public`; that option exposes source through Vercel's `_src` path.

## Before sharing
- Use a separate preview/staging Supabase project or non-production data.
- Do not expose service-role keys, payment secrets, Mux secrets, or production admin credentials.
- Consider disabling real checkout and replacing paid actions with a demo state.
- Create a dedicated investor/demo account with limited privileges.
- Remove or anonymize real user data.
