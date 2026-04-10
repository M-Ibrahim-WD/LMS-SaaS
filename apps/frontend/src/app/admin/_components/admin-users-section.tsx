"use client";

import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import type { AdminUser, AdminUserDetail } from "./admin-control-center.shared";

interface AdminUsersSectionProps {
  userSearch: string;
  setUserSearch: (value: string) => void;
  userRole: "ALL" | "ADMIN" | "INSTRUCTOR" | "STUDENT";
  setUserRole: (value: "ALL" | "ADMIN" | "INSTRUCTOR" | "STUDENT") => void;
  userStatus: "ALL" | "true" | "false";
  setUserStatus: (value: "ALL" | "true" | "false") => void;
  users?: AdminUser[];
  usersLoading: boolean;
  selectedUserId: string | null;
  setSelectedUserId: (value: string) => void;
  userDetail?: AdminUserDetail;
  userDetailLoading: boolean;
  onToggleUserStatus: (input: { id: string; isActive: boolean }) => void;
}

export function AdminUsersSection({
  userSearch,
  setUserSearch,
  userRole,
  setUserRole,
  userStatus,
  setUserStatus,
  users,
  usersLoading,
  selectedUserId,
  setSelectedUserId,
  userDetail,
  userDetailLoading,
  onToggleUserStatus
}: AdminUsersSectionProps) {
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Users</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search name or email"
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <select
            value={userRole}
            onChange={(event) => setUserRole(event.target.value as typeof userRole)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="ALL">All roles</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="STUDENT">Student</option>
          </select>
          <select
            value={userStatus}
            onChange={(event) => setUserStatus(event.target.value as typeof userStatus)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {users?.length ? (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedUserId === user.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{user.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {user.role} | {user.tenant?.name ?? "No tenant"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </button>
            ))
          ) : usersLoading ? (
            <StatusBanner>Loading users...</StatusBanner>
          ) : (
            <EmptyState title="No users found" description="Adjust the filters to surface users here." />
          )}
        </div>
      </ContentCard>

      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">User Detail</h2>
        {userDetail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-slate-950">{userDetail.user.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">{userDetail.user.email}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onToggleUserStatus({
                    id: userDetail.user.id,
                    isActive: !userDetail.user.isActive
                  })
                }
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {userDetail.user.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>Role: {userDetail.user.role}</p>
              <p>Tenant: {userDetail.user.tenant?.name ?? "No tenant"}</p>
              <p>Enrollments: {userDetail.user._count.enrollments}</p>
              <p>Courses: {userDetail.user._count.instructorCourses}</p>
            </div>
          </div>
        ) : userDetailLoading ? (
          <StatusBanner>Loading user detail...</StatusBanner>
        ) : (
          <EmptyState title="Select a user" description="Choose a user from the list to inspect account state." />
        )}
      </ContentCard>
    </div>
  );
}
