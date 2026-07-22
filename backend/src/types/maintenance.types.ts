export type MaintenanceStatus = "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface MaintenanceRecord {
  id: string;
  tank_id: string;
  tank_name: string;
  task: string;
  scheduled_for: Date;
  status: MaintenanceStatus;
  created_at: Date;
  priority: MaintenancePriority;
  assigned_to: string | null;
  assigned_officer: string | null;
  completed_at: Date | null;
  notes: string | null;
}

export interface CreateMaintenanceRequest {
  tank_id: string;
  task: string;
  scheduled_for: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  assigned_to?: string | null;
  notes?: string | null;
}

export interface UpdateMaintenanceRequest {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  assigned_to?: string | null;
  scheduled_for?: string;
  notes?: string | null;
}
