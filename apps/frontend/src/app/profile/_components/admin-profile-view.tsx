"use client";

import { useState, type ReactNode } from "react";
import { ActivityIcon, GridIcon, SettingsIcon } from "../../../components/profile/profile-icons";
import { ProfileHeader } from "../../../components/profile/profile-header";
import { EmptyState } from "../../../components/empty-state";
import { ProfilePanel } from "../../../components/profile/profile-shell";
import { SectionHeader } from "../../../components/profile/profile-support";
import { ProfileTabs } from "../../../components/profile/profile-tabs";
import type { NotificationItem, ProfileSummary } from "./profile-types";

type AdminTab = "overview" | "activity" | "settings";

interface AdminProfileViewProps {
  summary: ProfileSummary;
  isSuperAdmin: boolean;
  adminPermissions?: string[];
  notifications?: NotificationItem[];
  settingsForm: ReactNode;
}

export function AdminProfileView({
  summary,
  isSuperAdmin,
  adminPermissions,
  notifications,
  settingsForm
}: AdminProfileViewProps) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const permissionList = adminPermissions?.filter(Boolean) ?? [];

  return (
    <>
      <ProfileHeader
        name={summary.fullName}
        bio={summary.bio}
        imageUrl={summary.profileImage}
        badge={isSuperAdmin ? "Super Admin Profile" : "Admin Profile"}
        compactStats
        stats={[
          { label: "Role", value: isSuperAdmin ? "Super Admin" : "Admin" },
          { label: "Tenant", value: summary.tenant?.name ?? "Platform" },
          { label: "Permissions", value: String(permissionList.length) }
        ]}
      />

      <ProfileTabs
        activeKey={tab}
        onChange={(key) => setTab(key as AdminTab)}
        items={[
          { key: "overview", label: "Overview", icon: <GridIcon /> },
          { key: "activity", label: "Activity", icon: <ActivityIcon /> },
          { key: "settings", label: "Settings", icon: <SettingsIcon /> }
        ]}
      />

      <div className="mt-6">
        {tab === "overview" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <ProfilePanel>
              <SectionHeader eyebrow="Account" title="Admin access overview" description="" />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">{summary.email}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {new Date(summary.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Workspace</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {summary.tenant?.name ?? "Global administration"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Access level</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {isSuperAdmin ? "Full platform access" : "Tenant admin access"}
                  </p>
                </div>
              </div>
            </ProfilePanel>

            <ProfilePanel>
              <SectionHeader eyebrow="Permissions" title="Granted capabilities" description="" />
              {permissionList.length ? (
                <div className="flex flex-wrap gap-2">
                  {permissionList.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      {permission.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No delegated permissions listed"
                  description={isSuperAdmin ? "This account uses super-admin access instead of delegated permission tags." : "No extra permissions are currently assigned to this admin account."}
                />
              )}
            </ProfilePanel>
          </div>
        ) : null}

        {tab === "activity" ? (
          <ProfilePanel>
            <SectionHeader eyebrow="Activity" title="Recent notifications" description="" />
            {notifications?.length ? (
              <div className="space-y-3">
                {notifications.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.isRead ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {item.isRead ? "Read" : "New"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No admin activity yet"
                description="Notifications about audits, payments, support, and other operational work will appear here."
              />
            )}
          </ProfilePanel>
        ) : null}

        {tab === "settings" ? settingsForm : null}
      </div>
    </>
  );
}
