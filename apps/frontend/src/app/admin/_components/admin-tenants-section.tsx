"use client";

import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import type { Plan, Tenant } from "./admin-control-center.shared";
import { money } from "./admin-control-center.shared";

interface AdminTenantsSectionProps {
  tenantSearch: string;
  setTenantSearch: (value: string) => void;
  tenantStatus: "ALL" | "true" | "false";
  setTenantStatus: (value: "ALL" | "true" | "false") => void;
  tenants?: Tenant[];
  tenantsLoading: boolean;
  selectedTenantId: string | null;
  setSelectedTenantId: (value: string) => void;
  tenantDetail?: Tenant;
  tenantDetailLoading: boolean;
  plans?: Plan[];
  tenantPlanId: string;
  setTenantPlanId: (value: string) => void;
  tenantBillingPeriod: "MONTHLY" | "YEARLY";
  setTenantBillingPeriod: (value: "MONTHLY" | "YEARLY") => void;
  onToggleTenantStatus: (input: { id: string; isActive: boolean }) => void;
  onActivateSubscription: (input: {
    tenantId: string;
    planId: string;
    billingPeriod: "MONTHLY" | "YEARLY";
    isTrial?: boolean;
  }) => void;
  onEndSubscription: (input: { tenantId: string; markCanceled: boolean }) => void;
}

export function AdminTenantsSection({
  tenantSearch,
  setTenantSearch,
  tenantStatus,
  setTenantStatus,
  tenants,
  tenantsLoading,
  selectedTenantId,
  setSelectedTenantId,
  tenantDetail,
  tenantDetailLoading,
  plans,
  tenantPlanId,
  setTenantPlanId,
  tenantBillingPeriod,
  setTenantBillingPeriod,
  onToggleTenantStatus,
  onActivateSubscription,
  onEndSubscription
}: AdminTenantsSectionProps) {
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Tenants</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            value={tenantSearch}
            onChange={(event) => setTenantSearch(event.target.value)}
            placeholder="Search tenant name or invite code"
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <select
            value={tenantStatus}
            onChange={(event) => setTenantStatus(event.target.value as typeof tenantStatus)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {tenants?.length ? (
            tenants.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => setSelectedTenantId(tenant.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedTenantId === tenant.id
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{tenant.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Owner: {tenant.owner?.fullName ?? "Unassigned"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {tenant.plan?.name ?? "No plan assigned"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {tenant.usage.usersCount} users | {tenant.usage.coursesCount} courses |{" "}
                      {tenant.usage.enrollmentsCount} enrollments
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      tenant.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {tenant.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </button>
            ))
          ) : tenantsLoading ? (
            <StatusBanner>Loading tenants...</StatusBanner>
          ) : (
            <EmptyState
              title="No tenants found"
              description="Tenant search will populate here when matching organizations exist."
            />
          )}
        </div>
      </ContentCard>

      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Tenant Detail</h2>
        {tenantDetail ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xl font-semibold text-slate-950">{tenantDetail.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Invite code: {tenantDetail.inviteCode}
                    </span>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                      Current plan:{" "}
                      {tenantDetail.subscription?.currentSubscription?.plan.name ??
                        tenantDetail.subscription?.latestSubscription?.plan.name ??
                        "No plan assigned"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onToggleTenantStatus({
                      id: tenantDetail.id,
                      isActive: !tenantDetail.isActive
                    })
                  }
                  className="shrink-0 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700"
                >
                  {tenantDetail.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 lg:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Plan</span>
                  <select
                    value={tenantPlanId}
                    onChange={(event) => setTenantPlanId(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Choose a plan</option>
                    {plans?.filter((plan) => !plan.isArchived).map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Billing period</span>
                  <select
                    value={tenantBillingPeriod}
                    onChange={(event) =>
                      setTenantBillingPeriod(event.target.value as "MONTHLY" | "YEARLY")
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      tenantPlanId &&
                      onActivateSubscription({
                        tenantId: tenantDetail.id,
                        planId: tenantPlanId,
                        billingPeriod: tenantBillingPeriod
                      })
                    }
                    disabled={!tenantPlanId}
                    className="w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 lg:w-auto"
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      tenantPlanId &&
                      onActivateSubscription({
                        tenantId: tenantDetail.id,
                        planId: tenantPlanId,
                        billingPeriod: "MONTHLY",
                        isTrial: true
                      })
                    }
                    disabled={!tenantPlanId}
                    className="w-full rounded-full border border-sky-300 px-4 py-2.5 text-sm font-medium text-sky-700 disabled:opacity-50 lg:w-auto"
                  >
                    Restart trial
                  </button>
                  <button
                    type="button"
                    onClick={() => onEndSubscription({ tenantId: tenantDetail.id, markCanceled: true })}
                    className="w-full rounded-full border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-700 lg:w-auto"
                  >
                    End current
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Usage</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Users</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.usage.usersCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Students</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.usage.studentsCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Instructors</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.usage.instructorsCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Admins</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.usage.adminsCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Courses</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.usage.coursesCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Approved revenue</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {money.format(tenantDetail.usage.approvedRevenue ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Subscription</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">State</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.subscription?.currentSubscription?.state ??
                        tenantDetail.subscription?.latestSubscription?.state ??
                        "NONE"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Trial days left</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.subscription?.daysRemaining ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Freeze creation</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.subscription?.freezeCreation ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Limit snapshot</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.plan?.maxCourses ??
                        tenantDetail.subscription?.trialRules.maxCourses ??
                        "-"}{" "}
                      courses
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Student cap</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {tenantDetail.plan?.maxStudentsTotal ??
                        tenantDetail.subscription?.trialRules.maxStudentsTotal ??
                        "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : tenantDetailLoading ? (
          <StatusBanner>Loading tenant detail...</StatusBanner>
        ) : (
          <EmptyState
            title="Select a tenant"
            description="Choose a tenant from the list to inspect its plan and usage."
          />
        )}
      </ContentCard>
    </div>
  );
}
