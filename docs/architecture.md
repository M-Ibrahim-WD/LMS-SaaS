# Architecture Foundation

## Monorepo
- `apps/backend`: API with modular NestJS structure
- `apps/frontend`: Next.js App Router web
- `packages/shared`: cross-app types

## Backend Structure
- `src/modules/*`: feature modules (`auth`, `users`, `tenants`)
- `src/shared/*`: cross-cutting concerns (prisma, filters, guards, interceptors, decorators)
- `src/config/*`: environment-based configuration
- `prisma/schema.prisma`: database schema

## Multi-Tenancy Strategy
- `tenantId` column-based strategy on tenant-scoped entities
- initial tenant-scoped model: `User`
- add `tenantId` + index to all business entities during implementation

## Expansion Readiness
- Add modules incrementally: `courses`, `sections`, `lessons`, `enrollments`, `payments`, `quizzes`, `assignments`, `certificates`, `notifications`
- Introduce BullMQ queues per domain under `src/modules/<feature>/jobs`
- Add Redis cache module and S3 storage adapter under `src/shared`

