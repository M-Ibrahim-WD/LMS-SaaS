"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "../store/auth.store";
import type { AppUserRole } from "../lib/auth/token";

interface UseRequireAuthOptions {
  roles?: AppUserRole[];
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    if (options.roles?.length && (!user || !options.roles.includes(user.role))) {
      router.replace("/dashboard");
    }
  }, [accessToken, hasHydrated, options.roles, router, user]);

  const isAuthorized =
    Boolean(hasHydrated && accessToken) &&
    (!options.roles?.length || Boolean(user && options.roles.includes(user.role)));

  return {
    accessToken,
    user,
    hasHydrated,
    isAuthorized
  };
}
