export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

export type TransportType = 'wifi' | 'hotspot' | 'tailscale' | 'usb' | 'bluetooth';

export interface StructuredResponse<T = any> {
  success: boolean;
  action: string;
  timestamp: string;
  transport?: string;
  data?: T;
  error_code?: string;
  message?: string;
}

export interface SystemInfo {
  hostname: string;
  os_name: string;
  os_release: string;
  os_version: string;
  architecture: string;
  processor: string;
  cpu_count_physical: number;
  cpu_count_logical: number;
  boot_time: string;
  uptime_seconds: number;
  uptime_formatted: string;
  current_user: string;
}

export interface DiskInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
}

export interface BatteryInfo {
  percent: number;
  power_plugged: boolean;
  secsleft: number;
}

export interface GpuInfo {
  name: string;
  load_percent: number;
  memory_total_mb: number;
  memory_used_mb: number;
  temperature_c: number;
}

export interface TelemetryData {
  cpu: {
    percent: number;
    per_core: number[];
    frequency_mhz?: number;
  };
  memory: {
    total: number;
    available: number;
    used: number;
    percent: number;
  };
  swap: {
    total: number;
    used: number;
    percent: number;
  };
  disks: DiskInfo[];
  battery: BatteryInfo | null;
  network_io: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
  };
  gpu: GpuInfo | null;
}

export interface NetworkInterface {
  name: string;
  type: string;
  is_up: boolean;
  speed_mbps: number;
  ipv4: string[];
  ipv6: string[];
  mac_address: string | null;
  wifi_details?: {
    ssid?: string;
    bssid?: string;
    signal?: string;
    state?: string;
    radio_type?: string;
  } | null;
}

export interface HotspotStatus {
  supported: boolean;
  is_enabled: boolean;
  state: string;
  client_count: number;
  method: string;
  is_client_connected_via_hotspot?: boolean;
}

export interface TransportDetails {
  name: string;
  available: boolean;
  status: string;
  ips?: string[];
  ip?: string;
  port?: number;
  url?: string;
  note?: string;
}

export interface TransportsMap {
  wifi: TransportDetails;
  hotspot: TransportDetails;
  tailscale: TransportDetails;
  usb: TransportDetails;
  bluetooth: TransportDetails;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  modified: string;
  extension: string;
}

export interface FileBrowseResult {
  current_path: string;
  root_path: string | null;
  is_root: boolean;
  entries: FileEntry[];
  roots: { name: string; path: string; exists: boolean }[];
}

export interface ProcessEntry {
  pid: number;
  name: string;
  username: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  is_protected: boolean;
}

export interface AllowlistedApp {
  name: string;
  command: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  result: string;
  device_id: string;
  device_name: string;
  transport: string;
  error?: string | null;
  metadata?: Record<string, any>;
}

export interface PairedDevice {
  device_id: string;
  device_name: string;
  client_type: string;
  paired_at: string;
  last_seen: string;
  is_revoked: boolean;
  permissions?: string[];
}
