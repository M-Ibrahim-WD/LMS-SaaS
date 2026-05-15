# Operational Readiness Checklist

## Environment
- Backend starts with the expected API base URL and Prisma database connection.
- Frontend points to the correct backend URL through `NEXT_PUBLIC_API_URL`.
- Upload directories for course thumbnails, lesson media, and payment proof storage exist and are writable.
- Prisma schema is synced before smoke testing new fields or routes.
- Desktop clone is synced to GitHub `main` before new implementation work starts.

## Deployment And Production Config
- Railway backend service tracks the GitHub repo and correct branch with auto deploy enabled.
- Vercel production points to the committed frontend and production domain.
- Production frontend uses `NEXT_PUBLIC_API_URL=https://lmsbackend-production-46b8.up.railway.app/api`.
- Production backend uses `PUBLIC_WEB_URL=https://allinhere.org`.
- Production backend uses the minimal `CORS_ORIGINS` set for `allinhere.org` and `www.allinhere.org`.
- Railway-hosted production email uses `BREVO_API_KEY`; SMTP is not relied on for Hobby-plan delivery.
- Railway Postgres has recent managed backups available.

## Seed and Demo Data
- There is at least one working student, instructor, and admin account for demos.
- Demo instructor has:
  - published free course
  - published paid course
  - at least one section and lesson
  - at least one lesson-level, section-level, and course-level assessment
  - at least one interview
- Demo student is:
  - following the instructor
  - enrolled in at least one course
  - has one partial-progress course and one completed course

## Monitoring and Error Handling
- Frontend error states use user-friendly copy on critical pages instead of raw backend exceptions.
- Backend logs keep enough context to diagnose:
  - auth failures
  - Google auth failures
  - Brevo mail failures
  - payment submission failures
  - assessment submission failures
  - interview access failures
  - certificate issuance failures
  - protected media failures
- Notification noise is checked so normal activity does not overwhelm instructors or admins.

## Abuse and Rate Limits
- Messaging, support, review, and protected-session endpoints are reviewed for rate limiting.
- Admin-only and instructor-only endpoints are confirmed to reject unauthorized callers cleanly.
- Hidden or deleted resources cannot be reopened through stale direct links.

## Release Smoke
- Run frontend lint/build and backend lint/build before release.
- Smoke the student, instructor, and admin journeys from the acceptance matrix.
- Verify the final release candidate against mobile and desktop layouts for the main learning, builder, and communication pages.
