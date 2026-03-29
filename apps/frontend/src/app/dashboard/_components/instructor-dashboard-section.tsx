"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { ContentCard } from "../../../components/content-card";
import { StatusChip } from "../../../components/status-chip";
import { PaymentProofActions } from "../../../components/payment-proof-actions";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodType,
  placeholderForPaymentType
} from "../../../lib/payments/payment-methods";
import type { InstructorPayment, PaymentMethod } from "./dashboard-types";

interface InstructorDashboardSectionProps {
  accessToken: string;
  inviteCode?: string;
  methodType: PaymentMethodType;
  methodLabel: string;
  methodDetails: string;
  methodValidationError: string | null;
  deleteMethodError: string | null;
  paymentMethods?: PaymentMethod[];
  instructorPayments?: InstructorPayment[];
  isCreatingMethod: boolean;
  isDeletingMethod: boolean;
  onCopyInviteCode: () => Promise<void>;
  onCreateMethod: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteMethod: (methodId: string) => Promise<void>;
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onMethodTypeChange: (value: PaymentMethodType) => void;
  onMethodLabelChange: (value: string) => void;
  onMethodDetailsChange: (value: string) => void;
}

export function InstructorDashboardSection({
  accessToken,
  inviteCode,
  methodType,
  methodLabel,
  methodDetails,
  methodValidationError,
  deleteMethodError,
  paymentMethods,
  instructorPayments,
  isCreatingMethod,
  isDeletingMethod,
  onCopyInviteCode,
  onCreateMethod,
  onDeleteMethod,
  onApprovePayment,
  onRejectPayment,
  onMethodTypeChange,
  onMethodLabelChange,
  onMethodDetailsChange
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
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-6">
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ContentCard className="p-6">
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

        <ContentCard className="p-6">
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
      </section>
    </div>
  );
}
