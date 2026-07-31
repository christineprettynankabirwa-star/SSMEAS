export type DatePreset = "today" | "7d" | "30d" | "custom";
export type ReportType = "telemetry" | "alerts" | "maintenance";
export type ReportFormat = "PDF" | "CSV" | "Excel";
export type ReportStatus = "Ready" | "Processing" | "Failed";

export interface ReportFiltersValue {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  tankId: string;
  reportType: ReportType;
  format: ReportFormat;
}

export interface ResolvedReportRequest extends ReportFiltersValue {
  from: string;
  to: string;
  tankName: string;
}

export interface ReportRow {
  [key: string]: string | number | null;
}

export interface ReportDataset {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: ReportRow[];
}

export interface ReportJob {
  id: string;
  fileName: string;
  generatedAt: string;
  format: ReportFormat;
  generatedBy: string;
  status: ReportStatus;
  request: ResolvedReportRequest;
  error?: string;
}

export interface ReportSchedule {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  reportType: ReportType;
  format: ReportFormat;
  createdAt: string;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  telemetry: "Telemetry Summary",
  alerts: "Alert Audit Log",
  maintenance: "Maintenance History",
};

