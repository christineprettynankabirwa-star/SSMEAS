import type { AlertItem, AnalyticsReading, MaintenanceItem, Tank } from "@/components/dashboard/types";
import { getAlerts, getAnalytics, getMaintenance, getOverflowPredictions } from "@/services/api";
import {
  REPORT_TYPE_LABELS,
  type ReportDataset,
  type ReportFiltersValue,
  type ReportFormat,
  type ReportRow,
  type ResolvedReportRequest,
} from "./types";

const localDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const resolveReportRequest = (filters: ReportFiltersValue, tanks: Tank[]): ResolvedReportRequest => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (filters.datePreset === "7d") start.setDate(start.getDate() - 6);
  if (filters.datePreset === "30d") start.setDate(start.getDate() - 29);
  const fromDate = filters.datePreset === "custom" ? new Date(`${filters.dateFrom}T00:00:00`) : start;
  const toDate = filters.datePreset === "custom" ? new Date(`${filters.dateTo}T23:59:59.999`) : now;
  return {
    ...filters,
    dateFrom: localDate(fromDate),
    dateTo: localDate(toDate),
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    tankName: filters.tankId === "all" ? "All Assets" : tanks.find((tank) => tank.id === filters.tankId)?.tank_name ?? "Selected Asset",
  };
};

const inRange = (value: string, request: ResolvedReportRequest): boolean => {
  const time = new Date(value).getTime();
  return time >= new Date(request.from).getTime() && time <= new Date(request.to).getTime();
};
const matchesTank = (tankId: string, request: ResolvedReportRequest): boolean =>
  request.tankId === "all" || tankId === request.tankId;
const displayDate = (value: string | null): string => value ? new Date(value).toLocaleString("en-UG") : "";

const telemetryDataset = async (request: ResolvedReportRequest, tanks: Tank[]): Promise<ReportDataset> => {
  const selected = request.tankId === "all" ? tanks : tanks.filter((tank) => tank.id === request.tankId);
  const [response, predictions] = selected.length ? await Promise.all([
    getAnalytics(selected.map((tank) => tank.id), "all", true),
    getOverflowPredictions(),
  ]) : [null, []];
  const tankNames = new Map(tanks.map((tank) => [tank.id, tank.tank_name]));
  const projections = new Map(predictions.map((prediction) => [prediction.tank_id, prediction]));
  const rows = (response?.readings ?? [])
    .filter((reading: AnalyticsReading) => inRange(reading.recorded_at, request))
    .map((reading: AnalyticsReading): ReportRow => {
      const prediction = projections.get(reading.tank_id);
      const interval = prediction?.overflow_projection.predictionInterval95;
      return {
        tank: tankNames.get(reading.tank_id) ?? reading.tank_id,
        recorded: displayDate(reading.recorded_at),
        sewageLevel: reading.level === null ? "" : Number(reading.level.toFixed(2)),
        gasLevel: reading.gas_level === null ? "" : Number(reading.gas_level.toFixed(2)),
        currentVolume: prediction?.current_volume_cubic_meters ?? "",
        remainingVolume: prediction?.remaining_capacity_cubic_meters ?? "",
        velocity: prediction?.fill_velocity_percent_per_hour ?? "",
        warningHours: prediction?.warning_projection.remainingHours ?? "",
        dangerHours: prediction?.danger_projection.remainingHours ?? "",
        overflowHours: prediction?.overflow_projection.remainingHours ?? "",
        predictionStatus: prediction?.overflow_projection.status.replaceAll("_", " ") ?? "",
        predictionInterval: interval?.minimumHours == null
          ? "" : `${interval.minimumHours}–${interval.maximumHours ?? "unbounded"}`,
        predictionQuality: prediction?.prediction_quality_status.replaceAll("_", " ") ?? "",
        confidence: prediction?.confidence ?? "",
      };
    });
  return {
    title: "Tank Telemetry Summary",
    columns: [
      { key: "tank", label: "Tank" },
      { key: "recorded", label: "Recorded At" },
      { key: "sewageLevel", label: "Sewage Level (%)" },
      { key: "gasLevel", label: "Gas Level (ppm)" },
      { key: "currentVolume", label: "Current Volume (m³)" },
      { key: "remainingVolume", label: "Remaining Volume (m³)" },
      { key: "velocity", label: "OLS Fill Velocity (%/h)" },
      { key: "warningHours", label: "Hours to 65%" },
      { key: "dangerHours", label: "Hours to 85%" },
      { key: "overflowHours", label: "Hours to 100%" },
      { key: "predictionStatus", label: "Prediction Status" },
      { key: "predictionInterval", label: "95% Overflow Interval (hours)" },
      { key: "predictionQuality", label: "Prediction Quality" },
      { key: "confidence", label: "Confidence (%)" },
    ],
    rows,
  };
};

