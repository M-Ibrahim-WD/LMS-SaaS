"use client";

import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import type { AdminPaymentSummary } from "./admin-control-center.shared";
import { money } from "./admin-control-center.shared";

interface AdminPaymentsSectionProps {
  payments?: AdminPaymentSummary[];
  isLoading: boolean;
}

export function AdminPaymentsSection({ payments, isLoading }: AdminPaymentsSectionProps) {
  return (
    <ContentCard className="p-6">
      <div>
        <p className="section-kicker">Payments</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Payment review queue</h3>
      </div>

      <div className="mt-5 space-y-4">
        {payments?.length ? (
          payments.map((payment) => (
            <div key={payment.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-950">{payment.course.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {payment.user.fullName} | {payment.tenant.name}
                  </p>
                </div>
                <StatusChip tone={payment.status === "APPROVED" ? "success" : "warning"}>
                  {payment.status}
                </StatusChip>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {payment.method.label} | {money.format(payment.amount)}
              </p>
            </div>
          ))
        ) : isLoading ? (
          <StatusBanner>Loading payments...</StatusBanner>
        ) : (
          <EmptyState
            title="No payments yet"
            description="Payment review entries will appear here when transactions begin."
          />
        )}
      </div>
    </ContentCard>
  );
}
