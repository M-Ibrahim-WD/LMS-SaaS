# LMS SaaS Monorepo

A working LMS SaaS product built as a TypeScript monorepo. This repo is no longer a starter scaffold; it contains real business flows across admin operations, instructor subscriptions, course authoring, student learning, manual payments, notifications, and certificate issuance.

## Stack
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, React Query, Zustand
- Backend: NestJS, Prisma, PostgreSQL, JWT auth, RBAC
- Infra/dev: Docker Compose, PostgreSQL, Redis, MinIO
- Shared package: cross-app shared types and contracts

## Monorepo Layout
- `apps/frontend`: web app for students, instructors, admins, and super admin flows
- `apps/backend`: NestJS API with feature modules by domain
- `packages/shared`: shared cross-app types and stable contracts
- `docs`: developer-facing architecture, readiness, and project notes
- `infra`: local infrastructure bootstrap and SQL helpers

## What Is Implemented
- Auth, JWT sessions, RBAC, super-admin and delegated admin permissions
- Multi-instructor student model with invite-code joins
- Instructor subscription plans, 7-day trials, and backend plan enforcement
- Course authoring with sections, lessons, quizzes, assignments, and thumbnail upload
- Learner course workspace with submissions, progress surfaces, and certificates
- Manual payment methods, proof uploads, approval/rejection, and enrollment gating
- Public/private profiles, storefront pages, reviews, and notification center UI
- Admin control center with plans, tenants, users, admins, and audit views

## Quick Start
1. Install dependencies:
   - `corepack pnpm install`
2. Copy env templates:
   - `Copy-Item apps/backend/.env.example apps/backend/.env`
   - `Copy-Item apps/frontend/.env.example apps/frontend/.env.local`
3. Start local infrastructure:
   - `docker compose -f infra/docker-compose.yml up -d`
4. Prepare the database:
   - `pnpm --filter @lms/backend prisma:migrate`
5. Run development:
   - `pnpm dev`

## Validation Commands
- Frontend type check: `pnpm --filter @lms/frontend lint`
- Frontend production build: `pnpm --filter @lms/frontend build`
- Backend type check: `pnpm --filter @lms/backend lint`
- Backend tests: `pnpm --filter @lms/backend test`
- Backend build: `pnpm --filter @lms/backend build`

## Developer Notes
- UI route files live under `apps/frontend/src/app`, while reusable display primitives live under `apps/frontend/src/components`.
- Business logic lives primarily in `apps/backend/src/modules/*/services`.
- Shared cross-cutting backend code lives under `apps/backend/src/shared`.
- The current cleanup focus is safe decomposition of oversized pages and services rather than architectural rewrites.
- Placeholder folders under backend shared infrastructure are not active implementations unless their module contains real code.
