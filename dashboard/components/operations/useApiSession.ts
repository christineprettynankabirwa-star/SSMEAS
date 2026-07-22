"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, setAccessToken } from "@/services/api";

export function useApiSession(): boolean | null {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => { let active=true;const id=window.setTimeout(()=>{const token=sessionStorage.getItem("ssmeas_access_token");setAccessToken(token);if(!token){setReady(false);router.replace("/");return}void getProfile().then(()=>{if(active)setReady(true)}).catch(()=>{sessionStorage.removeItem("ssmeas_access_token");setAccessToken(null);if(active)setReady(false);router.replace("/")});},0);return()=>{active=false;window.clearTimeout(id)}; }, [router]);
  return ready;
}
