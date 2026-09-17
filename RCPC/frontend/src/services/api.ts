import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  StructuredResponse,
  SystemInfo,
  TelemetryData,
  NetworkInterface,
  HotspotStatus,
  TransportsMap,
  FileBrowseResult,
  ProcessEntry,
  AllowlistedApp,
  AuditEntry,
  PairedDevice
} from '../types';

export const DEFAULT_SERVER_PORT = 8765;

export function getDefaultServerUrl(): string {
  const saved = localStorage.getItem('rcpc_server_url');
  if (saved) return saved;
  const hostname = window.location.hostname || 'localhost';
  // If hosted on a cloud domain (Netlify, Vercel, etc.), do not append :8765 to the cloud domain!
  if (hostname.includes('netlify.app') || hostname.includes('vercel.app') || hostname.includes('pages.dev')) {
    return 'http://localhost:8765';
  }
  return `http://${hostname}:${DEFAULT_SERVER_PORT}`;
}

export function getStoredToken(): string | null {
  return localStorage.getItem('rcpc_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('rcpc_token', token);
}

export function clearStoredAuth() {
  localStorage.removeItem('rcpc_token');
  localStorage.removeItem('rcpc_device');
}

class ApiService {
  private client: AxiosInstance;
  public baseUrl: string;

  constructor() {
    this.baseUrl = getDefaultServerUrl();
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: 10000,
    });

    this.client.interceptors.request.use((config) => {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  public updateBaseUrl(newUrl: string) {
    this.baseUrl = newUrl.replace(/\/+$/, '');
    localStorage.setItem('rcpc_server_url', this.baseUrl);
    this.client.defaults.baseURL = `${this.baseUrl}/api/v1`;
  }

  // Auth
  async getPairingInfo() {
    const res = await this.client.get('/auth/pairing-info');
    return res.data;
  }

  async pairDevice(code: string, deviceId: string, deviceName: string, transport: string = 'wifi') {
    const res = await this.client.post<StructuredResponse>('/auth/pair', {
      code,
      device_id: deviceId,
      device_name: deviceName,
      client_type: 'PWA',
      transport
    });
    return res.data;
  }

  async verifyToken() {
    const res = await this.client.get<StructuredResponse>('/auth/verify');
    return res.data;
  }

  async getDevices() {
    const res = await this.client.get<{ devices: PairedDevice[] }>('/auth/devices');
    return res.data.devices;
  }

  async revokeDevice(deviceId: string) {
    const res = await this.client.delete<StructuredResponse>(`/auth/devices/${deviceId}`);
    return res.data;
  }

  // System
  async getSystemInfo() {
    const res = await this.client.get<StructuredResponse<SystemInfo>>('/system/info');
    return res.data.data!;
  }

  async lock() {
    const res = await this.client.post<StructuredResponse>('/system/lock', { confirm: true });
    return res.data;
  }

  async sleep() {
    const res = await this.client.post<StructuredResponse>('/system/sleep', { confirm: true });
    return res.data;
  }

  async hibernate() {
    const res = await this.client.post<StructuredResponse>('/system/hibernate', { confirm: true });
    return res.data;
  }

  async restart(delaySeconds: number = 5) {
    const res = await this.client.post<StructuredResponse>('/system/restart', {
      confirm: true,
      delay_seconds: delaySeconds
    });
    return res.data;
  }

  async shutdown(delaySeconds: number = 5) {
    const res = await this.client.post<StructuredResponse>('/system/shutdown', {
      confirm: true,
      delay_seconds: delaySeconds
    });
    return res.data;
  }

  async abortShutdown() {
    const res = await this.client.post<StructuredResponse>('/system/abort-shutdown', { confirm: true });
    return res.data;
  }

  // Monitoring
  async getTelemetry() {
    const res = await this.client.get<StructuredResponse<TelemetryData>>('/monitoring/status');
    return res.data.data!;
  }

  // Network
  async getInterfaces() {
    const res = await this.client.get<StructuredResponse<NetworkInterface[]>>('/network/interfaces');
    return res.data.data!;
  }

  async getTransports() {
    const res = await this.client.get<StructuredResponse<TransportsMap>>('/network/transports');
    return res.data.data!;
  }

  async getHotspotStatus() {
    const res = await this.client.get<StructuredResponse<HotspotStatus>>('/network/hotspot');
    return res.data.data!;
  }

  async toggleHotspot(enable: boolean, confirmCarrierDisconnect: boolean = false) {
    const res = await this.client.post<StructuredResponse>('/network/hotspot/toggle', {
      enable,
      confirm_carrier_disconnect: confirmCarrierDisconnect
    });
    return res.data;
  }

  // Media
  async volumeUp(steps: number = 1) {
    const res = await this.client.post<StructuredResponse>('/media/volume/up', { steps });
    return res.data;
  }

  async volumeDown(steps: number = 1) {
    const res = await this.client.post<StructuredResponse>('/media/volume/down', { steps });
    return res.data;
  }

  async volumeMute() {
    const res = await this.client.post<StructuredResponse>('/media/volume/mute');
    return res.data;
  }

  async playPause() {
    const res = await this.client.post<StructuredResponse>('/media/playback/play-pause');
    return res.data;
  }

  async mediaNext() {
    const res = await this.client.post<StructuredResponse>('/media/playback/next');
    return res.data;
  }

  async mediaPrev() {
    const res = await this.client.post<StructuredResponse>('/media/playback/prev');
    return res.data;
  }

  async mediaStop() {
    const res = await this.client.post<StructuredResponse>('/media/playback/stop');
    return res.data;
  }

  // Files
  async getFileRoots() {
    const res = await this.client.get<StructuredResponse<any[]>>('/files/roots');
    return res.data.data!;
  }

  async browseFiles(path?: string) {
    const res = await this.client.get<StructuredResponse<FileBrowseResult>>('/files/browse', {
      params: path ? { path } : {}
    });
    return res.data.data!;
  }

  getDownloadUrl(filePath: string): string {
    const token = getStoredToken();
    return `${this.baseUrl}/api/v1/files/download?path=${encodeURIComponent(filePath)}&token=${token || ''}`;
  }

  async uploadFile(file: File, targetDir: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_dir', targetDir);
    const res = await this.client.post<StructuredResponse>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }

  async createFolder(parentPath: string, folderName: string) {
    const res = await this.client.post<StructuredResponse>('/files/mkdir', {
      parent_path: parentPath,
      folder_name: folderName
    });
    return res.data;
  }

  async renameFile(sourcePath: string, newName: string) {
    const res = await this.client.post<StructuredResponse>('/files/rename', {
      source_path: sourcePath,
      new_name: newName
    });
    return res.data;
  }

  async deleteFile(targetPath: string) {
    const res = await this.client.delete<StructuredResponse>(`/files/delete`, {
      data: { target_path: targetPath, confirm: true }
    });
    return res.data;
  }

  // Applications
  async getAllowlistedApps() {
    const res = await this.client.get<StructuredResponse<AllowlistedApp[]>>('/apps/allowlist');
    return res.data.data!;
  }

  async getProcesses() {
    const res = await this.client.get<StructuredResponse<ProcessEntry[]>>('/apps/processes');
    return res.data.data!;
  }

  async launchApp(appName: string) {
    const res = await this.client.post<StructuredResponse>('/apps/launch', { app_name: appName });
    return res.data;
  }

  async terminateProcess(pid: number) {
    const res = await this.client.post<StructuredResponse>('/apps/terminate', {
      pid,
      confirm: true
    });
    return res.data;
  }

  // Clipboard
  async getClipboard() {
    const res = await this.client.get<StructuredResponse<{ text: string; length: number }>>('/clipboard');
    return res.data.data!;
  }

  async setClipboard(text: string) {
    const res = await this.client.post<StructuredResponse>('/clipboard', { text });
    return res.data;
  }

  // Screen
  getScreenshotUrl(): string {
    const token = getStoredToken();
    return `${this.baseUrl}/api/v1/screen/capture?t=${Date.now()}&token=${token || ''}`;
  }

  async fetchScreenshotBlob(): Promise<string> {
    const res = await this.client.get('/screen/capture', {
      responseType: 'blob',
      params: { quality: 75, t: Date.now() }
    });
    return URL.createObjectURL(res.data);
  }

  // Input
  async mouseMove(dx: number, dy: number, sensitivity: number = 1.0) {
    return this.client.post('/input/mouse/move', { dx, dy, sensitivity });
  }

  async mouseClick(button: 'left' | 'right' | 'middle' = 'left', action: 'click' | 'double_click' | 'down' | 'up' = 'click') {
    return this.client.post('/input/mouse/click', { button, action });
  }

  async mouseScroll(delta: number) {
    return this.client.post('/input/mouse/scroll', { delta });
  }

  async sendKeyboardText(text: string) {
    return this.client.post('/input/keyboard/text', { text });
  }

  async sendKeyboardKey(key: string) {
    return this.client.post('/input/keyboard/key', { key });
  }

  // Activity
  async getActivityLogs(limit: number = 50) {
    const res = await this.client.get<StructuredResponse<{ entries: AuditEntry[]; count: number }>>('/activity/logs', {
      params: { limit }
    });
    return res.data.data?.entries || [];
  }
}

export const api = new ApiService();
