"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  bio?: string | null;
  profileImage?: string | null;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  isSuperAdmin?: boolean;
  mustChangePassword?: boolean;
  adminPermissions?: Array<
    | "VIEW_OVERVIEW"
    | "REVIEW_TENANTS"
    | "MANAGE_TENANTS"
    | "REVIEW_STUDENTS"
    | "REVIEW_INSTRUCTORS"
    | "MANAGE_USERS"
    | "REVIEW_COURSES"
    | "REVIEW_PAYMENTS"
    | "MANAGE_PLANS"
    | "REVIEW_ADMINS"
    | "HANDLE_SUPPORT"
  >;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
}

interface TenantInfo {
  id: string;
  name: string;
}

interface AuthState {
  accessToken: string | null;
  tenant: TenantInfo | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setSession: (input: { accessToken: string; tenant: TenantInfo | null; user: AuthUser }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tenant: null,
      user: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSession: ({ accessToken, tenant, user }) => set({ accessToken, tenant, user }),
      clearSession: () => set({ accessToken: null, tenant: null, user: null })
    }),
    {
      name: "lms-auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
