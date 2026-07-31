"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProfile, setAccessToken, type UserProfile } from "@/services/api";
import { can, type UiPermission } from "./permissions";

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
  can: (permission: UiPermission) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = sessionStorage.getItem("ssmeas_access_token");
    setAccessToken(token);
    if (!token) { setUser(null); setLoading(false); return; }
    try { setUser(await getProfile()); }
    catch {
      sessionStorage.removeItem("ssmeas_access_token");
      setAccessToken(null);
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const id = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(id); }, [refresh]);
  const signOut = useCallback(() => {
    sessionStorage.removeItem("ssmeas_access_token");
    setAccessToken(null);
    setUser(null);
  }, []);
  const value = useMemo<AuthValue>(() => ({
    user, loading, refresh, signOut,
    can: (permission) => user ? can(user.role, permission) : false,
  }), [user, loading, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
};
