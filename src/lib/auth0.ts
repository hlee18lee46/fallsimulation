// src/lib/auth0.ts (or lib/auth0.ts if you don't use /src)
"use client";
import { useUser } from "@auth0/nextjs-auth0/client";

export function useAuth() {
  const { user, error, isLoading } = useUser();

  const login = (returnTo?: string) => {
    const url = returnTo
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/api/auth/login";
    window.location.href = url;
  };

  const logout = () => { window.location.href = "/api/auth/logout"; };

  return { user, error, isLoading, login, logout };
}
