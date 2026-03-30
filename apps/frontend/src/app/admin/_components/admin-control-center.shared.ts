"use client";

import type { AdminPermission } from "../../../lib/auth/token";
import type { AdminSectionKey } from "./admin-shell";

export type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxCourses: number;
  maxSectionsPerCourse: number;
  maxLessonsPerSection: number;
  canPublishCourses: boolean;
  canCreatePaidCourses: boolean;
  maxStudentsTotal: number;
  maxStudentsPerCourse: number;
  canUseQuizzes: boolean;
  canUseAssignments: boolean;
  canIssueCertificates: boolean;
  canUseAnalytics: boolean;
  canUseReviews: boolean;
  maxStorageMb: number;
  canUploadThumbnails: boolean;
  canUploadProfileImage: boolean;
  canUseManualPayments: boolean;
  hasAdvancedAnalytics: boolean;
  hasOnlinePayments: boolean;
  maxAdminUsers: number;
  maxInstructorUsers: number;
  isActive: boolean;
  isCore?: boolean;
  isArchived?: boolean;
  _count?: { tenants: number; subscriptions: number };
};

export type TenantSubscriptionInfo = {
  currentSubscription: {
    id: string;
    billingPeriod: "MONTHLY" | "YEARLY";
    state: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    isTrial: boolean;
    endsAt: string;
    adminActivated: boolean;
    plan: Pick<Plan, "id" | "name" | "code">;
  } | null;
  latestSubscription: {
    id: string;
    billingPeriod: "MONTHLY" | "YEARLY";
    state: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    isTrial: boolean;
    endsAt: string;
    plan: Pick<Plan, "id" | "name" | "code">;
  } | null;
  trialRules: {
    maxCourses: number;
    maxSectionsPerCourse: number;
    maxLessonsPerSection: number;
    maxStudentsTotal: number;
  };
  daysRemaining: number;
  freezeCreation: boolean;
};

export type Tenant = {
  id: string;
  name: string;
  inviteCode: string;
  isActive: boolean;
  owner?: { fullName: string; email: string } | null;
  plan?: Plan | null;
  subscription?: TenantSubscriptionInfo;
  usage: {
    usersCount: number;
    coursesCount: number;
    paymentsCount: number;
    enrollmentsCount: number;
    approvedRevenue?: number;
    studentsCount?: number;
    instructorsCount?: number;
    adminsCount?: number;
    storageUsedMb?: number;
  };
  recentNotifications?: Array<{ id: string; title: string; message: string }>;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  isActive: boolean;
  tenant?: { name: string } | null;
  _count: { payments?: number; enrollments: number; instructorCourses: number };
};

export type ManagedAdmin = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
  adminPermissions: AdminPermission[];
  createdAt: string;
};

export type AuditCategory = "ALL" | "ADMINS" | "PLANS" | "TENANTS" | "USERS";

export type AuditLog = {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
    isSuperAdmin: boolean;
  };
};

export type Overview = {
  totals: {
    users: number;
    tenants: number;
    plans: number;
    courses: number;
    approvedPayments: number;
    approvedRevenue: number;
    unreadNotifications: number;
  };
};

export type AdminUserDetail = {
  user: AdminUser;
  recentPayments: Array<{ id: string; amount: number; status: string; course: { title: string } }>;
};

export type AdminCourseSummary = {
  id: string;
  title: string;
  status: string;
  tenant: { name: string };
  instructor: { fullName: string };
  _count: { enrollments: number; reviews: number };
};

export type AdminPaymentSummary = {
  id: string;
  status: string;
  amount: number;
  tenant: { name: string };
  user: { fullName: string };
  course: { title: string };
  method: { label: string };
};

export type AdminActivity = {
  recentUsers: Array<{ id: string; fullName: string; role: string }>;
  recentCourses: Array<{ id: string; title: string; status: string }>;
  recentPayments: Array<{ id: string; user: { fullName: string }; course: { title: string } }>;
  recentNotifications: Array<{ id: string; title: string }>;
};

export type PlanForm = {
  code: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxCourses: string;
  maxSectionsPerCourse: string;
  maxLessonsPerSection: string;
  maxStudentsTotal: string;
  maxStudentsPerCourse: string;
  maxStorageMb: string;
  canPublishCourses: boolean;
  canCreatePaidCourses: boolean;
  canUseQuizzes: boolean;
  canUseAssignments: boolean;
  canIssueCertificates: boolean;
  canUseAnalytics: boolean;
  canUseReviews: boolean;
  canUploadThumbnails: boolean;
  canUploadProfileImage: boolean;
  canUseManualPayments: boolean;
  hasAdvancedAnalytics: boolean;
  hasOnlinePayments: boolean;
  maxAdminUsers: string;
  maxInstructorUsers: string;
  isActive: boolean;
};

