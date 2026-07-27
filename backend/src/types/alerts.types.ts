export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export interface Alert {
  id: string;
  tank_id: string;
  tank_name: string;
  location: string;
  latitude: number;
  longitude: number;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  created_at: Date;
  updated_at: Date;
  last_seen_at: Date;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
}

export interface CreateAlertRequest {
  tank_id: string;
  alert_type: string;
  severity?: AlertSeverity;
  message: string;
}
