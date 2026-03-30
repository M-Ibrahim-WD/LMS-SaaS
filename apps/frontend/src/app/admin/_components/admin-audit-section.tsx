"use client";

import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import type { AuditCategory, AuditLog } from "./admin-control-center.shared";
import { auditCategoryOptions } from "./admin-control-center.shared";

interface AdminAuditSectionProps {
  auditCategory: AuditCategory;
  setAuditCategory: (value: AuditCategory) => void;
  auditLogs?: AuditLog[];
  isLoading: boolean;
}

export function AdminAuditSection({
  auditCategory,
  setAuditCategory,
  auditLogs,
  isLoading
}: AdminAuditSectionProps) {
  return (
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
        {auditLogs?.length ? (
          auditLogs.map((entry) => (
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
        ) : isLoading ? (
          <StatusBanner>Loading audit logs...</StatusBanner>
        ) : (
          <EmptyState title="No audit entries yet" description="Delegated-admin and sensitive platform actions will appear here." />
        )}
      </div>
    </ContentCard>
  );
}
