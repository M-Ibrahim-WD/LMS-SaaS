# Architecture

## Current product shape
This repo is a real LMS SaaS product, not a scaffold. It already includes instructor and student journeys, a super-admin and delegated-admin layer, instructor subscription plans with trial enforcement, course authoring, assessments, certificates, manual payments, notifications, and profile/storefront surfaces.

## Monorepo structure
- `apps/frontend`: Next.js App Router application
- `apps/backend`: NestJS API with Prisma and feature modules
- `packages/shared`: stable shared types and contracts used across apps
- `infra`: local Docker Compose stack and SQL bootstrap helpers

## Frontend architecture
- Route-first structure under `apps/frontend/src/app`
- Reusable UI primitives under `apps/frontend/src/components`
- Fetching and mutations use React Query
- Session/auth state uses Zustand
- Lightweight helper libraries live under `apps/frontend/src/lib`

### Where to edit UI
- Page layout and route behavior: `apps/frontend/src/app/*`
- Shared cards, banners, modals, shells, and controls: `apps/frontend/src/components/*`
- Auth/session wiring: `apps/frontend/src/store` and `apps/frontend/src/lib/auth`
- API calls and fetch helpers: `apps/frontend/src/lib/api`

## Backend architecture
- Feature modules live under `apps/backend/src/modules/*`
- Shared backend concerns live under `apps/backend/src/shared/*`
- Prisma access is centralized through `PrismaService`
- Controllers stay transport-focused; services contain business rules and orchestration

### Where to edit business logic
- Auth and session behavior: `modules/auth`
- Admin permissions and operational flows: `modules/admin`
- Subscription and plan enforcement: `modules/subscriptions`, `modules/plans`
- Course, lesson, section, and learner flows: `modules/courses`, `modules/sections`, `modules/lessons`
- Assessments and review flows: `modules/assessments`
- Payments and enrollment gating: `modules/payments`, `modules/payment-methods`, `modules/enrollments`

## Stable patterns in use
- Domain-based module boundaries on the backend
- Route-based page composition on the frontend
- Shared UI primitives for shells, feedback states, and repeated layout patterns
- Explicit backend permission enforcement for admin and subscription limits

## Important architectural notes
- The heaviest maintainability risk is large route files and large service files, not the top-level monorepo shape.
- `apps/backend/src/shared/queue` and `apps/backend/src/shared/storage` are currently placeholders, not active infrastructure implementations.
- The current refactor strategy is incremental decomposition, not framework or architecture replacement.
- New features should prefer feature-local hooks/helpers/components first, then move into shared code only when the abstraction is clearly stable.
