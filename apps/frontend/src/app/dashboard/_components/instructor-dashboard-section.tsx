"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { ContentCard } from "../../../components/content-card";
import { StatusChip } from "../../../components/status-chip";
import { PaymentProofActions } from "../../../components/payment-proof-actions";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodType,
  placeholderForPaymentType
} from "../../../lib/payments/payment-methods";
import type {
  DashboardInterviewSession,
  InstructorCourseOption,
  InstructorDashboardProfile,
  InstructorPayment,
  PaymentMethod
} from "./dashboard-types";

interface InstructorDashboardSectionProps {
  accessToken: string;
  inviteCode?: string;
  methodType: PaymentMethodType;
  methodLabel: string;
  methodDetails: string;
  methodValidationError: string | null;
  deleteMethodError: string | null;
  instructorProfile?: InstructorDashboardProfile | null;
  instructorCourses?: InstructorCourseOption[];
  interviewSessions?: DashboardInterviewSession[];
  interviewCourseId: string;
  interviewTitle: string;
  interviewDescription: string;
  interviewProvider: "ZOOM" | "GOOGLE_MEET";
  interviewMeetingUrl: string;
  interviewScheduledAt: string;
  interviewDurationMinutes: string;
  interviewError: string | null;
  paymentMethods?: PaymentMethod[];
  instructorPayments?: InstructorPayment[];
  isCreatingMethod: boolean;
  isDeletingMethod: boolean;
  isCreatingInterview: boolean;
  isUpdatingInterview: boolean;
  isDeletingInterview: boolean;
  onCopyInviteCode: () => Promise<void>;
  onCreateMethod: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteMethod: (methodId: string) => Promise<void>;
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onMethodTypeChange: (value: PaymentMethodType) => void;
  onMethodLabelChange: (value: string) => void;
  onMethodDetailsChange: (value: string) => void;
  onInterviewCourseChange: (value: string) => void;
  onInterviewTitleChange: (value: string) => void;
  onInterviewDescriptionChange: (value: string) => void;
  onInterviewProviderChange: (value: "ZOOM" | "GOOGLE_MEET") => void;
  onInterviewMeetingUrlChange: (value: string) => void;
  onInterviewScheduledAtChange: (value: string) => void;
  onInterviewDurationMinutesChange: (value: string) => void;
  onCreateInterview: () => void;
  onScheduleInterview: (interviewId: string) => void;
  onCompleteInterview: (interviewId: string) => void;
  onDeleteInterview: (interviewId: string) => void;
  onUpdateInterview: (interviewId: string, payload: Record<string, unknown>) => void;
}

function formatInterviewCountdown(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes <= -5) {
    return "Live now";
  }
  if (diffMinutes <= 15) {
    return "Join now";
  }
  if (diffMinutes < 60) {
    return `In ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `In ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `In ${diffDays}d`;
}

function interviewCountdownTone(session: DashboardInterviewSession) {
  if (session.isJoinReady) {
    return "success" as const;
  }

  const diffMinutes = Math.round(
    (new Date(session.scheduledAt).getTime() - Date.now()) / (1000 * 60)
  );

  if (diffMinutes <= 60) {
    return "warning" as const;
  }

  return "default" as const;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = rating >= index + 0.5;

        return (
          <span
            key={index}
            className={`text-sm leading-none ${filled ? "text-amber-400" : "text-white/25"}`}
          >
            {"\u2605"}
          </span>
        );
      })}
    </span>
  );
}

function MobileAccordionCard({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ContentCard className="p-0 sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold text-slate-950">{title}</span>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5" />
          </svg>
        </span>
      </button>
      {open ? <div className="px-6 pb-6">{children}</div> : null}
    </ContentCard>
  );
}

