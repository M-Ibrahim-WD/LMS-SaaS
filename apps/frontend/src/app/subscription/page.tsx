"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ContentCard } from "../../components/content-card";
import { EmptyState } from "../../components/empty-state";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { useRequireAuth } from "../../hooks/use-require-auth";
import { apiFetch } from "../../lib/api/client";

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
  maxStudentsTotal: number;
  maxStudentsPerCourse: number;
  canCreatePaidCourses: boolean;
  canUseAnalytics: boolean;
  canUseAssignments: boolean;
  canUseCertificates?: boolean;
};

type SubscriptionSummary = {
  requiresPlanSelection: boolean;
  freezeCreation: boolean;
  daysRemaining: number;
  selectedPlan: Pick<Plan, "id" | "name" | "code"> | null;
  currentSubscription: {
    id: string;
    state: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    billingPeriod: "MONTHLY" | "YEARLY";
    endsAt: string;
    isTrial: boolean;
    adminActivated: boolean;
  } | null;
  latestSubscription: {
    id: string;
    state: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    billingPeriod: "MONTHLY" | "YEARLY";
    endsAt: string;
    isTrial: boolean;
  } | null;
  usage: {
    coursesCount: number;
    studentsCount: number;
  };
  effectivePermissions: {
    maxCourses: number;
    maxStudentsTotal: number;
  } | null;
  trialRules: {
    maxCourses: number;
    maxSectionsPerCourse: number;
    maxLessonsPerSection: number;
    maxStudentsTotal: number;
  };
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export default function SubscriptionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, user, hasHydrated } = useRequireAuth({ roles: ["INSTRUCTOR"] });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: () => apiFetch<Plan[]>("/subscription/plans", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const summaryQuery = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: () => apiFetch<SubscriptionSummary>("/subscription/me", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const selectPlanMutation = useMutation({
    mutationFn: (planId: string) =>
      apiFetch("/subscription/select-plan", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ planId })
      }),
    onSuccess: async () => {
      setMessage("Plan selected. Your 7-day free trial has started.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] })
      ]);
      router.push("/dashboard");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Failed to select plan.");
    }
  });

  const selectedPlan = useMemo(
    () => plansQuery.data?.find((plan) => plan.id === selectedPlanId) ?? null,
    [plansQuery.data, selectedPlanId]
  );

  if (!hasHydrated) {
    return <main className="p-8">Loading session...</main>;
  }

  return (
    <PageShell
      title="Choose Your Instructor Plan"
      description="Pick a plan to unlock your 7-day trial. Trial workspaces can create 2 free courses, with 1 section and 1 lesson each, and welcome up to 10 students."
      backHref="/dashboard"
      maxWidthClassName="max-w-6xl"
    >
      {message ? <StatusBanner>{message}</StatusBanner> : null}

      {summaryQuery.data ? (
        <ContentCard className="mb-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace status</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {summaryQuery.data.selectedPlan?.name ?? "No plan selected yet"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {summaryQuery.data.freezeCreation
                  ? "Your workspace is frozen for creation until an admin activates a subscription."
                  : summaryQuery.data.currentSubscription?.isTrial
                    ? `Trial active for ${summaryQuery.data.daysRemaining} more day(s). Trial limits are enforced globally.`
                    : `Subscription active until ${new Date(
                        summaryQuery.data.currentSubscription?.endsAt ?? summaryQuery.data.latestSubscription?.endsAt ?? Date.now()
                      ).toLocaleDateString()}.`}
              </p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <p>
                Courses used: {summaryQuery.data.usage.coursesCount}/
                {summaryQuery.data.effectivePermissions?.maxCourses ?? summaryQuery.data.trialRules.maxCourses}
              </p>
              <p>
                Students used: {summaryQuery.data.usage.studentsCount}/
                {summaryQuery.data.effectivePermissions?.maxStudentsTotal ?? summaryQuery.data.trialRules.maxStudentsTotal}
              </p>
            </div>
          </div>
        </ContentCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-4">
        {plansQuery.data?.length ? (
          plansQuery.data.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = summaryQuery.data?.selectedPlan?.id === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`rounded-3xl border p-6 text-left transition ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white shadow-xl"
                    : "border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm uppercase tracking-[0.22em] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                      {plan.code}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">{plan.name}</h2>
                  </div>
                  {isCurrent ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${isSelected ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                      Current
                    </span>
                  ) : null}
                </div>
                <p className={`mt-3 text-sm ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                  {plan.description || "No description provided."}
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-3xl font-semibold">{currency.format(plan.monthlyPrice)}<span className="text-sm font-medium">/mo</span></p>
                  <p className={`text-sm ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {currency.format(plan.yearlyPrice)}/year
                  </p>
                </div>
                <div className={`mt-6 space-y-2 text-sm ${isSelected ? "text-slate-100" : "text-slate-700"}`}>
                  <p>{plan.maxCourses} courses</p>
                  <p>{plan.maxSectionsPerCourse} sections per course</p>
                  <p>{plan.maxLessonsPerSection} lessons per section</p>
                  <p>{plan.maxStudentsTotal} total students</p>
                  <p>{plan.canCreatePaidCourses ? "Paid + free courses" : "Free courses only"}</p>
                  <p>{plan.canUseAnalytics ? "Analytics included" : "Basic teaching tools only"}</p>
                </div>
              </button>
            );
          })
        ) : plansQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
          ))
        ) : (
          <div className="lg:col-span-4">
            <EmptyState title="No plans available" description="Ask the administrator to activate instructor plans first." />
          </div>
        )}
      </div>

      <ContentCard className="mt-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Trial rules</p>
            <p className="mt-2 text-sm text-slate-600">
              Every selected plan starts as a 7-day trial. During the trial, you can create two free courses only, with one section and one lesson each, and up to ten students total.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700">
              Back to dashboard
            </Link>
            <button
              type="button"
              disabled={!selectedPlan || selectPlanMutation.isPending || Boolean(summaryQuery.data?.currentSubscription)}
              onClick={() => selectedPlan && selectPlanMutation.mutate(selectedPlan.id)}
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectPlanMutation.isPending ? "Starting trial..." : "Choose plan and start trial"}
            </button>
          </div>
        </div>
      </ContentCard>
    </PageShell>
  );
}
