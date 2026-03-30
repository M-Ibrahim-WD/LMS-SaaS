# Execution Roadmap

## Current product stage
The product is past the scaffold stage and currently in a maintainability + readiness phase.

## Priority order
1. Safe frontend decomposition of oversized route files
2. Safe backend decomposition of oversized orchestration services
3. Documentation truth-sync and developer guidance
4. Integration/e2e test expansion
5. Production infrastructure hardening

## Near-term engineering milestones

### Milestone 1: Maintainability cleanup
Goal: reduce review risk and make the codebase easier to extend without changing behavior.

Deliverables:
- admin surface decomposition
- dashboard and course-workspace decomposition
- service responsibility cleanup
- stable shared constants/contracts extraction where justified
- updated architecture docs

### Milestone 2: Test breadth
Goal: increase confidence around the business rules that already exist.

Deliverables:
- backend integration tests for auth, subscription enforcement, payment approval, and certificate issuance
- frontend/e2e flows for admin, instructor, and learner journeys

### Milestone 3: Infrastructure hardening
Goal: close the gap between pilot operation and deployable production behavior.

Deliverables:
- Redis in active feature flows
- BullMQ workers
- object storage abstraction
- email provider integration
- CI pipeline

### Milestone 4: Security completion
Goal: complete the missing account and session hardening work.

Deliverables:
- password reset
- email verification
- refresh token/session rotation
- broader rate limiting and abuse controls

## Delivery strategy
- Keep behavior stable.
- Prefer incremental internal refactors over rewrites.
- Validate after each cleanup pass with frontend lint/build and backend lint/test/build.
- Update docs whenever shipped architecture meaningfully changes.
