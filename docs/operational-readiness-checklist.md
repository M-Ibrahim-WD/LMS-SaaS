# Operational Readiness Checklist

## Environment
- Backend starts with the expected API base URL and Prisma database connection.
- Frontend points to the correct backend URL through `NEXT_PUBLIC_API_URL`.
- Upload directories for course thumbnails, lesson media, and payment proof storage exist and are writable.
- Prisma schema is synced before smoke testing new fields or routes.

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
  - payment submission failures
  - assessment submission failures
  - interview access failures
  - certificate issuance failures
- Notification noise is checked so normal activity does not overwhelm instructors or admins.

## Abuse and Rate Limits
- Messaging, support, review, and protected-session endpoints are reviewed for rate limiting.
- Admin-only and instructor-only endpoints are confirmed to reject unauthorized callers cleanly.
- Hidden or deleted resources cannot be reopened through stale direct links.

## Release Smoke
- Run frontend lint/build and backend lint/build before release.
- Smoke the student, instructor, and admin journeys from the acceptance matrix.
- Verify the final release candidate against mobile and desktop layouts for the main learning, builder, and communication pages.