export function InstructorDashboardSection({
  accessToken,
  inviteCode,
  methodType,
  methodLabel,
  methodDetails,
  methodValidationError,
  deleteMethodError,
  instructorProfile,
  instructorCourses,
  interviewSessions,
  interviewCourseId,
  interviewTitle,
  interviewDescription,
  interviewProvider,
  interviewMeetingUrl,
  interviewScheduledAt,
  interviewDurationMinutes,
  interviewError,
  paymentMethods,
  instructorPayments,
  isCreatingMethod,
  isDeletingMethod,
  isCreatingInterview,
  isUpdatingInterview,
  isDeletingInterview,
  onCopyInviteCode,
  onCreateMethod,
  onDeleteMethod,
  onApprovePayment,
  onRejectPayment,
  onMethodTypeChange,
  onMethodLabelChange,
  onMethodDetailsChange,
  onInterviewCourseChange,
  onInterviewTitleChange,
  onInterviewDescriptionChange,
  onInterviewProviderChange,
  onInterviewMeetingUrlChange,
  onInterviewScheduledAtChange,
  onInterviewDurationMinutesChange,
  onCreateInterview,
  onScheduleInterview,
  onCompleteInterview,
  onDeleteInterview,
  onUpdateInterview
}: InstructorDashboardSectionProps) {
  const pendingPayments = instructorPayments?.filter((payment) => payment.status === "PENDING") ?? [];
  const approvedRevenue = instructorPayments
    ?.filter((payment) => payment.status === "APPROVED")
    .reduce((sum, payment) => sum + payment.amount, 0) ?? 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ContentCard className="overflow-hidden p-0">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_30%),linear-gradient(145deg,#0f172a_0%,#155e75_58%,#14b8a6_100%)] p-6 text-white sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Creator studio</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Teach, review, and grow from one place.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78">
                  Create courses, review learners, approve payments, and keep your academy moving without jumping between crowded screens.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/instructor/courses" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                  Open builder
                </Link>
                <Link href="/courses" className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white">
                  View catalog
                </Link>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Pending payments</p>
                <p className="mt-2 text-2xl font-semibold">{pendingPayments.length}</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Approved revenue</p>
                <p className="mt-2 text-2xl font-semibold">${approvedRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Payment methods</p>
                <p className="mt-2 text-2xl font-semibold">{paymentMethods?.length ?? 0}</p>
              </div>
              <div className="col-span-3 rounded-[24px] border border-white/12 bg-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">Reviews</p>
                    {instructorProfile?.stats.averageRating !== null &&
                    instructorProfile?.stats.averageRating !== undefined ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RatingStars rating={instructorProfile.stats.averageRating} />
                        <p className="text-2xl font-semibold">
                          {instructorProfile.stats.averageRating.toFixed(1)}
                        </p>
                        <span className="text-sm text-white/70">/ 5</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-2xl font-semibold">No ratings yet</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-white/70">
                    <p>{instructorProfile?.stats.reviewsCount ?? 0} total review{(instructorProfile?.stats.reviewsCount ?? 0) === 1 ? "" : "s"}</p>
                    <p>{instructorProfile?.stats.publicCoursesCount ?? 0} published course{(instructorProfile?.stats.publicCoursesCount ?? 0) === 1 ? "" : "s"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="hidden p-6 sm:block">
          <p className="section-kicker">Workspace access</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Invite learners clearly</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Share a single invite code so students can join your workspace and discover your courses.
          </p>
          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Invite code</p>
            <code className="mt-3 block overflow-x-auto rounded-2xl bg-white px-4 py-3 text-base font-semibold text-slate-900">
              {inviteCode ?? "Loading..."}
            </code>
            <button
              type="button"
              onClick={() => void onCopyInviteCode()}
              className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Copy invite code
            </button>
          </div>
        </ContentCard>
        <MobileAccordionCard title="Invite learners clearly">
          <p className="text-sm leading-7 text-slate-600">
            Share a single invite code so students can join your workspace and discover your courses.
          </p>
          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Invite code</p>
            <div className="mt-3 flex items-center gap-3">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-2xl bg-white px-4 py-3 text-base font-semibold text-slate-900">
                {inviteCode ?? "Loading..."}
              </code>
              <button
                type="button"
                onClick={() => void onCopyInviteCode()}
                className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Copy invite code
              </button>
            </div>
          </div>
        </MobileAccordionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ContentCard className="hidden p-6 sm:block">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Payments</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Receiving methods</h3>
            </div>
            <StatusChip tone="info">Manual payments</StatusChip>
          </div>
          <form onSubmit={(event) => void onCreateMethod(event)} className="mt-5 space-y-4">
            <label className="block">
              <span className="field-label">Method type</span>
              <select
                className="field-select"
                value={methodType}
                onChange={(event) => onMethodTypeChange(event.target.value as PaymentMethodType)}
              >
                {PAYMENT_METHOD_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Label</span>
              <input
                className="field-input"
                placeholder="Vodafone Cash, Instapay, Bank transfer"
                value={methodLabel}
                onChange={(event) => onMethodLabelChange(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="field-label">Account details</span>
              <textarea
                className="field-textarea"
                placeholder={placeholderForPaymentType(methodType)}
                value={methodDetails}
                onChange={(event) => onMethodDetailsChange(event.target.value)}
              />
              <p className="field-help">Make the details easy for students to copy without confusion.</p>
            </label>
            {methodValidationError ? <p className="text-sm text-rose-600">{methodValidationError}</p> : null}
            <button
              type="submit"
              disabled={isCreatingMethod}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isCreatingMethod ? "Saving..." : "Add payment method"}
            </button>
          </form>

          {deleteMethodError ? <p className="mt-4 text-sm text-rose-600">{deleteMethodError}</p> : null}

          <div className="mt-6 space-y-3">
            {paymentMethods?.length ? (
              paymentMethods.map((method) => (
                <div key={method.id} className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{method.label}</p>
                        <StatusChip tone={method.isActive ? "success" : "default"}>
                          {method.isActive ? "Active" : "Inactive"}
                        </StatusChip>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {method.type} • {method.category}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{method.details || "No details provided."}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDeleteMethod(method.id)}
                      disabled={isDeletingMethod}
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-5 text-sm leading-7 text-slate-600">
                Add at least one payment method so students can submit proof for paid courses.
              </div>
            )}
          </div>
        </ContentCard>
        <MobileAccordionCard title="Payments">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Payments</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Receiving methods</h3>
            </div>
            <StatusChip tone="info">Manual payments</StatusChip>
          </div>
          <form onSubmit={(event) => void onCreateMethod(event)} className="mt-5 space-y-4">
            <label className="block">
              <span className="field-label">Method type</span>
              <select
                className="field-select"
                value={methodType}
                onChange={(event) => onMethodTypeChange(event.target.value as PaymentMethodType)}
              >
                {PAYMENT_METHOD_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Label</span>
              <input
                className="field-input"
                placeholder="Vodafone Cash, Instapay, Bank transfer"
                value={methodLabel}
                onChange={(event) => onMethodLabelChange(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="field-label">Account details</span>
              <textarea
                className="field-textarea"
                placeholder={placeholderForPaymentType(methodType)}
                value={methodDetails}
                onChange={(event) => onMethodDetailsChange(event.target.value)}
              />
              <p className="field-help">Make the details easy for students to copy without confusion.</p>
            </label>
            {methodValidationError ? <p className="text-sm text-rose-600">{methodValidationError}</p> : null}
            <button
              type="submit"
              disabled={isCreatingMethod}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isCreatingMethod ? "Saving..." : "Add payment method"}
            </button>
          </form>

          {deleteMethodError ? <p className="mt-4 text-sm text-rose-600">{deleteMethodError}</p> : null}

          <div className="mt-6 space-y-3">
            {paymentMethods?.length ? (
              paymentMethods.map((method) => (
                <div key={method.id} className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{method.label}</p>
                        <StatusChip tone={method.isActive ? "success" : "default"}>
                          {method.isActive ? "Active" : "Inactive"}
                        </StatusChip>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {method.type} • {method.category}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{method.details || "No details provided."}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDeleteMethod(method.id)}
                      disabled={isDeletingMethod}
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-5 text-sm leading-7 text-slate-600">
                Add at least one payment method so students can submit proof for paid courses.
              </div>
            )}
          </div>
        </MobileAccordionCard>

        <ContentCard className="hidden p-6 sm:block">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Pending actions</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Payment reviews</h3>
            </div>
            <StatusChip tone={pendingPayments.length ? "warning" : "success"}>
              {pendingPayments.length ? `${pendingPayments.length} pending` : "Up to date"}
            </StatusChip>
          </div>
          <div className="mt-5 space-y-4">
            {instructorPayments?.length ? (
              instructorPayments.map((payment) => (
                <div key={payment.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{payment.course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {payment.user.fullName} • {payment.user.email}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {payment.method.label} • {payment.method.type} • ${payment.amount.toFixed(2)}
                      </p>
                    </div>
                    <StatusChip
                      tone={
                        payment.status === "APPROVED"
                          ? "success"
                          : payment.status === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {payment.status}
                    </StatusChip>
                  </div>
                  <div className="mt-4">
                    <PaymentProofActions
                      paymentId={payment.id}
                      accessToken={accessToken}
                      proofContentType={payment.proofContentType}
                      proofFileName={payment.proofFileName}
                    />
                  </div>
                  {payment.status === "PENDING" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onApprovePayment(payment.id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Approve payment
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectPayment(payment.id)}
                        className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Reject payment
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-5 text-sm text-slate-600">
                No payment submissions yet. When students submit payment proof, the review queue will appear here.
              </div>
            )}
          </div>
        </ContentCard>
        <MobileAccordionCard title="Pending actions">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Pending actions</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Payment reviews</h3>
            </div>
            <StatusChip tone={pendingPayments.length ? "warning" : "success"}>
              {pendingPayments.length ? `${pendingPayments.length} pending` : "Up to date"}
            </StatusChip>
          </div>
          <div className="mt-5 space-y-4">
            {instructorPayments?.length ? (
              instructorPayments.map((payment) => (
                <div key={payment.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{payment.course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {payment.user.fullName} • {payment.user.email}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {payment.method.label} • {payment.method.type} • ${payment.amount.toFixed(2)}
                      </p>
                    </div>
                    <StatusChip
                      tone={
                        payment.status === "APPROVED"
                          ? "success"
                          : payment.status === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {payment.status}
                    </StatusChip>
                  </div>
                  <div className="mt-4">
                    <PaymentProofActions
                      paymentId={payment.id}
                      accessToken={accessToken}
                      proofContentType={payment.proofContentType}
                      proofFileName={payment.proofFileName}
                    />
                  </div>
                  {payment.status === "PENDING" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onApprovePayment(payment.id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Approve payment
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectPayment(payment.id)}
                        className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Reject payment
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-5 text-sm text-slate-600">
                No payment submissions yet. When students submit payment proof, the review queue will appear here.
              </div>
            )}
          </div>
        </MobileAccordionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ContentCard className="hidden p-6 sm:block">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Interviews</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Schedule course interviews</h3>
            </div>
            <StatusChip tone="info">Dashboard only</StatusChip>
          </div>
          <div className="mt-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
            Pick any of your courses here. Scheduled interviews appear in the course for both you and enrolled learners, then disappear automatically once they end.
          </div>
          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className="field-label">Course</span>
              <select className="field-select" value={interviewCourseId} onChange={(event) => onInterviewCourseChange(event.target.value)}>
                <option value="">Choose a course</option>
                {(instructorCourses ?? []).map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Interview title</span>
              <input className="field-input" placeholder="Interview title" value={interviewTitle} onChange={(event) => onInterviewTitleChange(event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">Agenda or note</span>
              <textarea className="field-textarea" placeholder="Agenda or note" value={interviewDescription} onChange={(event) => onInterviewDescriptionChange(event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">Meeting provider</span>
              <select className="field-select" value={interviewProvider} onChange={(event) => onInterviewProviderChange(event.target.value as "ZOOM" | "GOOGLE_MEET")}>
                <option value="ZOOM">Zoom</option>
                <option value="GOOGLE_MEET">Google Meet</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Meeting link</span>
              <input className="field-input" placeholder="https://..." value={interviewMeetingUrl} onChange={(event) => onInterviewMeetingUrlChange(event.target.value)} />
              <p className="field-help">Paste the full Zoom or Google Meet link, including `https://`.</p>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="field-label">Date and time</span>
                <input type="datetime-local" className="field-input" value={interviewScheduledAt} onChange={(event) => onInterviewScheduledAtChange(event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Duration in minutes</span>
                <input type="number" min={1} className="field-input" value={interviewDurationMinutes} onChange={(event) => onInterviewDurationMinutesChange(event.target.value)} placeholder="Optional, default is 60" />
                <p className="field-help">Leave this empty if you want the session to use the default 60-minute length.</p>
              </label>
            </div>
            {interviewError ? <p className="text-sm text-rose-600">{interviewError}</p> : null}
            <button
              type="button"
              onClick={onCreateInterview}
              disabled={isCreatingInterview}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isCreatingInterview ? "Creating..." : "Create interview draft"}
            </button>
          </div>
        </ContentCard>
        <MobileAccordionCard title="Interviews">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Interviews</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Schedule course interviews</h3>
            </div>
            <StatusChip tone="info">Dashboard only</StatusChip>
          </div>
          <div className="mt-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
            Pick any of your courses here. Scheduled interviews appear in the course for both you and enrolled learners, then disappear automatically once they end.
          </div>
          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className="field-label">Course</span>
              <select className="field-select" value={interviewCourseId} onChange={(event) => onInterviewCourseChange(event.target.value)}>
                <option value="">Choose a course</option>
                {(instructorCourses ?? []).map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Interview title</span>
              <input className="field-input" placeholder="Interview title" value={interviewTitle} onChange={(event) => onInterviewTitleChange(event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">Agenda or note</span>
              <textarea className="field-textarea" placeholder="Agenda or note" value={interviewDescription} onChange={(event) => onInterviewDescriptionChange(event.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">Meeting provider</span>
              <select className="field-select" value={interviewProvider} onChange={(event) => onInterviewProviderChange(event.target.value as "ZOOM" | "GOOGLE_MEET")}>
                <option value="ZOOM">Zoom</option>
                <option value="GOOGLE_MEET">Google Meet</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Meeting link</span>
              <input className="field-input" placeholder="https://..." value={interviewMeetingUrl} onChange={(event) => onInterviewMeetingUrlChange(event.target.value)} />
              <p className="field-help">Paste the full Zoom or Google Meet link, including `https://`.</p>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="field-label">Date and time</span>
                <input type="datetime-local" className="field-input" value={interviewScheduledAt} onChange={(event) => onInterviewScheduledAtChange(event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Duration in minutes</span>
                <input type="number" min={1} className="field-input" value={interviewDurationMinutes} onChange={(event) => onInterviewDurationMinutesChange(event.target.value)} placeholder="Optional, default is 60" />
                <p className="field-help">Leave this empty if you want the session to use the default 60-minute length.</p>
              </label>
            </div>
            {interviewError ? <p className="text-sm text-rose-600">{interviewError}</p> : null}
            <button
              type="button"
              onClick={onCreateInterview}
              disabled={isCreatingInterview}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isCreatingInterview ? "Creating..." : "Create interview draft"}
            </button>
          </div>
        </MobileAccordionCard>

        <ContentCard className="hidden p-6 sm:block">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Upcoming sessions</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Active interview queue</h3>
            </div>
            <StatusChip tone={(interviewSessions?.length ?? 0) > 0 ? "warning" : "success"}>
              {(interviewSessions?.length ?? 0) > 0 ? `${interviewSessions?.length ?? 0} live items` : "No active interviews"}
            </StatusChip>
          </div>
          <div className="mt-5 space-y-4">
            {(interviewSessions?.length ?? 0) > 0 ? (
              interviewSessions?.map((session) => (
                <div key={session.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{session.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{session.course.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {session.provider === "ZOOM" ? "Zoom" : "Google Meet"} • {new Date(session.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip tone={session.isJoinReady ? "success" : session.status === "DRAFT" ? "warning" : "info"}>
                        {session.isJoinReady ? "Join now" : session.status}
                      </StatusChip>
                      <StatusChip tone={interviewCountdownTone(session)}>
                        {formatInterviewCountdown(session.scheduledAt)}
                      </StatusChip>
                    </div>
                  </div>
                  {session.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{session.description}</p> : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      className="field-input"
                      defaultValue={session.title}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextTitle = event.target.value.trim();
                        if (nextTitle && nextTitle !== session.title) {
                          onUpdateInterview(session.id, { title: nextTitle });
                        }
                      }}
                    />
                    <select
                      className="field-select"
                      defaultValue={session.provider}
                      disabled={!session.canEdit}
                      onChange={(event) => {
                        const nextProvider = event.target.value as "ZOOM" | "GOOGLE_MEET";
                        if (nextProvider !== session.provider) {
                          onUpdateInterview(session.id, { provider: nextProvider });
                        }
                      }}
                    >
                      <option value="ZOOM">Zoom</option>
                      <option value="GOOGLE_MEET">Google Meet</option>
                    </select>
                    <input
                      type="datetime-local"
                      className="field-input"
                      defaultValue={session.scheduledAt.slice(0, 16)}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue && nextValue !== session.scheduledAt.slice(0, 16)) {
                          onUpdateInterview(session.id, { scheduledAt: nextValue });
                        }
                      }}
                    />
                    <input
                      className="field-input"
                      defaultValue={session.meetingUrl}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextUrl = event.target.value.trim();
                        if (nextUrl && nextUrl !== session.meetingUrl) {
                          onUpdateInterview(session.id, { meetingUrl: nextUrl });
                        }
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      className="field-input"
                      defaultValue={String(session.durationMinutes ?? 60)}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextDuration = Number(event.target.value);
                        if (
                          Number.isFinite(nextDuration) &&
                          nextDuration > 0 &&
                          nextDuration !== (session.durationMinutes ?? 60)
                        ) {
                          onUpdateInterview(session.id, { durationMinutes: nextDuration });
                        }
                      }}
                    />
                  </div>
                  <textarea
                    className="mt-3 field-textarea"
                    defaultValue={session.description ?? ""}
                    disabled={!session.canEdit}
                    onBlur={(event) => {
                      const nextDescription = event.target.value.trim();
                      if (nextDescription !== (session.description ?? "")) {
                        onUpdateInterview(session.id, { description: nextDescription || null });
                      }
                    }}
                  />
                  {!session.canEdit ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Editing closes 30 minutes before the interview. You can still delete it if plans change.
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {session.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview(session.id)}
                        disabled={isUpdatingInterview}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Schedule
                      </button>
                    ) : null}
                    {session.isJoinReady ? (
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-200"
                      >
                        Join now
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onCompleteInterview(session.id)}
                      disabled={isUpdatingInterview}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Mark ended
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInterview(session.id)}
                      disabled={isDeletingInterview}
                      className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-5 text-sm text-slate-600">
                No active interviews right now. Draft or schedule one from the dashboard form.
              </div>
            )}
          </div>
        </ContentCard>
        <MobileAccordionCard title="Upcoming sessions">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Upcoming sessions</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Active interview queue</h3>
            </div>
            <StatusChip tone={(interviewSessions?.length ?? 0) > 0 ? "warning" : "success"}>
              {(interviewSessions?.length ?? 0) > 0 ? `${interviewSessions?.length ?? 0} live items` : "No active interviews"}
            </StatusChip>
          </div>
          <div className="mt-5 space-y-4">
            {(interviewSessions?.length ?? 0) > 0 ? (
              interviewSessions?.map((session) => (
                <div key={session.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{session.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{session.course.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {session.provider === "ZOOM" ? "Zoom" : "Google Meet"} • {new Date(session.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip tone={session.isJoinReady ? "success" : session.status === "DRAFT" ? "warning" : "info"}>
                        {session.isJoinReady ? "Join now" : session.status}
                      </StatusChip>
                      <StatusChip tone={interviewCountdownTone(session)}>
                        {formatInterviewCountdown(session.scheduledAt)}
                      </StatusChip>
                    </div>
                  </div>
                  {session.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{session.description}</p> : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      className="field-input"
                      defaultValue={session.title}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextTitle = event.target.value.trim();
                        if (nextTitle && nextTitle !== session.title) {
                          onUpdateInterview(session.id, { title: nextTitle });
                        }
                      }}
                    />
                    <select
                      className="field-select"
                      defaultValue={session.provider}
                      disabled={!session.canEdit}
                      onChange={(event) => {
                        const nextProvider = event.target.value as "ZOOM" | "GOOGLE_MEET";
                        if (nextProvider !== session.provider) {
                          onUpdateInterview(session.id, { provider: nextProvider });
                        }
                      }}
                    >
                      <option value="ZOOM">Zoom</option>
                      <option value="GOOGLE_MEET">Google Meet</option>
                    </select>
                    <input
                      type="datetime-local"
                      className="field-input"
                      defaultValue={session.scheduledAt.slice(0, 16)}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue && nextValue !== session.scheduledAt.slice(0, 16)) {
                          onUpdateInterview(session.id, { scheduledAt: nextValue });
                        }
                      }}
                    />
                    <input
                      className="field-input"
                      defaultValue={session.meetingUrl}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextUrl = event.target.value.trim();
                        if (nextUrl && nextUrl !== session.meetingUrl) {
                          onUpdateInterview(session.id, { meetingUrl: nextUrl });
                        }
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      className="field-input"
                      defaultValue={String(session.durationMinutes ?? 60)}
                      disabled={!session.canEdit}
                      onBlur={(event) => {
                        const nextDuration = Number(event.target.value);
                        if (
                          Number.isFinite(nextDuration) &&
                          nextDuration > 0 &&
                          nextDuration !== (session.durationMinutes ?? 60)
                        ) {
                          onUpdateInterview(session.id, { durationMinutes: nextDuration });
                        }
                      }}
                    />
                  </div>
                  <textarea
                    className="mt-3 field-textarea"
                    defaultValue={session.description ?? ""}
                    disabled={!session.canEdit}
                    onBlur={(event) => {
                      const nextDescription = event.target.value.trim();
                      if (nextDescription !== (session.description ?? "")) {
                        onUpdateInterview(session.id, { description: nextDescription || null });
                      }
                    }}
                  />
                  {!session.canEdit ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Editing closes 30 minutes before the interview. You can still delete it if plans change.
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {session.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => onScheduleInterview(session.id)}
                        disabled={isUpdatingInterview}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Schedule
                      </button>
                    ) : null}
                    {session.isJoinReady ? (
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-200"
                      >
                        Join now
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onCompleteInterview(session.id)}
                      disabled={isUpdatingInterview}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Mark ended
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInterview(session.id)}
                      disabled={isDeletingInterview}
                      className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-5 text-sm text-slate-600">
                No active interviews right now. Draft or schedule one from the dashboard form.
              </div>
            )}
          </div>
        </MobileAccordionCard>
      </section>
    </div>
  );
}


