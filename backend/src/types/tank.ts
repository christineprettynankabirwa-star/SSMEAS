// Defines the tank data contracts shared across the tank management module.
export type TankStatus = "ACTIVE" | "INACTIVE";

export interface Tank {
  id: string;
  tank_name: string;
  owner_name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  status: TankStatus;
  thingspeak_channel_id?: number;
  thingspeak_read_api_key?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTankRequest {
  tank_name: string;
  owner_name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  status?: TankStatus;
  thingspeak_channel_id?: number;
  thingspeak_read_api_key?: string;
}

export interface UpdateTankRequest {
  tank_name?: string;
  owner_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  capacity_liters?: number;
  status?: TankStatus;
  thingspeak_channel_id?: number;
  thingspeak_read_api_key?: string;
}
