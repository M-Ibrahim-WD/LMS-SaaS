# Final Acceptance Matrix

## Student
- Register, log in, and reach the dashboard without runtime errors.
- Browse followed-instructor courses and see correct `Free` / `Paid` labeling.
- Enroll in a free course and access lessons immediately.
- Submit payment proof for a paid course and see clear status feedback.
- Open a course, move between lessons, and keep progress state in sync.
- See lesson, section, and course assessments lock and unlock with the correct reason text.
- Submit a quiz and see the submission status and score update.
- Submit or update an assignment and see the submission/review state update.
- View interview cards only when active, open the interview modal only inside the allowed window, and join successfully.
- Send a direct message, open support, and see unread counts update.
- Submit or update a course review and see star ratings render correctly.
- See completion status, next required action, and issue a certificate only when eligible.
- Open issued certificate and public verification page successfully.

## Instructor
- Log in and load the dashboard, profile summary, and unread communication counts.
- Create or edit a course and keep title, pricing, thumbnail, and publish state in sync.
- Manage sections, lessons, quizzes, and assignments from dedicated builder tabs without dead ends.
- Reorder sections and lessons and see the new order persist.
- Review quiz submissions and assignment submissions from their dedicated tabs.
- Review learner progress and certificate readiness in the builder.
- Create, edit, schedule, complete, and delete interviews from the dashboard.
- Create direct, support, and group-message flows without access leakage.
- View recent course security events without blocking normal builder use.

## Admin
- Log in and reach `/admin/overview` through the redirect safely.
- Load overview totals, tenants, users, plans, courses, payments, and audit pages without permission leakage.
- Super admin can manage delegated admins and audit logs.
- Regular admin can only access pages allowed by their permissions.
- Tenant, user, and plan state changes persist and show correct confirmation/error states.

## Cross-Product Regression
- No generic `Bad Request Exception` leaks on critical frontend paths when a clearer message is available.
- Locked, completed, deleted, and hidden resources do not show stale badges or stale actionable buttons.
- Counts and summaries stay aligned after create, delete, submit, approve, review, and complete flows.
- Core pages remain usable on desktop and mobile:
  - dashboard
  - course page
  - course builder
  - messages
  - interviews
