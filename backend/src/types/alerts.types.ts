export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "ACTIVE" | "RESOLVED";

export interface Alert {
  id: string;
  tank_id: string;
  tank_name: string;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  created_at: Date;
}

export interface CreateAlertRequest {
  tank_id: string;
  alert_type: string;
  severity?: AlertSeverity;
  message: string;
}
