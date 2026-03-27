# LMS SaaS Monorepo

Production-ready starter scaffold for a multi-tenant LMS SaaS platform.

## Stack
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, React Query, Zustand
- Backend: NestJS, REST API, JWT, RBAC
- Database: PostgreSQL + Prisma ORM
- Infra-ready: Redis, BullMQ, S3-compatible storage, Stripe

## Monorepo Layout
- `apps/frontend`: Next.js web app
- `apps/backend`: NestJS API
- `packages/shared`: shared types/contracts

## Quick Start
1. Install dependencies:
   - `pnpm install` (or `corepack pnpm install`)
2. Copy env templates:
   - PowerShell:
     - `Copy-Item apps/backend/.env.example apps/backend/.env`
     - `Copy-Item apps/frontend/.env.example apps/frontend/.env.local`
   - Bash:
     - `cp apps/backend/.env.example apps/backend/.env`
     - `cp apps/frontend/.env.example apps/frontend/.env.local`
3. Start local infrastructure:
   - `docker compose -f infra/docker-compose.yml up -d`
4. Run Prisma setup:
   - `pnpm --filter @lms/backend prisma:migrate --name init`
5. Run development:
   - `pnpm dev`

## Notes
- Prisma schema includes base multi-tenancy with `tenantId` column strategy.
- Core backend modules scaffolded: `auth`, `users`, `tenants`.
- Clean architecture-ready folders in place for future use-cases, repositories, and domain logic.
