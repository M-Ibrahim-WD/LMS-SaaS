"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";
import type { AdminPermission } from "../../../lib/auth/token";
import { AdminSectionKey, AdminShell } from "./admin-shell";

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
  REVIEW_ADMINS: { label: "Review admins", description: "Create and manage other admin accounts." }
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
  const canReviewAdmins = isSuperAdmin;
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            {[
              ["Users", overviewQuery.data?.totals.users ?? 0],
              ["Tenants", overviewQuery.data?.totals.tenants ?? 0],
              ["Plans", overviewQuery.data?.totals.plans ?? 0],
              ["Courses", overviewQuery.data?.totals.courses ?? 0],
              ["Approved Payments", overviewQuery.data?.totals.approvedPayments ?? 0],
              ["Revenue", money.format(overviewQuery.data?.totals.approvedRevenue ?? 0)],
              ["Unread Notifications", overviewQuery.data?.totals.unreadNotifications ?? 0]
            ].map(([label, value]) => (
              <ContentCard key={String(label)} className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
              </ContentCard>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            {canReviewOps ? (
              <ContentCard className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker">Operational Snapshot</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">Courses and payments</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasAdminPermission("REVIEW_COURSES") ? <StatusChip tone="info">Courses</StatusChip> : null}
                    {hasAdminPermission("REVIEW_PAYMENTS") ? <StatusChip tone="warning">Payments</StatusChip> : null}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {hasAdminPermission("REVIEW_COURSES") ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                      <p className="text-sm font-semibold text-slate-900">Recent courses</p>
                      <div className="mt-3 space-y-2">
                        {coursesQuery.data?.slice(0, 4).map((course) => (
                          <div key={course.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                            <p className="font-medium text-slate-900">{course.title}</p>
                            <p className="mt-1 text-slate-500">{course.instructor.fullName} • {course.tenant.name}</p>
                          </div>
                        )) ?? <p className="text-sm text-slate-500">No courses yet.</p>}
                      </div>
                    </div>
                  ) : null}
                  {hasAdminPermission("REVIEW_PAYMENTS") ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                      <p className="text-sm font-semibold text-slate-900">Recent payments</p>
                      <div className="mt-3 space-y-2">
                        {paymentsQuery.data?.slice(0, 4).map((payment) => (
                          <div key={payment.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                            <p className="font-medium text-slate-900">{payment.course.title}</p>
                            <p className="mt-1 text-slate-500">{payment.user.fullName} • {money.format(payment.amount)}</p>
                          </div>
                        )) ?? <p className="text-sm text-slate-500">No payments yet.</p>}
                      </div>
                    </div>
                  ) : null}
                </div>
              </ContentCard>
            ) : null}

            <ContentCard className="p-6">
              <p className="section-kicker">Quick links</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Jump into the right management area</h3>
              <div className="mt-5 space-y-3">
                {navItems.filter((item) => item.visible && item.key !== "overview").map((item) => (
                  <a key={item.key} href={item.href} className="block rounded-[24px] border border-slate-200 bg-white/90 p-4 transition hover:border-slate-300">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </a>
                ))}
              </div>
            </ContentCard>
          </div>
        </>
      ) : null}

      {isSuperAdmin && section === "admins" ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <ContentCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Super Admin Controls</h2>
            <p className="mt-2 text-sm text-slate-600">
              This account has full platform authority. Other admins can be created here with only the permissions you explicitly assign.
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createAdminUserMutation.mutate(adminForm);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Admin name</span>
                  <input value={adminForm.fullName} onChange={(event) => setAdminForm((current) => ({ ...current, fullName: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Admin email</span>
                  <input type="email" value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" required />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Temporary password</span>
                <input type="password" value={adminForm.password} onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" required />
                <span className="mt-2 block text-xs text-slate-500">This delegated admin will be required to change this password on first login.</span>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Permission preset</span>
                  <select
                    value={selectedAdminPreset}
                    onChange={(event) => {
                      const presetKey = event.target.value;
                      setSelectedAdminPreset(presetKey);
                      if (presetKey) {
                        setCloneAdminId("");
                      }
                      const preset = adminPermissionPresets.find((entry) => entry.key === presetKey);
                      if (preset) {
                        setAdminForm((current) => ({ ...current, permissions: preset.permissions }));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  >
                    <option value="">Choose a preset or customize manually</option>
                    {adminPermissionPresets.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs text-slate-500">
                    {selectedAdminPreset
                      ? adminPermissionPresets.find((preset) => preset.key === selectedAdminPreset)?.description
                      : "Pick a preset to prefill permissions quickly, then adjust any permission below."}
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Clone from existing admin</span>
                  <select
                    value={cloneAdminId}
                    onChange={(event) => {
                      const nextAdminId = event.target.value;
                      setCloneAdminId(nextAdminId);
                      if (nextAdminId) {
                        setSelectedAdminPreset("");
                      }
                      const sourceAdmin = adminUsersQuery.data?.find((entry) => entry.id === nextAdminId);
                      if (sourceAdmin) {
                        setAdminForm((current) => ({ ...current, permissions: sourceAdmin.adminPermissions }));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  >
                    <option value="">Choose an existing delegated admin</option>
                    {adminUsersQuery.data?.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.fullName} ({admin.email})
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs text-slate-500">Useful when you want to duplicate a proven permission mix instead of rebuilding it manually.</span>
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Admin permissions</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {adminPermissionOrder.map((permission) => (
                    <label key={permission} className={`rounded-2xl border p-4 ${adminForm.permissions.includes(permission) ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={adminForm.permissions.includes(permission)}
                          onChange={(event) =>
                            setAdminForm((current) => ({
                              ...current,
                              permissions: event.target.checked
                                ? [...current.permissions, permission]
                                : current.permissions.filter((entry) => entry !== permission)
                            }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{adminPermissionLabels[permission].label}</p>
                          <p className="mt-1 text-xs text-slate-500">{adminPermissionLabels[permission].description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white">
                Create Admin Account
              </button>
            </form>
          </ContentCard>

          <ContentCard className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Managed Admin Accounts</h2>
                <p className="mt-1 text-sm text-slate-600">The super admin account itself is not listed, visible, or editable here.</p>
              </div>
              <input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search admins" className="w-full max-w-56 rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            </div>
            <div className="mt-4 space-y-4">
              {adminUsersQuery.data?.length ? adminUsersQuery.data.map((admin) => (
                <div key={admin.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{admin.fullName}</p>
                      <p className="mt-1 text-sm text-slate-500">{admin.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${admin.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </span>
                        {admin.mustChangePassword ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Must change password</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => managedAdminStatusMutation.mutate({ id: admin.id, isActive: !admin.isActive })}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      {admin.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {adminPermissionOrder.map((permission) => (
                      <label key={`${admin.id}-${permission}`} className={`rounded-2xl border p-3 ${admin.adminPermissions.includes(permission) ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={admin.adminPermissions.includes(permission)}
                            onChange={(event) => {
                              const nextPermissions = event.target.checked
                                ? [...admin.adminPermissions, permission]
                                : admin.adminPermissions.filter((entry) => entry !== permission);
                              updateManagedAdminPermissionsMutation.mutate({ id: admin.id, permissions: nextPermissions });
                            }}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{adminPermissionLabels[permission].label}</p>
                            <p className="mt-1 text-xs text-slate-500">{adminPermissionLabels[permission].description}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Reset delegated admin password</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <input
                        type="password"
                        value={adminPasswordDrafts[admin.id] ?? ""}
                        onChange={(event) =>
                          setAdminPasswordDrafts((current) => ({
                            ...current,
                            [admin.id]: event.target.value
                          }))
                        }
                        placeholder="New temporary password"
                        className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!(adminPasswordDrafts[admin.id] ?? "").trim() || resetManagedAdminPasswordMutation.isPending}
                        onClick={() =>
                          resetManagedAdminPasswordMutation.mutate({
                            id: admin.id,
                            password: (adminPasswordDrafts[admin.id] ?? "").trim()
                          })
                        }
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                      >
                        Reset password
                      </button>
                    </div>
                  </div>
                </div>
              )) : adminUsersQuery.isLoading ? <StatusBanner>Loading admin accounts...</StatusBanner> : <EmptyState title="No managed admins" description="Create limited admin accounts here when you want to delegate platform work safely." />}
            </div>
          </ContentCard>
        </div>
      ) : null}

        {isSuperAdmin && section === "audit" ? (
        <ContentCard className="mt-8 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Admin Audit Log</h2>
              <p className="mt-1 text-sm text-slate-600">Sensitive admin actions are recorded here for the super admin only.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {auditCategoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAuditCategory(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    auditCategory === option.value
                      ? "bg-slate-950 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {auditCategoryOptions.find((option) => option.value === auditCategory)?.description}
          </p>
          <div className="mt-4 space-y-3">
            {auditLogsQuery.data?.length ? (
              auditLogsQuery.data.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{entry.summary}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.actor.fullName} ({entry.actor.email}) • {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{entry.action}</span>
                  </div>
                </div>
              ))
            ) : auditLogsQuery.isLoading ? (
              <StatusBanner>Loading audit logs...</StatusBanner>
            ) : (
              <EmptyState title="No audit entries yet" description="Delegated-admin and sensitive platform actions will appear here." />
            )}
          </div>
        </ContentCard>
      ) : null}

      {canManagePlans && section === "plans" ? (
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Plans</h2>
          <div className="mt-4 space-y-3">
            {plansQuery.data?.length ? plansQuery.data.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{plan.name} <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{plan.code}</span></p>
                    <p className="mt-1 text-sm text-slate-500">{plan.description || "No description provided."}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {money.format(plan.monthlyPrice)}/mo | {money.format(plan.yearlyPrice)}/yr | {plan.maxCourses} courses | {plan.maxStudentsTotal} students | {plan.maxStorageMb} MB
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan._count?.tenants ?? 0} tenants | {plan._count?.subscriptions ?? 0} subscription records {plan.isArchived ? "| Archived" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{plan.isActive ? "Active" : "Inactive"}</span>
                    <button type="button" onClick={() => beginEditPlan(plan)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">Edit</button>
                    {!plan.isArchived ? (
                      <button type="button" onClick={() => archivePlanMutation.mutate(plan.id)} className="rounded-full border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700">
                        Archive
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : plansQuery.isLoading ? <StatusBanner>Loading plans...</StatusBanner> : <EmptyState title="No plans yet" description="Create your first SaaS plan to start controlling tenant limits." />}
          </div>
        </ContentCard>

        <ContentCard className="p-6">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-950">{selectedPlanId ? "Edit Subscription Plan" : "Create Subscription Plan"}</h2>
            <p className="text-sm text-slate-600">
              Only one step appears at a time. Finish the current step to move to the next one, then review the final summary before saving.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {planStepOrder.map((step, index) => {
              const isCurrent = step === activePlanStep;
              const isPast = planStepOrder.indexOf(activePlanStep) > index;
              return (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isCurrent
                      ? "bg-slate-950 text-white"
                      : isPast
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index + 1}. {step}
                </span>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${wizardProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              Progress: {currentStepIndex + 1} / {planStepOrder.length}
            </p>
          </div>

          <form onSubmit={submitPlan} className="mt-5 space-y-5">
            {renderPlanStepFrame({
              title: "Identity",
              description: "These fields define how the plan appears to admins and instructors.",
              children: (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Plan code</span>
                  <input
                    value={planForm.code}
                    onChange={(event) => setPlanForm((c) => ({ ...c, code: event.target.value }))}
                    placeholder="STUDIO"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    required
                  />
                  <span className="mt-2 block text-xs text-slate-500">Internal unique key used by the platform.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Plan name</span>
                  <input
                    value={planForm.name}
                    onChange={(event) => setPlanForm((c) => ({ ...c, name: event.target.value }))}
                    placeholder="Studio"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    required
                  />
                  <span className="mt-2 block text-xs text-slate-500">Customer-facing plan name shown in the UI.</span>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Description</span>
                  <textarea
                    value={planForm.description}
                    onChange={(event) => setPlanForm((c) => ({ ...c, description: event.target.value }))}
                    placeholder="Balanced workspace for serious independent instructors."
                    className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  />
                  <span className="mt-2 block text-xs text-slate-500">Short positioning text that explains who the plan is for.</span>
                </label>
              </div>
              )
            })}

            {renderPlanStepFrame({
              title: "Pricing",
              description: "Set the recurring price points for monthly and yearly billing.",
              children: (
              <div className="grid gap-4 md:grid-cols-2">
                {numericFieldMeta
                  .filter((field) => field.key === "monthlyPrice" || field.key === "yearlyPrice")
                  .map((field) => (
                    <label key={field.key} className="block rounded-2xl border border-slate-200 bg-white p-4">
                      <span className="block text-sm font-medium text-slate-800">{field.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{field.help}</span>
                      <input
                        type="number"
                        min={field.min ?? 0}
                        value={planForm[field.key]}
                        onChange={(event) => setPlanForm((c) => ({ ...c, [field.key]: event.target.value }))}
                        className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                  ))}
              </div>
              )
            })}

            {renderPlanStepFrame({
              title: "Workspace Limits",
              description: "Hard numeric caps that control content growth, learners, storage, and team size.",
              children: (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {numericFieldMeta
                  .filter((field) => field.key !== "monthlyPrice" && field.key !== "yearlyPrice")
                  .map((field) => (
                    <label key={field.key} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <span className="block text-sm font-medium text-slate-800">{field.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{field.help}</span>
                      <input
                        type="number"
                        min={field.min ?? 0}
                        value={planForm[field.key]}
                        onChange={(event) => setPlanForm((c) => ({ ...c, [field.key]: event.target.value }))}
                        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      />
                    </label>
                  ))}
              </div>
              )
            })}

            {featureFieldGroups.map((group) =>
              renderPlanStepFrame({
                title: group.title as PlanStepTitle,
                description: group.description,
                children: (
                <div className="grid gap-3 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <label
                      key={field.key}
                      className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                        planForm[field.key]
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={planForm[field.key]}
                        onChange={(event) => setPlanForm((c) => ({ ...c, [field.key]: event.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">{field.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{field.help}</span>
                      </span>
                    </label>
                  ))}
                </div>
                )
              })
            )}

            {activePlanStep === "Plan Status" ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Quick Summary</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Billing</p>
                      <p className="mt-2 text-lg font-semibold">
                        {money.format(Number(planForm.monthlyPrice || 0))} / {money.format(Number(planForm.yearlyPrice || 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Content</p>
                      <p className="mt-2 text-sm text-slate-100">
                        {planForm.maxCourses} courses, {planForm.maxSectionsPerCourse} sections/course, {planForm.maxLessonsPerSection} lessons/section
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Students</p>
                      <p className="mt-2 text-sm text-slate-100">
                        {planForm.maxStudentsTotal} total, {planForm.maxStudentsPerCourse} per course
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Key Features</p>
                      <p className="mt-2 text-sm text-slate-100">
                        {[
                          planForm.canCreatePaidCourses ? "Paid courses" : null,
                          planForm.canUseAnalytics ? "Analytics" : null,
                          planForm.canUseAssignments ? "Assignments" : null,
                          planForm.canIssueCertificates ? "Certificates" : null
                        ]
                          .filter(Boolean)
                          .join(", ") || "Basic teaching tools"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                          {planForm.code || "PLAN"}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planForm.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {planForm.isActive ? "Active for assignment" : "Inactive"}
                        </span>
                      </div>
                      <h3 className="mt-4 text-3xl font-semibold text-slate-950">{planForm.name || "Untitled Plan"}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {planForm.description?.trim() || "No plan description yet. Add a short positioning line so instructors understand who this plan is for."}
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Monthly</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{money.format(Number(planForm.monthlyPrice || 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yearly</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{money.format(Number(planForm.yearlyPrice || 0))}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Storage</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{planForm.maxStorageMb} MB</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full max-w-sm rounded-[24px] bg-slate-950 p-5 text-white">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Instructor-Facing Preview</p>
                      <p className="mt-3 text-2xl font-semibold">{planForm.name || "Untitled Plan"}</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {planForm.canCreatePaidCourses ? "Built for instructors who want to sell and scale their academy." : "Best for free-course academies and lightweight teaching."}
                      </p>
                      <div className="mt-5 space-y-3 text-sm text-slate-100">
                        <p>{planForm.maxCourses} courses included</p>
                        <p>{planForm.maxStudentsTotal} students total</p>
                        <p>{planForm.maxSectionsPerCourse} sections per course</p>
                        <p>{planForm.maxLessonsPerSection} lessons per section</p>
                        <p>{planForm.canUseQuizzes ? "Quizzes enabled" : "Quizzes disabled"}</p>
                        <p>{planForm.canUseAssignments ? "Assignments enabled" : "Assignments disabled"}</p>
                        <p>{planForm.canIssueCertificates ? "Certificates enabled" : "Certificates disabled"}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white">
                    {selectedPlanId ? "Update Plan" : "Create Plan"}
                  </button>
                  {selectedPlanId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(null);
                        setPlanForm(defaultPlanForm);
                        setActivePlanStep("Identity");
                      }}
                      className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700"
                    >
                      Cancel editing
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </form>
        </ContentCard>
      </div>
      ) : null}

      {canReviewTenants && section === "tenants" ? (
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Tenants</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <input value={tenantSearch} onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenant name or invite code" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <select value={tenantStatus} onChange={(event) => setTenantStatus(event.target.value as typeof tenantStatus)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="ALL">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {tenantsQuery.data?.length ? tenantsQuery.data.map((tenant) => (
              <button key={tenant.id} type="button" onClick={() => setSelectedTenantId(tenant.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedTenantId === tenant.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{tenant.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Owner: {tenant.owner?.fullName ?? "Unassigned"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{tenant.plan?.name ?? "No plan assigned"}</p>
                    <p className="mt-2 text-xs text-slate-500">{tenant.usage.usersCount} users | {tenant.usage.coursesCount} courses | {tenant.usage.enrollmentsCount} enrollments</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${tenant.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{tenant.isActive ? "Active" : "Inactive"}</span>
                </div>
              </button>
            )) : tenantsQuery.isLoading ? <StatusBanner>Loading tenants...</StatusBanner> : <EmptyState title="No tenants found" description="Tenant search will populate here when matching organizations exist." />}
          </div>
        </ContentCard>

        <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Tenant Detail</h2>
          {tenantDetailQuery.data ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-slate-950">{tenantDetailQuery.data.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Invite Code: {tenantDetailQuery.data.inviteCode}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Current Plan: {tenantDetailQuery.data.subscription?.currentSubscription?.plan.name ?? tenantDetailQuery.data.subscription?.latestSubscription?.plan.name ?? "No plan assigned"}
                  </p>
                </div>
                <button type="button" onClick={() => tenantStatusMutation.mutate({ id: tenantDetailQuery.data.id, isActive: !tenantDetailQuery.data.isActive })} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  {tenantDetailQuery.data.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <select value={tenantPlanId} onChange={(event) => setTenantPlanId(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  <option value="">Choose a plan</option>
                  {plansQuery.data?.filter((plan) => !plan.isArchived).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} ({plan.code})</option>)}
                </select>
                <select value={tenantBillingPeriod} onChange={(event) => setTenantBillingPeriod(event.target.value as "MONTHLY" | "YEARLY")} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => tenantPlanId && upsertTenantSubscriptionMutation.mutate({ tenantId: tenantDetailQuery.data.id, planId: tenantPlanId, billingPeriod: tenantBillingPeriod })}
                    disabled={!tenantPlanId}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    onClick={() => tenantPlanId && upsertTenantSubscriptionMutation.mutate({ tenantId: tenantDetailQuery.data.id, planId: tenantPlanId, billingPeriod: "MONTHLY", isTrial: true })}
                    disabled={!tenantPlanId}
                    className="rounded-full border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 disabled:opacity-50"
                  >
                    Restart trial
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTenantSubscriptionMutation.mutate({ tenantId: tenantDetailQuery.data.id, markCanceled: true })}
                    className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700"
                  >
                    End current
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Usage</p>
                  <p className="mt-2">{tenantDetailQuery.data.usage.usersCount} users</p>
                  <p>{tenantDetailQuery.data.usage.studentsCount ?? 0} students</p>
                  <p>{tenantDetailQuery.data.usage.instructorsCount ?? 0} instructors</p>
                  <p>{tenantDetailQuery.data.usage.adminsCount ?? 0} admins</p>
                  <p>{tenantDetailQuery.data.usage.coursesCount} courses</p>
                  <p>{money.format(tenantDetailQuery.data.usage.approvedRevenue ?? 0)} approved revenue</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Subscription</p>
                  <p className="mt-2">State: {tenantDetailQuery.data.subscription?.currentSubscription?.state ?? tenantDetailQuery.data.subscription?.latestSubscription?.state ?? "NONE"}</p>
                  <p>Trial days remaining: {tenantDetailQuery.data.subscription?.daysRemaining ?? 0}</p>
                  <p>Freeze creation: {tenantDetailQuery.data.subscription?.freezeCreation ? "Yes" : "No"}</p>
                  <p>Limit snapshot: {tenantDetailQuery.data.plan?.maxCourses ?? tenantDetailQuery.data.subscription?.trialRules.maxCourses ?? "—"} courses</p>
                  <p>Student cap: {tenantDetailQuery.data.plan?.maxStudentsTotal ?? tenantDetailQuery.data.subscription?.trialRules.maxStudentsTotal ?? "—"}</p>
                </div>
              </div>
            </div>
          ) : tenantDetailQuery.isLoading ? <StatusBanner>Loading tenant detail...</StatusBanner> : <EmptyState title="Select a tenant" description="Choose a tenant from the list to inspect its plan and usage." />}
        </ContentCard>
      </div>
      ) : null}

      {canReviewUsers && section === "users" ? (
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Users</h2>
          <p className="mt-1 text-sm text-slate-500">Platform admins are kept separate, so this list focuses on instructor and student accounts.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search name or email" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <select value={userRole} onChange={(event) => setUserRole(event.target.value as typeof userRole)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="ALL">All roles</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="STUDENT">Student</option>
            </select>
            <select value={userStatus} onChange={(event) => setUserStatus(event.target.value as typeof userStatus)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="ALL">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {usersQuery.data?.length ? usersQuery.data.map((user) => (
              <button key={user.id} type="button" onClick={() => setSelectedUserId(user.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedUserId === user.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{user.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                    <p className="mt-2 text-xs text-slate-500">{user.role} | {user.tenant?.name ?? "No tenant"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                </div>
              </button>
            )) : usersQuery.isLoading ? <StatusBanner>Loading users...</StatusBanner> : <EmptyState title="No users found" description="Adjust the filters to surface users here." />}
          </div>
        </ContentCard>

        <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">User Detail</h2>
          {userDetailQuery.data ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-slate-950">{userDetailQuery.data.user.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">{userDetailQuery.data.user.email}</p>
                </div>
                <button type="button" onClick={() => userStatusMutation.mutate({ id: userDetailQuery.data.user.id, isActive: !userDetailQuery.data.user.isActive })} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  {userDetailQuery.data.user.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p>Role: {userDetailQuery.data.user.role}</p>
                <p>Tenant: {userDetailQuery.data.user.tenant?.name ?? "No tenant"}</p>
                <p>Enrollments: {userDetailQuery.data.user._count.enrollments}</p>
                <p>Courses: {userDetailQuery.data.user._count.instructorCourses}</p>
              </div>
            </div>
          ) : userDetailQuery.isLoading ? <StatusBanner>Loading user detail...</StatusBanner> : <EmptyState title="Select a user" description="Choose a user from the list to inspect account state." />}
        </ContentCard>
      </div>
      ) : null}

      {canReviewOps && section === "overview" ? (
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {hasAdminPermission("REVIEW_COURSES") ? <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Platform Courses</h2>
          <div className="mt-4 space-y-3">
            {coursesQuery.data?.length ? coursesQuery.data.slice(0, 10).map((course) => (
              <div key={course.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{course.title}</p>
                <p className="mt-1 text-sm text-slate-500">{course.instructor.fullName} | {course.tenant.name}</p>
                <p className="mt-2 text-xs text-slate-500">{course._count.enrollments} enrollments | {course._count.reviews} reviews | {course.status}</p>
              </div>
            )) : coursesQuery.isLoading ? <StatusBanner>Loading courses...</StatusBanner> : <EmptyState title="No courses yet" description="Course oversight will appear here when courses exist." />}
          </div>
        </ContentCard> : null}

        {hasAdminPermission("REVIEW_PAYMENTS") ? <ContentCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Platform Payments</h2>
          <div className="mt-4 space-y-3">
            {paymentsQuery.data?.length ? paymentsQuery.data.slice(0, 10).map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{payment.course.title}</p>
                <p className="mt-1 text-sm text-slate-500">{payment.user.fullName} | {payment.tenant.name}</p>
                <p className="mt-2 text-xs text-slate-500">{payment.method.label} | {money.format(payment.amount)} | {payment.status}</p>
              </div>
            )) : paymentsQuery.isLoading ? <StatusBanner>Loading payments...</StatusBanner> : <EmptyState title="No payments yet" description="Payment oversight will appear here when transactions exist." />}
          </div>
        </ContentCard> : null}
      </div>
      ) : null}

      {canViewOverview && section === "overview" ? <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Recent Platform Activity</h2>
        {activityQuery.data ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-4">
            <div><p className="text-sm font-medium text-slate-900">Users</p><div className="mt-3 space-y-2">{activityQuery.data.recentUsers.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">{item.fullName} | {item.role}</div>)}</div></div>
            <div><p className="text-sm font-medium text-slate-900">Courses</p><div className="mt-3 space-y-2">{activityQuery.data.recentCourses.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">{item.title} | {item.status}</div>)}</div></div>
            <div><p className="text-sm font-medium text-slate-900">Payments</p><div className="mt-3 space-y-2">{activityQuery.data.recentPayments.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">{item.user.fullName} | {item.course.title}</div>)}</div></div>
            <div><p className="text-sm font-medium text-slate-900">Notifications</p><div className="mt-3 space-y-2">{activityQuery.data.recentNotifications.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">{item.title}</div>)}</div></div>
          </div>
        ) : activityQuery.isLoading ? <StatusBanner>Loading activity...</StatusBanner> : <EmptyState title="No recent activity" description="Platform activity will populate here as the system is used." />}
      </ContentCard> : null}
    </AdminShell>
  );
}
