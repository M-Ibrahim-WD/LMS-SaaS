"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AdminPermission } from "../../../lib/auth/token";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import type { ManagedAdmin } from "./admin-control-center.shared";
import {
  adminPermissionLabels,
  adminPermissionOrder,
  adminPermissionPresets
} from "./admin-control-center.shared";

interface AdminAdminsSectionProps {
  adminForm: {
    fullName: string;
    email: string;
    password: string;
    permissions: AdminPermission[];
  };
  setAdminForm: Dispatch<
    SetStateAction<{
      fullName: string;
      email: string;
      password: string;
      permissions: AdminPermission[];
    }>
  >;
  selectedAdminPreset: string;
  setSelectedAdminPreset: (value: string) => void;
  cloneAdminId: string;
  setCloneAdminId: (value: string) => void;
  adminUsers?: ManagedAdmin[];
  adminsLoading: boolean;
  adminSearch: string;
  setAdminSearch: (value: string) => void;
  adminPasswordDrafts: Record<string, string>;
  setAdminPasswordDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  resetPending: boolean;
  onCreateAdmin: () => void;
  onToggleAdminStatus: (input: { id: string; isActive: boolean }) => void;
  onUpdateAdminPermissions: (input: { id: string; permissions: AdminPermission[] }) => void;
  onResetAdminPassword: (input: { id: string; password: string }) => void;
}

export function AdminAdminsSection({
  adminForm,
  setAdminForm,
  selectedAdminPreset,
  setSelectedAdminPreset,
  cloneAdminId,
  setCloneAdminId,
  adminUsers,
  adminsLoading,
  adminSearch,
  setAdminSearch,
  adminPasswordDrafts,
  setAdminPasswordDrafts,
  resetPending,
  onCreateAdmin,
  onToggleAdminStatus,
  onUpdateAdminPermissions,
  onResetAdminPassword
}: AdminAdminsSectionProps) {
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Admin account controls</h2>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateAdmin();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">Admin name</span>
              <input
                value={adminForm.fullName}
                onChange={(event) => setAdminForm((current) => ({ ...current, fullName: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">Admin email</span>
              <input
                type="email"
                value={adminForm.email}
                onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Temporary password</span>
            <input
              type="password"
              value={adminForm.password}
              onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              required
            />
            <span className="mt-2 block text-xs text-slate-500">
              This admin will be required to change this password on first login.
            </span>
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
                  : ""}
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
                  const sourceAdmin = adminUsers?.find((entry) => entry.id === nextAdminId);
                  if (sourceAdmin) {
                    setAdminForm((current) => ({ ...current, permissions: sourceAdmin.adminPermissions }));
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="">Choose an existing delegated admin</option>
                {adminUsers?.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.fullName} ({admin.email})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Admin permissions</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {adminPermissionOrder.map((permission) => (
                <label
                  key={permission}
                  className={`rounded-2xl border p-4 ${
                    adminForm.permissions.includes(permission) ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
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
          </div>
          <input
            value={adminSearch}
            onChange={(event) => setAdminSearch(event.target.value)}
            placeholder="Search admins"
            className="w-full max-w-56 rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
        </div>
        <div className="mt-4 space-y-4">
          {adminUsers?.length ? (
            adminUsers.map((admin) => (
              <div key={admin.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{admin.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{admin.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          admin.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                      {admin.mustChangePassword ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          Must change password
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleAdminStatus({ id: admin.id, isActive: !admin.isActive })}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    {admin.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {adminPermissionOrder.map((permission) => (
                    <label
                      key={`${admin.id}-${permission}`}
                      className={`rounded-2xl border p-3 ${
                        admin.adminPermissions.includes(permission) ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={admin.adminPermissions.includes(permission)}
                          onChange={(event) => {
                            const nextPermissions = event.target.checked
                              ? [...admin.adminPermissions, permission]
                              : admin.adminPermissions.filter((entry) => entry !== permission);
                            onUpdateAdminPermissions({ id: admin.id, permissions: nextPermissions });
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
                      disabled={!(adminPasswordDrafts[admin.id] ?? "").trim() || resetPending}
                      onClick={() =>
                        onResetAdminPassword({
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
            ))
          ) : adminsLoading ? (
            <StatusBanner>Loading admin accounts...</StatusBanner>
          ) : (
            <EmptyState title="No managed admins" description="Create limited admin accounts here when you want to delegate platform work safely." />
          )}
        </div>
      </ContentCard>
    </div>
  );
}