export type PlanFieldKey =
  | "code"
  | "name"
  | "description"
  | "monthlyPrice"
  | "yearlyPrice"
  | "maxCourses"
  | "maxSectionsPerCourse"
  | "maxLessonsPerSection"
  | "maxStudentsTotal"
  | "maxStudentsPerCourse"
  | "maxStorageMb"
  | "maxAdminUsers"
  | "maxInstructorUsers";

export type PlanBooleanKey =
  | "canPublishCourses"
  | "canCreatePaidCourses"
  | "canUseQuizzes"
  | "canUseAssignments"
  | "canIssueCertificates"
  | "canUseAnalytics"
  | "canUseReviews"
  | "canUploadThumbnails"
  | "canUploadProfileImage"
  | "canUseManualPayments"
  | "hasAdvancedAnalytics"
  | "hasOnlinePayments"
  | "isActive";

export const defaultPlanForm: PlanForm = {
  code: "",
  name: "",
  description: "",
  monthlyPrice: "19",
  yearlyPrice: "190",
  maxCourses: "10",
  maxSectionsPerCourse: "10",
  maxLessonsPerSection: "20",
  maxStudentsTotal: "200",
  maxStudentsPerCourse: "200",
  maxStorageMb: "512",
  canPublishCourses: true,
  canCreatePaidCourses: true,
  canUseQuizzes: true,
  canUseAssignments: true,
  canIssueCertificates: true,
  canUseAnalytics: false,
  canUseReviews: true,
  canUploadThumbnails: true,
  canUploadProfileImage: true,
  canUseManualPayments: true,
  hasAdvancedAnalytics: false,
  hasOnlinePayments: false,
  maxAdminUsers: "3",
  maxInstructorUsers: "1",
  isActive: true
};

export const planStepOrder = [
  "Identity",
  "Pricing",
  "Workspace Limits",
  "Course Delivery",
  "Teaching Tools",
  "Insights and Media",
  "Plan Status"
] as const;

export type PlanStepTitle = (typeof planStepOrder)[number];

export const numericFieldMeta: Array<{
  key: Exclude<PlanFieldKey, "code" | "name" | "description">;
  label: string;
  help: string;
  min?: number;
}> = [
  { key: "monthlyPrice", label: "Monthly price", help: "Price charged every month.", min: 0 },
  { key: "yearlyPrice", label: "Yearly price", help: "Discounted annual billing price.", min: 0 },
  { key: "maxCourses", label: "Courses", help: "Maximum number of courses the workspace can create.", min: 1 },
  {
    key: "maxSectionsPerCourse",
    label: "Sections per course",
    help: "Upper limit for sections inside each course.",
    min: 1
  },
  {
    key: "maxLessonsPerSection",
    label: "Lessons per section",
    help: "Upper limit for lessons inside each section.",
    min: 1
  },
  {
    key: "maxStudentsTotal",
    label: "Students total",
    help: "Maximum number of students in the instructor workspace.",
    min: 1
  },
  {
    key: "maxStudentsPerCourse",
    label: "Students per course",
    help: "Per-course enrollment cap for this plan.",
    min: 1
  },
  {
    key: "maxStorageMb",
    label: "Storage (MB)",
    help: "Media and upload allowance for the workspace.",
    min: 1
  },
  {
    key: "maxAdminUsers",
    label: "Admin users",
    help: "Maximum number of admin accounts inside the workspace.",
    min: 1
  },
  {
    key: "maxInstructorUsers",
    label: "Instructor users",
    help: "Maximum number of instructor accounts inside the workspace.",
    min: 1
  }
];

