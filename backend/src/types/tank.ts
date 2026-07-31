// Defines the tank data contracts shared across the tank management module.
export type TankStatus = "ACTIVE" | "INACTIVE";

export interface Tank {
  id: string;
  tank_name: string;
  owner_name: string;
  owner_user_id: string | null;
  location: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  status: TankStatus;
  thingspeak_channel_id?: number;
  thingspeak_read_api_key?: string;
  hardware_id?: string | null;
  warning_fill_threshold: number;
  critical_fill_threshold: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTankRequest {
  tank_name: string;
  owner_name: string;
  owner_user_id?: string | null;
  location: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  status?: TankStatus;
  thingspeak_channel_id?: number;
  thingspeak_read_api_key?: string;
  hardware_id?: string | null;
  warning_fill_threshold?: number;
  critical_fill_threshold?: number;
}

export interface UpdateTankRequest {
  tank_name?: string;
  owner_name?: string;
  owner_user_id?: string | null;
  location?: string;
  latitude?: number;
  longitude?: number;
  capacity_liters?: number;
  status?: TankStatus;
  thingspeak_channel_id?: number;
  thingspeak_read_api_key?: string;
  hardware_id?: string | null;
  warning_fill_threshold?: number;
  critical_fill_threshold?: number;
}
