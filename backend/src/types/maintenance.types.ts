export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export interface MaintenanceRecord {
  id: string;
  tank_id: string;
  tank_name: string;
  task: string;
  scheduled_for: Date;
  status: MaintenanceStatus;
  created_at: Date;
}

export interface CreateMaintenanceRequest {
  tank_id: string;
  task: string;
  scheduled_for: string;
  status?: MaintenanceStatus;
}
