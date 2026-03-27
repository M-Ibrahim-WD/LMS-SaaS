"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodType,
  placeholderForPaymentType
} from "../../../lib/payments/payment-methods";
import { PaymentProofActions } from "../../../components/payment-proof-actions";
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
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="mb-3 flex gap-2">
          <Link href="/instructor/courses" className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
            Create & Manage Courses
          </Link>
          <Link href="/courses" className="rounded border border-slate-300 px-3 py-2 text-sm">
            View Courses
          </Link>
        </div>
        <p className="text-sm font-medium text-slate-600">Your Invite Code</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <code className="rounded bg-slate-100 px-3 py-2 text-sm">{inviteCode ?? "Loading..."}</code>
          <button type="button" onClick={() => void onCopyInviteCode()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Copy
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-700">Payment Methods</p>
        <form onSubmit={(event) => void onCreateMethod(event)} className="mt-3 space-y-3">
          <select
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={methodType}
            onChange={(event) => onMethodTypeChange(event.target.value as PaymentMethodType)}
          >
            {PAYMENT_METHOD_OPTIONS.map((item: { value: PaymentMethodType; label: string }) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Label (e.g. Vodafone Wallet)"
            value={methodLabel}
            onChange={(event) => onMethodLabelChange(event.target.value)}
            required
          />
          <textarea
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder={placeholderForPaymentType(methodType)}
            value={methodDetails}
            onChange={(event) => onMethodDetailsChange(event.target.value)}
          />
          {methodValidationError ? <p className="text-xs text-red-600">{methodValidationError}</p> : null}
          <button type="submit" disabled={isCreatingMethod} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60">
            {isCreatingMethod ? "Saving..." : "Add Method"}
          </button>
        </form>

        {deleteMethodError ? <p className="mt-3 text-xs text-red-600">{deleteMethodError}</p> : null}

        <div className="mt-4 space-y-2">
          {paymentMethods?.length ? (
            paymentMethods.map((method) => (
              <div key={method.id} className="flex items-start justify-between gap-3 rounded border border-slate-200 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{method.label}</p>
                  <p className="text-slate-600">{method.type} - {method.category}</p>
                  <p className="mt-1 text-slate-700">{method.details || "No details"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteMethod(method.id)}
                  disabled={isDeletingMethod}
                  className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 disabled:opacity-60"
                  aria-label={`Delete ${method.label}`}
                >
                  X
                </button>
              </div>
            ))
          ) : (
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No payment methods yet. Add one to start receiving manual course payments.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-700">Student Payments</p>
        <div className="mt-3 space-y-2">
          {instructorPayments?.length ? (
            instructorPayments.map((payment) => (
              <div key={payment.id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium">{payment.course.title}</p>
                <p className="text-slate-600">{payment.user.fullName} ({payment.user.email})</p>
                <p className="text-slate-600">{payment.method.label} - {payment.method.type}</p>
                <p className="text-slate-700">Amount: {payment.amount.toFixed(2)} - Status: {payment.status}</p>
                <PaymentProofActions
                  paymentId={payment.id}
                  accessToken={accessToken}
                  proofContentType={payment.proofContentType}
                  proofFileName={payment.proofFileName}
                />
                {payment.status === "PENDING" ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => onApprovePayment(payment.id)} className="rounded border border-emerald-300 px-3 py-1 text-xs text-emerald-700">
                      Approve
                    </button>
                    <button type="button" onClick={() => onRejectPayment(payment.id)} className="rounded border border-red-300 px-3 py-1 text-xs text-red-700">
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No payment submissions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