const alertsDataset = async (request: ResolvedReportRequest): Promise<ReportDataset> => {
  const alerts = (await getAlerts()).filter((alert: AlertItem) => matchesTank(alert.tank_id, request) && inRange(alert.created_at, request));
  return {
    title: "Incident and Alert Audit Log",
    columns: [
      { key: "tank", label: "Tank" }, { key: "severity", label: "Severity" },
      { key: "status", label: "Status" }, { key: "created", label: "Created" },
      { key: "acknowledged", label: "Acknowledged" }, { key: "resolved", label: "Resolved" },
      { key: "responseMinutes", label: "Response Time (min)" },
    ],
    rows: alerts.map((alert) => ({
      tank: alert.tank_name,
      severity: alert.severity.toUpperCase(),
      status: alert.status,
      created: displayDate(alert.created_at),
      acknowledged: displayDate(alert.acknowledged_at),
      resolved: displayDate(alert.resolved_at),
      responseMinutes: alert.acknowledged_at
        ? Math.max(0, Math.round((new Date(alert.acknowledged_at).getTime() - new Date(alert.created_at).getTime()) / 60000))
        : "",
    })),
  };
};

const maintenanceDataset = async (request: ResolvedReportRequest): Promise<ReportDataset> => {
  const items = (await getMaintenance()).filter((item: MaintenanceItem) =>
    matchesTank(item.tank_id, request) && inRange(item.created_at, request));
  return {
    title: "Maintenance and Service History",
    columns: [
      { key: "tank", label: "Tank" }, { key: "task", label: "Task" },
      { key: "priority", label: "Priority" }, { key: "status", label: "Status" },
      { key: "scheduled", label: "Scheduled" }, { key: "completed", label: "Completed" },
      { key: "officer", label: "Assigned Officer" },
    ],
    rows: items.map((item) => ({
      tank: item.tank_name,
      task: item.task,
      priority: item.priority,
      status: item.status.replaceAll("_", " "),
      scheduled: displayDate(item.scheduled_for),
      completed: displayDate(item.completed_at),
      officer: item.assigned_officer ?? "Unassigned",
    })),
  };
};

export const fetchReportDataset = (
  request: ResolvedReportRequest,
  tanks: Tank[],
): Promise<ReportDataset> => {
  if (request.reportType === "telemetry") return telemetryDataset(request, tanks);
  if (request.reportType === "alerts") return alertsDataset(request);
  return maintenanceDataset(request);
};

const escapeCsv = (value: ReportRow[string]): string => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
const escapeXml = (value: ReportRow[string]): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

const csvBlob = (dataset: ReportDataset): Blob => {
  const lines = [
    dataset.columns.map((column) => escapeCsv(column.label)).join(","),
    ...dataset.rows.map((row) => dataset.columns.map((column) => escapeCsv(row[column.key])).join(",")),
  ];
  return new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
};

const excelBlob = (dataset: ReportDataset): Blob => {
  const cells = (values: ReportRow[string][]) => values.map((value) =>
    `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`).join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Report"><Table>
<Row>${cells(dataset.columns.map((column) => column.label))}</Row>
${dataset.rows.map((row) => `<Row>${cells(dataset.columns.map((column) => row[column.key]))}</Row>`).join("")}
</Table></Worksheet></Workbook>`;
  return new Blob([xml], { type: "application/vnd.ms-excel" });
};

const pdfBlob = async (dataset: ReportDataset, request: ResolvedReportRequest): Promise<Blob> => {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = document.internal.pageSize.getWidth();
  let y = 16;
  document.setFontSize(16);
  document.text(dataset.title, 12, y);
  document.setFontSize(9);
  y += 7;
  document.text(`${request.tankName} | ${request.dateFrom} to ${request.dateTo}`, 12, y);
  y += 8;
  const line = (values: string[], bold = false) => {
    if (y > 195) {
      document.addPage();
      y = 14;
    }
    document.setFont("helvetica", bold ? "bold" : "normal");
    const text = values.join(" | ");
    document.text(document.splitTextToSize(text, width - 24), 12, y);
    y += Math.max(5, document.splitTextToSize(text, width - 24).length * 4);
  };
  line(dataset.columns.map((column) => column.label), true);
  if (!dataset.rows.length) line(["No records matched the selected filters."]);
  dataset.rows.forEach((row) => line(dataset.columns.map((column) => String(row[column.key] ?? ""))));
  return document.output("blob");
};

export const createReportBlob = (
  dataset: ReportDataset,
  request: ResolvedReportRequest,
): Promise<Blob> => {
  if (request.format === "CSV") return Promise.resolve(csvBlob(dataset));
  if (request.format === "Excel") return Promise.resolve(excelBlob(dataset));
  return pdfBlob(dataset, request);
};

export const reportFileName = (request: ResolvedReportRequest): string => {
  const extension: Record<ReportFormat, string> = { PDF: "pdf", CSV: "csv", Excel: "xls" };
  const base = REPORT_TYPE_LABELS[request.reportType].replaceAll(" ", "_");
  return `${base}_${request.dateFrom}_${request.dateTo}.${extension[request.format]}`;
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
