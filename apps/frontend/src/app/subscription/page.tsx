"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ContentCard } from "../../components/content-card";
import { EmptyState } from "../../components/empty-state";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { StatusChip } from "../../components/status-chip";
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
  hasUsedTrial: boolean;
  canStartTrial: boolean;
  requiresPayment: boolean;
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
  pendingSubscriptionPayment?: {
    id: string;
    planId: string;
    billingPeriod: "MONTHLY" | "YEARLY";
    provider: "MANUAL" | "STRIPE" | "PAYPAL" | "PAYMOB" | "PAYTABS" | "OTHER";
    status: "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "PAID" | "FAILED";
    amount: number;
    proof?: string | null;
    adminNote?: string | null;
    createdAt: string;
    platformPaymentMethod?: PlatformPaymentMethod | null;
  } | null;
};

type PlatformPaymentMethod = {
  id: string;
  type:
    | "INSTAPAY"
    | "VODAFONE_CASH"
    | "ORANGE_CASH"
    | "ETISALAT_CASH"
    | "WE_CASH"
    | "FAWRY"
    | "BANK"
    | "CUSTOM"
    | "PAYMOB"
    | "PAYTABS"
    | "STRIPE"
    | "PAYPAL"
    | "PAYONEER"
    | "OTHER";
  category: "MANUAL" | "ONLINE";
  label: string;
  details: string;
  isActive: boolean;
  isConfigured: boolean;
  isSelectable: boolean;
  provider: "MANUAL" | "STRIPE" | "PAYPAL" | "PAYMOB" | "PAYTABS" | "OTHER";
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
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
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

  const paymentMethodsQuery = useQuery({
    queryKey: ["subscription", "payment-methods"],
    queryFn: () => apiFetch<PlatformPaymentMethod[]>("/subscription/payment-methods", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const selectPlanMutation = useMutation({
    mutationFn: (planId: string) =>
      apiFetch("/subscription/select-plan", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ planId, billingPeriod })
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

  const paymentRequestMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!selectedPaymentMethod) {
        throw new Error("Choose a payment method first.");
      }

      if (selectedPaymentMethod.category === "ONLINE") {
        return apiFetch<{ redirectUrl?: string }>("/subscription/payment-requests/online", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            planId,
            platformPaymentMethodId: selectedPaymentMethod.id,
            billingPeriod
          })
        });
      }

      const formData = new FormData();
      formData.append("planId", planId);
      formData.append("platformPaymentMethodId", selectedPaymentMethod.id);
      formData.append("billingPeriod", billingPeriod);
      if (paymentProof) {
        formData.append("proof", paymentProof);
      }

      return apiFetch("/subscription/payment-requests/manual", {
        method: "POST",
        token: accessToken ?? undefined,
        body: formData
      });
    },
    onSuccess: async (response) => {
      const maybeRedirect = response as { redirectUrl?: string } | undefined;
      if (maybeRedirect?.redirectUrl) {
        window.location.href = maybeRedirect.redirectUrl;
        return;
      }

      setMessage("Payment request submitted. An administrator will review it and activate your plan after approval.");
      setPaymentProof(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] })
      ]);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Failed to submit payment request.");
    }
  });

  const selectedPlan = useMemo(
    () => plansQuery.data?.find((plan) => plan.id === selectedPlanId) ?? null,
    [plansQuery.data, selectedPlanId]
  );
  const selectedPaymentMethod = useMemo(
    () => paymentMethodsQuery.data?.find((method) => method.id === selectedPaymentMethodId) ?? null,
    [paymentMethodsQuery.data, selectedPaymentMethodId]
  );
  const canSubmitPaidPlanChange = Boolean(
    summaryQuery.data &&
      !summaryQuery.data.canStartTrial &&
      !summaryQuery.data.pendingSubscriptionPayment
  );
  const selectedPlanIsCurrent =
    Boolean(selectedPlan && summaryQuery.data?.selectedPlan?.id === selectedPlan.id);

  if (!hasHydrated) {
    return <main className="p-8">Loading session...</main>;
  }

  return (
      <PageShell
      title="Choose Your Instructor Plan"
      description="Choose the plan that fits your teaching workspace. Each workspace receives one 7-day trial only; after that, plan activation requires payment approval."
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
                  ? summaryQuery.data.requiresPayment
                    ? "Your trial has already been used. Select a plan and submit payment proof to reactivate creation."
                    : "Your workspace is frozen for creation until an admin activates a subscription."
                  : summaryQuery.data.currentSubscription?.isTrial
                    ? `Trial active for ${summaryQuery.data.daysRemaining} more day(s). You can still choose a paid package at any time.`
                    : `Subscription active until ${new Date(
                        summaryQuery.data.currentSubscription?.endsAt ?? summaryQuery.data.latestSubscription?.endsAt ?? Date.now()
                      ).toLocaleDateString()}. You can upgrade, downgrade, or renew at any time.`}
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
            {summaryQuery.data.pendingSubscriptionPayment ? (
              <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Payment review pending</p>
                <p className="mt-1">
                  {currency.format(summaryQuery.data.pendingSubscriptionPayment.amount)} for{" "}
                  {summaryQuery.data.pendingSubscriptionPayment.billingPeriod.toLowerCase()} billing was submitted on{" "}
                  {new Date(summaryQuery.data.pendingSubscriptionPayment.createdAt).toLocaleDateString()}.
                </p>
                {summaryQuery.data.pendingSubscriptionPayment.platformPaymentMethod ? (
                  <p className="mt-1 text-xs">
                    Method: {summaryQuery.data.pendingSubscriptionPayment.platformPaymentMethod.label}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </ContentCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-4">
        {plansQuery.data?.length ? (
          plansQuery.data.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = summaryQuery.data?.selectedPlan?.id === plan.id;
            const isFeatured = plan.code === "STUDIO" || plan.code === "GROWTH";

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative rounded-[30px] border p-6 text-left transition ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white shadow-xl"
                    : isFeatured
                      ? "border-sky-200 bg-white shadow-md hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
                      : "border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                }`}
              >
                {isFeatured ? (
                  <span className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : "bg-sky-100 text-sky-800"}`}>
                    Recommended
                  </span>
                ) : null}
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
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              {summaryQuery.data?.canStartTrial ? "Trial rules" : "Plan activation"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {summaryQuery.data?.canStartTrial
                ? "Your workspace can start one 7-day trial. During the trial, you can create two free courses only, with one section and one lesson each, and up to ten students total."
                : summaryQuery.data?.currentSubscription
                  ? "Choose a package and billing period to upgrade, downgrade, or renew. The new package becomes active after payment verification."
                  : "This workspace has already used its free trial. Choose a billing period and submit payment proof so an administrator can activate the selected plan."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip tone={summaryQuery.data?.canStartTrial ? "trial" : "warning"}>
                {summaryQuery.data?.canStartTrial ? "One trial available" : "Trial already used"}
              </StatusChip>
              <StatusChip>2 courses max</StatusChip>
              <StatusChip>1 section / 1 lesson structure</StatusChip>
              <StatusChip tone="warning">Free courses only</StatusChip>
            </div>
            {canSubmitPaidPlanChange ? (
              <div className="mt-5 space-y-5">
                <label className="block max-w-xs">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Billing</span>
                  <select
                    value={billingPeriod}
                    onChange={(event) => setBillingPeriod(event.target.value as "MONTHLY" | "YEARLY")}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </label>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment method</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {paymentMethodsQuery.data?.length ? (
                      paymentMethodsQuery.data.map((method) => {
                        const isSelected = selectedPaymentMethodId === method.id;
                        const isDisabled = !method.isSelectable;

                        return (
                          <button
                            key={method.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedPaymentMethodId(method.id)}
                            className={`rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isSelected
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white hover:border-slate-400"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{method.label}</p>
                                <p className={`mt-1 text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                                  {method.category === "MANUAL" ? "Manual proof payment" : "Automatic gateway"}
                                </p>
                              </div>
                              <StatusChip tone={method.category === "MANUAL" ? "info" : method.isConfigured ? "success" : "warning"}>
                                {method.category === "MANUAL" ? "Manual" : method.isConfigured ? "Connected" : "Not connected"}
                              </StatusChip>
                            </div>
                            {method.details ? (
                              <p className={`mt-3 text-sm leading-6 ${isSelected ? "text-slate-100" : "text-slate-600"}`}>
                                {method.details}
                              </p>
                            ) : null}
                          </button>
                        );
                      })
                    ) : paymentMethodsQuery.isLoading ? (
                      <StatusBanner>Loading payment methods...</StatusBanner>
                    ) : (
                      <EmptyState
                        title="No platform payment methods"
                        description="Ask the administrator to add manual or online payment methods first."
                      />
                    )}
                  </div>
                </div>
                {selectedPaymentMethod?.category === "MANUAL" ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Manual payment proof
                  </span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                    onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
                ) : selectedPaymentMethod?.category === "ONLINE" ? (
                  <StatusBanner>
                    This online method is connected. Submitting will redirect you to the provider checkout page.
                  </StatusBanner>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700">
              Back to dashboard
            </Link>
            {summaryQuery.data?.canStartTrial ? (
              <button
                type="button"
                disabled={!selectedPlan || selectPlanMutation.isPending || Boolean(summaryQuery.data?.currentSubscription)}
                onClick={() => selectedPlan && selectPlanMutation.mutate(selectedPlan.id)}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectPlanMutation.isPending ? "Starting trial..." : "Start trial"}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  !canSubmitPaidPlanChange ||
                  !selectedPlan ||
                  !selectedPaymentMethod ||
                  (selectedPaymentMethod.category === "MANUAL" && !paymentProof) ||
                  paymentRequestMutation.isPending ||
                  Boolean(summaryQuery.data?.pendingSubscriptionPayment)
                }
                onClick={() => selectedPlan && paymentRequestMutation.mutate(selectedPlan.id)}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paymentRequestMutation.isPending
                  ? "Submitting..."
                  : selectedPlanIsCurrent
                    ? "Renew package"
                    : "Submit package change"}
              </button>
            )}
          </div>
        </div>
      </ContentCard>
    </PageShell>
  );
}
