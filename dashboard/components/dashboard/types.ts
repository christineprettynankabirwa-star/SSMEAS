export type TankStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export interface Tank { id: string; tank_name: string; owner_name: string; location: string; latitude: number; longitude: number; capacity_liters: number; status: TankStatus; thingspeak_channel_id?: number; created_at: string; updated_at: string; }
export interface SensorReading { id: string; tank_id: string; thingspeak_channel_id: number; thingspeak_entry_id: number; level: number | null; gas_level: number | null; temperature: number | null; battery: number | null; recorded_at: string; created_at: string; }
export interface AlertItem { id: string; title: string; detail: string; severity: "critical" | "warning" | "info"; created_at: string; }
export interface MaintenanceItem { id: string; tank_name: string; task: string; scheduled_for: string; status: "Scheduled" | "In progress" | "Completed"; }
