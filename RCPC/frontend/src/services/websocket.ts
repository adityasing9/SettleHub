import { getStoredToken, getDefaultServerUrl } from './api';
import type { TelemetryData } from '../types';

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export interface LatencyListener {
  (latencyMs: number): void;
}

export interface TelemetryListener {
  (telemetry: TelemetryData): void;
}

export interface StatusListener {
  (status: WebSocketStatus): void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectInterval = 10000;
  
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private latencyListeners: Set<LatencyListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private lastPingTime = 0;
  public currentLatency = 0;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = getStoredToken();
    if (!token) {
      this.updateStatus('disconnected');
      return;
    }

    this.updateStatus('connecting');

    const serverUrl = getDefaultServerUrl();
    const wsUrl = serverUrl.replace(/^http/, 'ws') + `/ws/telemetry?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.startPingLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'telemetry') {
            this.telemetryListeners.forEach((l) => l(msg.data));
          } else if (msg.type === 'pong') {
            if (this.lastPingTime > 0) {
              const rtt = Math.max(1, Math.round(performance.now() - this.lastPingTime));
              this.currentLatency = rtt;
              this.latencyListeners.forEach((l) => l(rtt));
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.updateStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (err) {
      this.cleanup();
      this.updateStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectInterval);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private startPingLoop() {
    this.cleanup();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = performance.now();
        this.ws.send(JSON.stringify({ type: 'ping', time: this.lastPingTime }));
      }
    }, 2000);
  }

  private updateStatus(newStatus: WebSocketStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((l) => l(newStatus));
  }

  sendInput(data: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  onLatency(listener: LatencyListener) {
    this.latencyListeners.add(listener);
    return () => {
      this.latencyListeners.delete(listener);
    };
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }
}

export const wsService = new WebSocketService();
