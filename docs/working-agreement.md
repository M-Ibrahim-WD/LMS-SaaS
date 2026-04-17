# Working Agreement

## Purpose
This document captures the operating system already present in this repository so future work stays consistent, safe, and easy to review.

## Product Context
- This repository is a real LMS SaaS product, not a starter scaffold.
- The codebase is a TypeScript monorepo with:
  - `apps/frontend`: Next.js App Router application
  - `apps/backend`: NestJS API with Prisma
  - `packages/shared`: shared cross-app contracts
  - `infra`: local Docker and SQL bootstrap helpers
- The current engineering stage is maintainability and readiness, not architectural reinvention.

## Core Working Principles
- Keep behavior stable while improving structure.
- Prefer incremental refactors over rewrites.
- Decompose oversized pages and services by responsibility.
- Keep docs aligned with what is actually shipped.
- Validate before syncing changes.
- Treat placeholder infrastructure folders as placeholders until real implementations exist.

## Default Delivery Flow
1. Understand the existing behavior before editing.
2. Make the smallest safe change that solves the task.
3. Keep new logic close to the feature first.
4. Reuse shared abstractions only when they are clearly stable.
5. Validate the affected surfaces.
6. Update documentation when the architecture or workflow meaningfully changes.
7. Sync changes only after validation passes.

## Preferred Change Strategy

### Frontend
- Prefer route-local decomposition before introducing broad shared abstractions.
- Split large route files into:
  - local hooks
  - focused section components
  - stable shared UI primitives when justified
- Preserve current route behavior and role-based access expectations.

### Backend
- Keep controllers transport-focused.
- Keep business rules in services.
- Split oversized services by domain responsibility, not by abstract layering for its own sake.
- Preserve server-side enforcement for auth, RBAC, admin permissions, and subscription limits.

## Validation Gates
Before syncing a meaningful task, use the repo's existing validation pattern:
- Frontend lint
- Backend build
- Backend tests
- Frontend build

These are already encoded in the repo workflow and mirrored by `safe_sync_after_task.ps1`.

## Regression Standard
Use the acceptance matrix as the default smoke-test source:
- student journey
- instructor journey
- admin journey
- cross-product regression checks

Reference:
- `docs/final-acceptance-matrix.md`

## Sync And Safety Workflow
The repo already uses a guarded sync approach:
- create a backup snapshot
- store a short task summary
- run validation
- stage changes
- commit
- push

Reference scripts:
- `backup_and_summary.ps1`
- `safe_sync_after_task.ps1`

## Documentation Rules
- Do not let docs overstate shipped infrastructure.
- When behavior or architecture changes, update the relevant docs in the same task when practical.
- Prefer truth-sync updates over aspirational documentation.

## Current Priority Order
1. Safe frontend decomposition of oversized route files
2. Safe backend decomposition of oversized orchestration services
3. Documentation truth-sync and developer guidance
4. Integration and end-to-end test expansion
5. Production infrastructure hardening

## What We Are Not Doing
- No broad rewrites without a clear reason.
- No framework replacement as a default fix.
- No pretending future infrastructure is already active.
- No sync-before-validation workflow for normal tasks.

## Team Agreement For Future Tasks
- Start with repo context, not assumptions.
- Optimize for safe progress and low regression risk.
- Preserve working product behavior unless a task explicitly changes behavior.
- Explain tradeoffs clearly when a change has non-obvious consequences.
- Leave the codebase easier to extend than it was before.
