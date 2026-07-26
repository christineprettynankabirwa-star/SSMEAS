"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { can, pathPermission } from "./permissions";

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = !!user && can(user.role, pathPermission(pathname));
  useEffect(() => {
    if (!loading && (!user || !allowed)) router.replace("/");
  }, [allowed, loading, router, user]);
  if (loading || !allowed) return null;
  return children;
}