export const featureFieldGroups: Array<{
  title: string;
  description: string;
  fields: Array<{ key: PlanBooleanKey; label: string; help: string }>;
}> = [
  {
    title: "Course Delivery",
    description: "Controls what instructors can publish and sell.",
    fields: [
      {
        key: "canPublishCourses",
        label: "Publish courses",
        help: "Allow moving courses from draft to published."
      },
      {
        key: "canCreatePaidCourses",
        label: "Paid courses",
        help: "Allow pricing courses instead of limiting the workspace to free courses."
      },
      {
        key: "canUseReviews",
        label: "Reviews",
        help: "Allow review collection and display."
      }
    ]
  },
  {
    title: "Teaching Tools",
    description: "Academic features that make the LMS feel complete.",
    fields: [
      {
        key: "canUseQuizzes",
        label: "Quizzes",
        help: "Allow quiz creation and learner submissions."
      },
      {
        key: "canUseAssignments",
        label: "Assignments",
        help: "Allow assignment creation, submission, and review."
      },
      {
        key: "canIssueCertificates",
        label: "Certificates",
        help: "Allow learners to earn certificates after completion."
      }
    ]
  },
  {
    title: "Insights and Media",
    description: "Analytics, uploads, and payment-related capabilities.",
    fields: [
      {
        key: "canUseAnalytics",
        label: "Analytics",
        help: "Expose instructor analytics inside the workspace."
      },
      {
        key: "hasAdvancedAnalytics",
        label: "Advanced analytics",
        help: "Unlock richer analytics beyond the base summary cards."
      },
      {
        key: "canUploadThumbnails",
        label: "Course thumbnails",
        help: "Allow course-cover image uploads."
      },
      {
        key: "canUploadProfileImage",
        label: "Profile images",
        help: "Allow avatar/profile image uploads."
      },
      {
        key: "canUseManualPayments",
        label: "Manual payments",
        help: "Allow manual payment methods and proof-based purchases."
      },
      {
        key: "hasOnlinePayments",
        label: "Online payments",
        help: "Reserve a flag for future online gateway support."
      }
    ]
  },
  {
    title: "Plan Status",
    description: "Whether the plan is available for new subscription assignments.",
    fields: [
      {
        key: "isActive",
        label: "Plan active",
        help: "Only active plans can be assigned to instructor workspaces."
      }
    ]
  }
];

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export const adminPermissionLabels: Record<AdminPermission, { label: string; description: string }> = {
  VIEW_OVERVIEW: { label: "Platform overview", description: "See global metrics and recent platform activity." },
  REVIEW_TENANTS: { label: "Review tenants", description: "View workspaces and subscription state." },
  MANAGE_TENANTS: { label: "Manage tenants", description: "Activate or deactivate workspaces and subscriptions." },
  REVIEW_STUDENTS: { label: "Review students", description: "View student accounts and detail." },
  REVIEW_INSTRUCTORS: { label: "Review instructors", description: "View instructor accounts and detail." },
  MANAGE_USERS: { label: "Manage users", description: "Activate or deactivate instructors and students." },
  REVIEW_COURSES: { label: "Review courses", description: "Inspect platform course content." },
  REVIEW_PAYMENTS: { label: "Review payments", description: "Inspect payments and payment states." },
  MANAGE_PLANS: { label: "Manage plans", description: "Create, edit, archive, and assign plans." },
  REVIEW_ADMINS: { label: "Review admins", description: "Create and manage other admin accounts." }
};

export const adminPermissionOrder = Object.keys(adminPermissionLabels) as AdminPermission[];

export const adminPermissionPresets: Array<{
  key: string;
  label: string;
  description: string;
  permissions: AdminPermission[];
}> = [
  {
    key: "CONTENT_REVIEWER",
    label: "Content Reviewer",
    description: "Reviews instructor quality and course content.",
    permissions: ["VIEW_OVERVIEW", "REVIEW_INSTRUCTORS", "REVIEW_COURSES"]
  },
  {
    key: "BILLING_ADMIN",
    label: "Billing Admin",
    description: "Handles tenants, plans, and payments.",
    permissions: ["VIEW_OVERVIEW", "REVIEW_TENANTS", "MANAGE_TENANTS", "REVIEW_PAYMENTS", "MANAGE_PLANS"]
  },
  {
    key: "User Moderator",
    label: "User Moderator",
    description: "Reviews and manages students and instructors.",
    permissions: ["VIEW_OVERVIEW", "REVIEW_STUDENTS", "REVIEW_INSTRUCTORS", "MANAGE_USERS"]
  },
  {
    key: "OPERATIONS_ADMIN",
    label: "Operations Admin",
    description: "Broad operational admin without admin-account control.",
    permissions: [
      "VIEW_OVERVIEW",
      "REVIEW_TENANTS",
      "MANAGE_TENANTS",
      "REVIEW_STUDENTS",
      "REVIEW_INSTRUCTORS",
      "MANAGE_USERS",
      "REVIEW_COURSES",
      "REVIEW_PAYMENTS",
      "MANAGE_PLANS"
    ]
  }
];

export const auditCategoryOptions: Array<{ value: AuditCategory; label: string; description: string }> = [
  { value: "ALL", label: "Everything", description: "Show every sensitive admin action." },
  { value: "ADMINS", label: "Admins", description: "Delegated admin creation, permissions, status, and password resets." },
  { value: "PLANS", label: "Plans", description: "Plan creation, updates, and archiving." },
  { value: "TENANTS", label: "Tenants", description: "Workspace status and subscription actions." },
  { value: "USERS", label: "Users", description: "Student and instructor activation changes." }
];

export const adminSectionMeta: Record<AdminSectionKey, { title: string; description: string }> = {
  overview: {
    title: "Platform Overview",
    description: "A calm operational snapshot with KPIs, recent platform activity, and quick access to course and payment oversight."
  },
  plans: {
    title: "Plan Management",
    description: "Create and refine subscription plans, tune permissions, and keep pricing and capacity clear for instructors."
  },
  tenants: {
    title: "Tenant Oversight",
    description: "Inspect workspace health, assign plans, restart trials, and understand usage before taking action."
  },
  users: {
    title: "User Oversight",
    description: "Review instructor and student accounts with cleaner filters, status controls, and focused account detail."
  },
  admins: {
    title: "Delegated Admins",
    description: "Create and control delegated admin accounts while keeping the super admin surface separate and protected."
  },
  audit: {
    title: "Audit Log",
    description: "Review what changed across admins, plans, tenants, and users with a cleaner operational timeline."
  }
};

export function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}
