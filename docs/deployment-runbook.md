# Deployment Runbook

## Source of Truth
- GitHub `main` is the canonical production source.
- The desktop clone is a synced working copy only.
- If the desktop clone differs from GitHub, resync to GitHub before planning or implementation.

## Desktop Sync Before Work
1. `git fetch origin main`
2. `git reset --hard origin/main`
3. Confirm `git status` is clean before starting a new task.

## Production Services
- Frontend: Vercel
- Backend: Railway
- Database: Railway Postgres
- Transactional email: Brevo API

## Required Production Configuration

### Vercel
- `NEXT_PUBLIC_API_URL=https://lmsbackend-production-46b8.up.railway.app/api`

### Railway Backend
- `PUBLIC_WEB_URL=https://allinhere.org`
- `CORS_ORIGINS=https://allinhere.org,https://www.allinhere.org`
- `BREVO_API_KEY=<live key>`
- `SMTP_FROM_EMAIL=support@allinhere.org`
- `SMTP_FROM_NAME=ATHAR LMS`

## Railway Checks
- Backend service is connected to the GitHub repo and `main` branch.
- Auto deploys from GitHub are enabled.
- Railway logs are readable enough to diagnose:
  - auth failures
  - Google auth failures
  - Brevo mail success/failure
  - protected media failures
- Railway Postgres has at least one recent managed backup snapshot.

## Vercel Checks
- Production domain is `https://allinhere.org`.
- Production build is using the current GitHub commit.
- The frontend can reach the Railway backend through `NEXT_PUBLIC_API_URL`.

## Release Smoke Test
- Homepage loads on `https://allinhere.org`
- Register works
- Email verification works
- Login works
- Forgot password and reset password work
- Google sign-in works
- Protected course media still loads for enrolled learners

## Operational Notes
- On Railway Hobby, outbound SMTP is blocked. Production email must use the Brevo HTTPS API path instead of SMTP transport.
- Local zip backups created by `backup_and_summary.ps1` do not replace managed database backups.
