export const ADMIN_PERMISSION_VALUES = [
  "VIEW_OVERVIEW",
  "REVIEW_TENANTS",
  "MANAGE_TENANTS",
  "REVIEW_STUDENTS",
  "REVIEW_INSTRUCTORS",
  "MANAGE_USERS",
  "REVIEW_COURSES",
  "REVIEW_PAYMENTS",
  "MANAGE_PLANS",
  "REVIEW_ADMINS",
  "HANDLE_SUPPORT",
  "MANAGE_HOMEPAGE"
] as const;

export type AdminPermissionValue = (typeof ADMIN_PERMISSION_VALUES)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionValue, { label: string; description: string }> = {
  VIEW_OVERVIEW: {
    label: "Platform overview",
    description: "See overall platform metrics and recent activity."
  },
  REVIEW_TENANTS: {
    label: "Review tenants",
    description: "View workspaces, tenant detail, and subscription state."
  },
  MANAGE_TENANTS: {
    label: "Manage tenants",
    description: "Activate or deactivate workspaces and change subscription state."
  },
  REVIEW_STUDENTS: {
    label: "Review students",
    description: "View student accounts and student-related user detail."
  },
  REVIEW_INSTRUCTORS: {
    label: "Review instructors",
    description: "View instructor accounts and instructor-related user detail."
  },
  MANAGE_USERS: {
    label: "Manage users",
    description: "Activate or deactivate instructor and student accounts."
  },
  REVIEW_COURSES: {
    label: "Review courses",
    description: "Inspect platform course content and publishing state."
  },
  REVIEW_PAYMENTS: {
    label: "Review payments",
    description: "Inspect payments and payment workflow state."
  },
  MANAGE_PLANS: {
    label: "Manage plans",
    description: "Create, edit, archive, and assign subscription plans."
  },
  REVIEW_ADMINS: {
    label: "Review admins",
    description: "Create and manage other admin accounts."
  },
  HANDLE_SUPPORT: {
    label: "Handle support",
    description: "Access the platform support inbox and reply to support conversations."
  },
  MANAGE_HOMEPAGE: {
    label: "Manage homepage",
    description: "Edit and publish the global public homepage."
  }
};
