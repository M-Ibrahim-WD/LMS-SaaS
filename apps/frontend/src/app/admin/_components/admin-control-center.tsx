"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";
import type { AdminPermission } from "../../../lib/auth/token";
import { AdminSectionKey, AdminShell } from "./admin-shell";
import { AdminAdminsSection } from "./admin-admins-section";
import { AdminAuditSection } from "./admin-audit-section";
import { AdminOverviewSection } from "./admin-overview-section";
import { AdminPlansSection } from "./admin-plans-section";
import { AdminTenantsSection } from "./admin-tenants-section";
import { AdminUsersSection } from "./admin-users-section";

type Plan = {
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

type TenantSubscriptionInfo = {
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

type Tenant = {
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

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  isActive: boolean;
  tenant?: { name: string } | null;
  _count: { payments?: number; enrollments: number; instructorCourses: number };
};

type ManagedAdmin = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
  adminPermissions: AdminPermission[];
  createdAt: string;
};

type AuditCategory = "ALL" | "ADMINS" | "PLANS" | "TENANTS" | "USERS";

type AuditLog = {
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

type Overview = {
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

type PlanForm = {
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

type PlanFieldKey =
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

type PlanBooleanKey =
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

const defaultPlanForm: PlanForm = {
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

const planStepOrder = [
  "Identity",
  "Pricing",
  "Workspace Limits",
  "Course Delivery",
  "Teaching Tools",
  "Insights and Media",
  "Plan Status"
] as const;

type PlanStepTitle = (typeof planStepOrder)[number];

interface AdminControlCenterProps {
  section: AdminSectionKey;
}

const numericFieldMeta: Array<{
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

const featureFieldGroups: Array<{
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

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const adminPermissionLabels: Record<AdminPermission, { label: string; description: string }> = {
  VIEW_OVERVIEW: { label: "Platform overview", description: "See global metrics and recent platform activity." },
  REVIEW_TENANTS: { label: "Review tenants", description: "View workspaces and subscription state." },
  MANAGE_TENANTS: { label: "Manage tenants", description: "Activate or deactivate workspaces and subscriptions." },
  REVIEW_STUDENTS: { label: "Review students", description: "View student accounts and detail." },
  REVIEW_INSTRUCTORS: { label: "Review instructors", description: "View instructor accounts and detail." },
  MANAGE_USERS: { label: "Manage users", description: "Activate or deactivate instructors and students." },
  REVIEW_COURSES: { label: "Review courses", description: "Inspect platform course content." },
  REVIEW_PAYMENTS: { label: "Review payments", description: "Inspect payments and payment states." },
  MANAGE_PLANS: { label: "Manage plans", description: "Create, edit, archive, and assign plans." },
  REVIEW_ADMINS: { label: "Review admins", description: "Create and manage other admin accounts." },
  HANDLE_SUPPORT: {
    label: "Handle support",
    description: "Access and reply to platform support conversations."
  }
};

const adminPermissionOrder = Object.keys(adminPermissionLabels) as AdminPermission[];

const adminPermissionPresets: Array<{
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

const auditCategoryOptions: Array<{ value: AuditCategory; label: string; description: string }> = [
  { value: "ALL", label: "Everything", description: "Show every sensitive admin action." },
  { value: "ADMINS", label: "Admins", description: "Delegated admin creation, permissions, status, and password resets." },
  { value: "PLANS", label: "Plans", description: "Plan creation, updates, and archiving." },
  { value: "TENANTS", label: "Tenants", description: "Workspace status and subscription actions." },
  { value: "USERS", label: "Users", description: "Student and instructor activation changes." }
];

function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function AdminControlCenter({ section }: AdminControlCenterProps) {
  const { accessToken, hasHydrated, user } = useRequireAuth({ roles: ["ADMIN"] });
  const queryClient = useQueryClient();
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState<"ALL" | "true" | "false">("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<"ALL" | "ADMIN" | "INSTRUCTOR" | "STUDENT">("ALL");
  const [userStatus, setUserStatus] = useState<"ALL" | "true" | "false">("ALL");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [tenantPlanId, setTenantPlanId] = useState<string>("");
  const [tenantBillingPeriod, setTenantBillingPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [planForm, setPlanForm] = useState<PlanForm>(defaultPlanForm);
  const [message, setMessage] = useState<string | null>(null);
  const [activePlanStep, setActivePlanStep] = useState<PlanStepTitle>("Identity");
  const [adminSearch, setAdminSearch] = useState("");
  const [selectedAdminPreset, setSelectedAdminPreset] = useState("");
  const [cloneAdminId, setCloneAdminId] = useState("");
  const [auditCategory, setAuditCategory] = useState<AuditCategory>("ALL");
  const [adminPasswordDrafts, setAdminPasswordDrafts] = useState<Record<string, string>>({});
  const [adminForm, setAdminForm] = useState({
    fullName: "",
    email: "",
    password: "",
    permissions: ["VIEW_OVERVIEW"] as AdminPermission[]
  });

  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const adminPermissions = user?.adminPermissions ?? [];
  const hasAdminPermission = (permission: AdminPermission) => isSuperAdmin || adminPermissions.includes(permission);
  const canViewOverview = hasAdminPermission("VIEW_OVERVIEW");
  const canManagePlans = hasAdminPermission("MANAGE_PLANS");
  const canReviewTenants = hasAdminPermission("REVIEW_TENANTS");
  const canReviewUsers = hasAdminPermission("REVIEW_STUDENTS") || hasAdminPermission("REVIEW_INSTRUCTORS");
  const canReviewAdmins = hasAdminPermission("REVIEW_ADMINS");
  const canReviewAudit = isSuperAdmin;
  const canReviewOps = hasAdminPermission("REVIEW_COURSES") || hasAdminPermission("REVIEW_PAYMENTS");

  const navItems = [
    {
      key: "overview" as const,
      label: "Overview",
      description: "KPIs, activity, and quick operational context.",
      href: "/admin/overview",
      visible: canViewOverview
    },
    {
      key: "plans" as const,
      label: "Plans",
      description: "Create, refine, and assign subscription plans.",
      href: "/admin/plans",
      visible: canManagePlans
    },
    {
      key: "tenants" as const,
      label: "Tenants",
      description: "Monitor workspaces, trials, and plan activation.",
      href: "/admin/tenants",
      visible: canReviewTenants
    },
    {
      key: "users" as const,
      label: "Users",
      description: "Review learners and instructors without admin noise.",
      href: "/admin/users",
      visible: canReviewUsers
    },
    {
      key: "admins" as const,
      label: "Admins",
      description: "Delegate platform authority with controlled permissions.",
      href: "/admin/admins",
      visible: canReviewAdmins
    },
    {
      key: "audit" as const,
      label: "Audit",
      description: "Inspect platform actions and operational history.",
      href: "/admin/audit",
      visible: canReviewAudit
    }
  ];

  const sectionMeta: Record<AdminSectionKey, { title: string; description: string }> = {
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
  const activeNavItem = navItems.find((item) => item.key === section && item.visible);

  const tenantsPath = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantSearch.trim()) params.set("search", tenantSearch.trim());
    if (tenantStatus !== "ALL") params.set("isActive", tenantStatus);
    return `/admin/tenants${params.toString() ? `?${params.toString()}` : ""}`;
  }, [tenantSearch, tenantStatus]);

  const usersPath = useMemo(() => {
    const params = new URLSearchParams();
    if (userSearch.trim()) params.set("search", userSearch.trim());
    if (userRole !== "ALL") params.set("role", userRole);
    if (userStatus !== "ALL") params.set("isActive", userStatus);
    return `/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
  }, [userSearch, userRole, userStatus]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "tenant-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail"] })
    ]);
  };

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => apiFetch<Overview>("/admin/overview", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const plansQuery = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => apiFetch<Plan[]>("/admin/plans", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants", tenantSearch, tenantStatus],
    queryFn: () => apiFetch<Tenant[]>(tenantsPath, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const tenantDetailQuery = useQuery({
    queryKey: ["admin", "tenant-detail", selectedTenantId],
    queryFn: () => apiFetch<Tenant>(`/admin/tenants/${selectedTenantId}`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && selectedTenantId)
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", userSearch, userRole, userStatus],
    queryFn: () => apiFetch<AdminUser[]>(usersPath, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const adminUsersQuery = useQuery({
    queryKey: ["admin", "admin-users", adminSearch],
    queryFn: () =>
      apiFetch<ManagedAdmin[]>(`/admin/admin-users${adminSearch.trim() ? `?search=${encodeURIComponent(adminSearch.trim())}` : ""}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && isSuperAdmin)
  });

  const auditLogsQuery = useQuery({
    queryKey: ["admin", "audit-logs", auditCategory],
    queryFn: () =>
      apiFetch<AuditLog[]>(`/admin/audit-logs?limit=20${auditCategory !== "ALL" ? `&category=${auditCategory}` : ""}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && isSuperAdmin)
  });

  const userDetailQuery = useQuery({
    queryKey: ["admin", "user-detail", selectedUserId],
    queryFn: () => apiFetch<{ user: AdminUser; recentPayments: Array<{ id: string; amount: number; status: string; course: { title: string } }> }>(`/admin/users/${selectedUserId}`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && selectedUserId)
  });

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => apiFetch<Array<{ id: string; title: string; status: string; tenant: { name: string }; instructor: { fullName: string }; _count: { enrollments: number; reviews: number } }>>("/admin/courses", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const paymentsQuery = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => apiFetch<Array<{ id: string; status: string; amount: number; tenant: { name: string }; user: { fullName: string }; course: { title: string }; method: { label: string } }>>("/admin/payments", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const activityQuery = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => apiFetch<{ recentUsers: Array<{ id: string; fullName: string; role: string }>; recentCourses: Array<{ id: string; title: string; status: string }>; recentPayments: Array<{ id: string; user: { fullName: string }; course: { title: string } }>; recentNotifications: Array<{ id: string; title: string }> }>("/admin/activity", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  useEffect(() => {
    if (!tenantDetailQuery.data) {
      return;
    }

    setTenantPlanId(
      tenantDetailQuery.data.subscription?.currentSubscription?.plan.id ??
        tenantDetailQuery.data.subscription?.latestSubscription?.plan.id ??
        tenantDetailQuery.data.plan?.id ??
        ""
    );
    setTenantBillingPeriod(
      tenantDetailQuery.data.subscription?.currentSubscription?.billingPeriod ??
        tenantDetailQuery.data.subscription?.latestSubscription?.billingPeriod ??
        "MONTHLY"
    );
  }, [tenantDetailQuery.data]);

  const tenantStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/admin/tenants/${id}/status`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ isActive })
      }),
    onSuccess: refresh
  });

  const userStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/admin/users/${id}/status`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ isActive })
      }),
    onSuccess: refresh
  });

  const createAdminUserMutation = useMutation({
    mutationFn: (payload: typeof adminForm) =>
      apiFetch("/admin/admin-users", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setMessage("Admin account created successfully. The delegated admin will be required to change the temporary password on first login.");
      setAdminForm({
        fullName: "",
        email: "",
        password: "",
        permissions: ["VIEW_OVERVIEW"]
      });
      setSelectedAdminPreset("");
      setCloneAdminId("");
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["admin", "admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to create admin account.")
  });

  const updateManagedAdminPermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: AdminPermission[] }) =>
      apiFetch(`/admin/admin-users/${id}/permissions`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ permissions })
      }),
    onSuccess: async () => {
      setMessage("Admin permissions updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "admin-users"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to update admin permissions.")
  });

  const managedAdminStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/admin/admin-users/${id}/status`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ isActive })
      }),
    onSuccess: async () => {
      setMessage("Admin account status updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "admin-users"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to update admin account status.")
  });

  const resetManagedAdminPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiFetch(`/admin/admin-users/${id}/password`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ password })
      }),
    onSuccess: async (_data, variables) => {
      setMessage("Delegated admin password reset successfully. They must change it on the next login.");
      setAdminPasswordDrafts((current) => ({ ...current, [variables.id]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to reset delegated admin password.")
  });

  const archivePlanMutation = useMutation({
    mutationFn: (planId: string) =>
      apiFetch(`/admin/plans/${planId}/archive`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      setMessage("Plan archived successfully.");
      await refresh();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to archive plan.")
  });

  const upsertTenantSubscriptionMutation = useMutation({
    mutationFn: ({ tenantId, planId, billingPeriod, isTrial }: { tenantId: string; planId: string; billingPeriod: "MONTHLY" | "YEARLY"; isTrial?: boolean }) =>
      apiFetch(`/subscription/tenants/${tenantId}`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ planId, billingPeriod, isTrial })
      }),
    onSuccess: async () => {
      setMessage("Tenant subscription updated.");
      await refresh();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to update tenant subscription.")
  });

  const updateTenantSubscriptionMutation = useMutation({
    mutationFn: ({
      tenantId,
      billingPeriod,
      markCanceled,
      restartTrial
    }: {
      tenantId: string;
      billingPeriod?: "MONTHLY" | "YEARLY";
      markCanceled?: boolean;
      restartTrial?: boolean;
    }) =>
      apiFetch(`/subscription/tenants/${tenantId}`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ billingPeriod, markCanceled, restartTrial })
      }),
    onSuccess: async () => {
      setMessage("Tenant subscription action completed.");
      await refresh();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to update tenant subscription.")
  });

  const createPlanMutation = useMutation({
    mutationFn: (payload: PlanForm) =>
      apiFetch("/admin/plans", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          ...payload,
          monthlyPrice: Number(payload.monthlyPrice),
          yearlyPrice: Number(payload.yearlyPrice),
          maxCourses: Number(payload.maxCourses),
          maxSectionsPerCourse: Number(payload.maxSectionsPerCourse),
          maxLessonsPerSection: Number(payload.maxLessonsPerSection),
          maxStudentsTotal: Number(payload.maxStudentsTotal),
          maxStudentsPerCourse: Number(payload.maxStudentsPerCourse),
          maxStorageMb: Number(payload.maxStorageMb),
          maxAdminUsers: Number(payload.maxAdminUsers),
          maxInstructorUsers: Number(payload.maxInstructorUsers)
        })
      }),
    onSuccess: async () => {
      setMessage("Plan created successfully.");
      setPlanForm(defaultPlanForm);
      setSelectedPlanId(null);
      setActivePlanStep("Identity");
      await refresh();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to create plan.")
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PlanForm }) =>
      apiFetch(`/admin/plans/${id}`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          ...payload,
          monthlyPrice: Number(payload.monthlyPrice),
          yearlyPrice: Number(payload.yearlyPrice),
          maxCourses: Number(payload.maxCourses),
          maxSectionsPerCourse: Number(payload.maxSectionsPerCourse),
          maxLessonsPerSection: Number(payload.maxLessonsPerSection),
          maxStudentsTotal: Number(payload.maxStudentsTotal),
          maxStudentsPerCourse: Number(payload.maxStudentsPerCourse),
          maxStorageMb: Number(payload.maxStorageMb),
          maxAdminUsers: Number(payload.maxAdminUsers),
          maxInstructorUsers: Number(payload.maxInstructorUsers)
        })
      }),
    onSuccess: async () => {
      setMessage("Plan updated successfully.");
      setPlanForm(defaultPlanForm);
      setSelectedPlanId(null);
      setActivePlanStep("Identity");
      await refresh();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to update plan.")
  });

  const beginEditPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setActivePlanStep("Identity");
    setPlanForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      monthlyPrice: String(plan.monthlyPrice),
      yearlyPrice: String(plan.yearlyPrice),
      maxCourses: String(plan.maxCourses),
      maxSectionsPerCourse: String(plan.maxSectionsPerCourse),
      maxLessonsPerSection: String(plan.maxLessonsPerSection),
      maxStudentsTotal: String(plan.maxStudentsTotal),
      maxStudentsPerCourse: String(plan.maxStudentsPerCourse),
      maxStorageMb: String(plan.maxStorageMb),
      canPublishCourses: plan.canPublishCourses,
      canCreatePaidCourses: plan.canCreatePaidCourses,
      canUseQuizzes: plan.canUseQuizzes,
      canUseAssignments: plan.canUseAssignments,
      canIssueCertificates: plan.canIssueCertificates,
      canUseAnalytics: plan.canUseAnalytics,
      canUseReviews: plan.canUseReviews,
      canUploadThumbnails: plan.canUploadThumbnails,
      canUploadProfileImage: plan.canUploadProfileImage,
      canUseManualPayments: plan.canUseManualPayments,
      hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
      hasOnlinePayments: plan.hasOnlinePayments,
      maxAdminUsers: String(plan.maxAdminUsers),
      maxInstructorUsers: String(plan.maxInstructorUsers),
      isActive: plan.isActive
    });
    setMessage(null);
  };

  const submitPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedPlanId) {
      updatePlanMutation.mutate({ id: selectedPlanId, payload: planForm });
      return;
    }
    createPlanMutation.mutate(planForm);
  };

  const getPlanStepValidation = (step: PlanStepTitle) => {
    switch (step) {
      case "Identity":
        if (!planForm.code.trim()) {
          return { valid: false, message: "Plan code is required before continuing." };
        }
        if (!planForm.name.trim()) {
          return { valid: false, message: "Plan name is required before continuing." };
        }
        return { valid: true, message: "Identity looks good." };
      case "Pricing": {
        const monthly = toPositiveNumber(planForm.monthlyPrice);
        const yearly = toPositiveNumber(planForm.yearlyPrice);
        if (!Number.isFinite(monthly) || monthly < 0) {
          return { valid: false, message: "Monthly price must be a valid number greater than or equal to 0." };
        }
        if (!Number.isFinite(yearly) || yearly < 0) {
          return { valid: false, message: "Yearly price must be a valid number greater than or equal to 0." };
        }
        return { valid: true, message: "Pricing is ready." };
      }
      case "Workspace Limits": {
        const requiredPositiveFields: Array<{ label: string; value: string }> = [
          { label: "Courses", value: planForm.maxCourses },
          { label: "Sections per course", value: planForm.maxSectionsPerCourse },
          { label: "Lessons per section", value: planForm.maxLessonsPerSection },
          { label: "Students total", value: planForm.maxStudentsTotal },
          { label: "Students per course", value: planForm.maxStudentsPerCourse },
          { label: "Storage", value: planForm.maxStorageMb },
          { label: "Admin users", value: planForm.maxAdminUsers },
          { label: "Instructor users", value: planForm.maxInstructorUsers }
        ];
        const invalid = requiredPositiveFields.find((field) => !Number.isFinite(toPositiveNumber(field.value)) || toPositiveNumber(field.value) < 1);
        if (invalid) {
          return { valid: false, message: `${invalid.label} must be at least 1 before continuing.` };
        }
        return { valid: true, message: "Workspace limits are valid." };
      }
      case "Course Delivery":
        if (!planForm.canPublishCourses && planForm.canCreatePaidCourses) {
          return { valid: false, message: "Paid courses should not be enabled while course publishing is disabled." };
        }
        return { valid: true, message: "Course delivery settings are consistent." };
      case "Teaching Tools":
        return { valid: true, message: "Teaching tools are set." };
      case "Insights and Media":
        return { valid: true, message: "Insights and media options are ready." };
      case "Plan Status":
        return { valid: true, message: "Plan status is ready for final review." };
      default:
        return { valid: true, message: "" };
    }
  };

  const activePlanValidation = getPlanStepValidation(activePlanStep);
  const currentStepIndex = planStepOrder.indexOf(activePlanStep);
  const wizardProgress = ((currentStepIndex + 1) / planStepOrder.length) * 100;

  const goToPlanStep = (step: PlanStepTitle) => setActivePlanStep(step);
  const goToNextPlanStep = () => {
    const validation = getPlanStepValidation(activePlanStep);
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }

    setMessage(null);
    const index = planStepOrder.indexOf(activePlanStep);
    if (index < planStepOrder.length - 1) {
      setActivePlanStep(planStepOrder[index + 1]);
    }
  };
  const goToPreviousPlanStep = () => {
    const index = planStepOrder.indexOf(activePlanStep);
    if (index > 0) {
      setActivePlanStep(planStepOrder[index - 1]);
    }
  };

  const renderPlanStepFrame = ({
    title,
    description,
    children
  }: {
    title: PlanStepTitle;
    description: string;
    children: React.ReactNode;
  }) => {
    const index = planStepOrder.indexOf(title);
    const isActive = activePlanStep === title;
    const isComplete = planStepOrder.indexOf(activePlanStep) > index;

    if (!isActive) {
      return null;
    }

    return (
      <section key={title} className="rounded-2xl border border-sky-300 bg-sky-50/70 p-5 shadow-sm transition">
        <div className="flex items-start justify-between gap-4 text-left">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
            Step {index + 1} of {planStepOrder.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {children}
          <div className={`rounded-2xl border px-4 py-3 text-sm ${activePlanValidation.valid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {activePlanValidation.message}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
            {index > 0 ? (
              <button
                type="button"
                onClick={goToPreviousPlanStep}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Previous
              </button>
            ) : null}
            {index < planStepOrder.length - 1 ? (
              <button
                type="button"
                onClick={goToNextPlanStep}
                disabled={!activePlanValidation.valid}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
              >
                Continue to {planStepOrder[index + 1]}
              </button>
            ) : (
              <p className="text-sm text-slate-500">Review the completed plan summary below, then create or update the plan.</p>
            )}
          </div>
        </div>
      </section>
    );
  };

  if (!hasHydrated) {
    return <main className="p-8">Loading admin session...</main>;
  }

  return (
    <AdminShell
      title={sectionMeta[section].title}
      description={sectionMeta[section].description}
      active={section}
      navItems={navItems}
      headerActions={
        section === "overview" ? (
          <>
            {canManagePlans ? (
              <a href="/admin/plans" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Manage plans
              </a>
            ) : null}
            {canReviewTenants ? (
              <a href="/admin/tenants" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                Review tenants
              </a>
            ) : null}
          </>
        ) : null
      }
    >
      {overviewQuery.error instanceof Error ? <StatusBanner variant="error">{overviewQuery.error.message}</StatusBanner> : null}
      {message ? <StatusBanner variant="success">{message}</StatusBanner> : null}
      {!activeNavItem ? (
        <ContentCard className="p-6">
          <EmptyState
            title="Access restricted"
            description="This admin account does not have permission to view this platform surface."
            actionHref="/admin/overview"
            actionLabel="Go to overview"
          />
        </ContentCard>
      ) : null}

      {activeNavItem && section === "overview" ? (
        <AdminOverviewSection
          overview={overviewQuery.data}
          courses={coursesQuery.data}
          payments={paymentsQuery.data}
          activity={activityQuery.data}
          canReviewCourses={hasAdminPermission("REVIEW_COURSES")}
          canReviewPayments={hasAdminPermission("REVIEW_PAYMENTS")}
          coursesLoading={coursesQuery.isLoading}
          paymentsLoading={paymentsQuery.isLoading}
          activityLoading={activityQuery.isLoading}
        />
      ) : null}

      {canReviewAdmins && section === "admins" ? (
        <AdminAdminsSection
          adminForm={adminForm}
          setAdminForm={setAdminForm}
          selectedAdminPreset={selectedAdminPreset}
          setSelectedAdminPreset={setSelectedAdminPreset}
          cloneAdminId={cloneAdminId}
          setCloneAdminId={setCloneAdminId}
          adminUsers={adminUsersQuery.data}
          adminsLoading={adminUsersQuery.isLoading}
          adminSearch={adminSearch}
          setAdminSearch={setAdminSearch}
          adminPasswordDrafts={adminPasswordDrafts}
          setAdminPasswordDrafts={setAdminPasswordDrafts}
          resetPending={resetManagedAdminPasswordMutation.isPending}
          onCreateAdmin={() => createAdminUserMutation.mutate(adminForm)}
          onToggleAdminStatus={(input) => managedAdminStatusMutation.mutate(input)}
          onUpdateAdminPermissions={(input) => updateManagedAdminPermissionsMutation.mutate(input)}
          onResetAdminPassword={(input) => resetManagedAdminPasswordMutation.mutate(input)}
        />
      ) : null}

      {isSuperAdmin && section === "audit" ? (
        <AdminAuditSection
          auditCategory={auditCategory}
          setAuditCategory={setAuditCategory}
          auditLogs={auditLogsQuery.data}
          isLoading={auditLogsQuery.isLoading}
        />
      ) : null}

      {canManagePlans && section === "plans" ? (
        <AdminPlansSection
          plans={plansQuery.data}
          plansLoading={plansQuery.isLoading}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          beginEditPlan={beginEditPlan}
          archivePlan={(planId) => archivePlanMutation.mutate(planId)}
          planForm={planForm}
          setPlanForm={setPlanForm}
          activePlanStep={activePlanStep}
          setActivePlanStep={setActivePlanStep}
          currentStepIndex={currentStepIndex}
          wizardProgress={wizardProgress}
          renderPlanStepFrame={renderPlanStepFrame}
          submitPlan={submitPlan}
        />
      ) : null}

      {canReviewTenants && section === "tenants" ? (
        <AdminTenantsSection
          tenantSearch={tenantSearch}
          setTenantSearch={setTenantSearch}
          tenantStatus={tenantStatus}
          setTenantStatus={setTenantStatus}
          tenants={tenantsQuery.data}
          tenantsLoading={tenantsQuery.isLoading}
          selectedTenantId={selectedTenantId}
          setSelectedTenantId={setSelectedTenantId}
          tenantDetail={tenantDetailQuery.data}
          tenantDetailLoading={tenantDetailQuery.isLoading}
          plans={plansQuery.data}
          tenantPlanId={tenantPlanId}
          setTenantPlanId={setTenantPlanId}
          tenantBillingPeriod={tenantBillingPeriod}
          setTenantBillingPeriod={setTenantBillingPeriod}
          onToggleTenantStatus={(input) => tenantStatusMutation.mutate(input)}
          onActivateSubscription={(input) => upsertTenantSubscriptionMutation.mutate(input)}
          onEndSubscription={(input) => updateTenantSubscriptionMutation.mutate(input)}
        />
      ) : null}

      {canReviewUsers && section === "users" ? (
        <AdminUsersSection
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userRole={userRole}
          setUserRole={setUserRole}
          userStatus={userStatus}
          setUserStatus={setUserStatus}
          users={usersQuery.data}
          usersLoading={usersQuery.isLoading}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          userDetail={userDetailQuery.data}
          userDetailLoading={userDetailQuery.isLoading}
          onToggleUserStatus={(input) => userStatusMutation.mutate(input)}
        />
      ) : null}
    </AdminShell>
  );
}

