"use client";

import { useAuth } from "@/auth/AuthContext";

export function useApiSession(): boolean | null {
  const { user, loading } = useAuth();
  return loading ? null : !!user;
}
