import type { ReactNode } from "react";
import NavBar from "./NavBar";
import PageTransition from "./PageTransition";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import EmergencyAlertSystem from "@/components/alerts/EmergencyAlertSystem";
import RouteGuard from "@/auth/RouteGuard";

export default function AppShell({ children }: { children: ReactNode }) { return <RouteGuard><div className="control-room min-h-screen pb-20 lg:pb-0 lg:pl-60"><NavBar/><NotificationCenter/><EmergencyAlertSystem/><PageTransition>{children}</PageTransition></div></RouteGuard>; }
