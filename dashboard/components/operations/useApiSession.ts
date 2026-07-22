"use client";

import { useEffect, useState } from "react";
import { setAccessToken } from "@/services/api";

export function useApiSession(): boolean | null {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => { const id=window.setTimeout(()=>{const token=sessionStorage.getItem("ssmeas_access_token");setAccessToken(token);setReady(Boolean(token));},0);return()=>window.clearTimeout(id); }, []);
  return ready;
}
