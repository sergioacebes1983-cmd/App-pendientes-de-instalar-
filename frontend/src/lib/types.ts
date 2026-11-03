// Hand-written mirrors of backend/models/schemas.py — keep in sync.
export type Role = "admin" | "trabajador";
export type DeviceType = "telefono" | "monitor";
export type Status = "pendiente" | "instalado";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserCreate {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export interface UserUpdate {
  name?: string;
  role?: Role;
  active?: boolean;
  password?: string;
}

export interface CommunityCreate {
  name: string;
  address: string;
}

export interface Community {
  id: string;
  name: string;
  address: string;
  created_at: string;
  total: number;
  installed: number;
  pending: number;
  pending_telefono: number;
  pending_monitor: number;
  last_activity_at: string | null;
  last_activity_by: string | null;
}

export interface NeighborCreate {
  name: string;
  street: string;
  unit: string;
  phone: string;
  device_type: DeviceType;
  status: Status;
  notes: string;
}

export type NeighborUpdate = Partial<NeighborCreate>;

export interface Neighbor {
  id: string;
  community_id: string;
  name: string;
  street: string;
  unit: string;
  phone: string;
  device_type: DeviceType;
  status: Status;
  notes: string;
  created_at: string;
  updated_at: string;
  updated_by_name: string;
  installed_at: string | null;
  installed_by_name: string | null;
  photo_count: number;
}

export interface Photo {
  id: string;
  neighbor_id: string | null;
  street: string | null;
  community_id: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface PushPublicKey {
  public_key: string;
}

export interface TechSummary {
  user_name: string;
  total: number;
  telefono: number;
  monitor: number;
}

export interface CommunitySummary {
  community_id: string;
  name: string;
  installed: number;
  pending_now: number;
}

export interface InstallItem {
  community_name: string;
  street: string;
  unit: string;
  neighbor_name: string;
  device_type: string;
  installed_by_name: string;
  installed_at: string;
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  generated_at: string;
  is_partial: boolean;
  total_installed: number;
  total_telefono: number;
  total_monitor: number;
  pending_now: number;
  by_technician: TechSummary[];
  by_community: CommunitySummary[];
  items: InstallItem[];
}

export interface ReportListItem {
  id: string;
  week_start: string;
  week_end: string;
  generated_at: string;
  total_installed: number;
}

export interface FieldChange {
  field: string;
  old: string | null;
  new: string | null;
}

export interface HistoryEntry {
  id: string;
  neighbor_id: string;
  community_id: string;
  user_id: string;
  user_name: string;
  action: "creado" | "modificado" | "instalado" | "pendiente" | "foto" | "foto_borrada";
  changes: FieldChange[];
  timestamp: string;
}

export const DEVICE_LABELS: Record<DeviceType, string> = {
  telefono: "Teléfono portero",
  monitor: "Monitor videoportero",
};

export const STATUS_LABELS: Record<Status, string> = {
  pendiente: "Pendiente",
  instalado: "Instalado",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  trabajador: "Trabajador",
};
