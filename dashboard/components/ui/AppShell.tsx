import type { ReactNode } from "react";
import NavBar from "./NavBar";
import PageTransition from "./PageTransition";

export default function AppShell({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-[#F3F4F6] pb-20 lg:pb-0 lg:pl-60"><NavBar/><PageTransition>{children}</PageTransition></div>; }
