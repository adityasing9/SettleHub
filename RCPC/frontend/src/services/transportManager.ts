import { api } from './api';
import { wsService } from './websocket';
import type { TransportType, TransportsMap } from '../types';

export interface TransportState {
  activeTransport: TransportType;
  latencyMs: number;
  availableTransports: TransportsMap | null;
  priority: TransportType[];
}

export interface TransportChangeListener {
  (state: TransportState): void;
}

class TransportManager {
  private activeTransport: TransportType = 'wifi';
  private latencyMs: number = 0;
  private availableTransports: TransportsMap | null = null;
  private priority: TransportType[] = ['usb', 'wifi', 'hotspot', 'tailscale', 'bluetooth'];
  private listeners: Set<TransportChangeListener> = new Set();
  private pollTimer: any = null;

  constructor() {
    const savedPriority = localStorage.getItem('rcpc_transport_priority');
    if (savedPriority) {
      try {
        this.priority = JSON.parse(savedPriority);
      } catch (e) {}
    }

    wsService.onLatency((rtt) => {
      this.latencyMs = rtt;
      this.notify();
    });
  }

  async refreshTransports() {
    try {
      const map = await api.getTransports();
      this.availableTransports = map;
      this.autoSelectBestTransport();
      this.notify();
    } catch (e) {}
  }

  startPolling(intervalMs: number = 10000) {
    this.refreshTransports();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refreshTransports(), intervalMs);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private autoSelectBestTransport() {
    if (!this.availableTransports) return;

    for (const t of this.priority) {
      const details = this.availableTransports[t];
      if (details && details.available && (details.status === 'active' || details.status === 'ready' || details.status === 'connected')) {
        if (this.activeTransport !== t) {
          this.switchTransport(t);
        }
        return;
      }
    }
  }

  switchTransport(transport: TransportType) {
    this.activeTransport = transport;
    if (this.availableTransports && this.availableTransports[transport]?.url) {
      const newUrl = this.availableTransports[transport].url!;
      api.updateBaseUrl(newUrl);
      wsService.disconnect();
      wsService.connect();
    }
    this.notify();
  }

  setPriority(newPriority: TransportType[]) {
    this.priority = newPriority;
    localStorage.setItem('rcpc_transport_priority', JSON.stringify(newPriority));
    this.autoSelectBestTransport();
    this.notify();
  }

  getState(): TransportState {
    return {
      activeTransport: this.activeTransport,
      latencyMs: this.latencyMs,
      availableTransports: this.availableTransports,
      priority: this.priority
    };
  }

  subscribe(listener: TransportChangeListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }
}

export const transportManager = new TransportManager();
