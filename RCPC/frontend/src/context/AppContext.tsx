import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  ConnectionStatus,
  PairedDevice,
  SystemInfo,
  TelemetryData,
  TransportType
} from '../types';
import { api, getStoredToken, clearStoredAuth, setStoredToken } from '../services/api';
import { wsService } from '../services/websocket';
import type { WebSocketStatus } from '../services/websocket';
import { transportManager } from '../services/transportManager';
import type { TransportState } from '../services/transportManager';

interface AppContextType {
  status: ConnectionStatus;
  token: string | null;
  pairedDevice: PairedDevice | null;
  systemInfo: SystemInfo | null;
  telemetry: TelemetryData | null;
  transportState: TransportState;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPairingModalOpen: boolean;
  setIsPairingModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  activeTransport: TransportType;
  switchTransport: (t: TransportType) => void;
  pair: (code: string, deviceName: string) => Promise<boolean>;
  unpair: () => void;
  refreshSystemInfo: () => Promise<void>;
  notifications: string[];
  dismissNotification: (index: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [transportState, setTransportState] = useState<TransportState>(transportManager.getState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const showNotification = useCallback((msg: string) => {
    setNotifications((prev) => [msg, ...prev.slice(0, 4)]);
  }, []);

  const dismissNotification = (idx: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== idx));
  };

  // Subscribe to transport state
  useEffect(() => {
    const unsub = transportManager.subscribe((state) => {
      setTransportState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  // Subscribe to WebSocket telemetry & connection status
  useEffect(() => {
    const unsubTele = wsService.onTelemetry((data) => {
      setTelemetry(data);
    });

    const unsubStatus = wsService.onStatus((wsStatus: WebSocketStatus) => {
      if (wsStatus === 'connected') {
        setStatus('connected');
      } else if (wsStatus === 'connecting') {
        setStatus('connecting');
      } else {
        setStatus('offline');
      }
    });

    return () => {
      unsubTele();
      unsubStatus();
    };
  }, []);

  const refreshSystemInfo = useCallback(async () => {
    if (!token) return;
    try {
      const info = await api.getSystemInfo();
      setSystemInfo(info);
      setStatus('connected');
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        clearStoredAuth();
        setToken(null);
        setPairedDevice(null);
        setIsPairingModalOpen(true);
      }
      setStatus('offline');
    }
  }, [token]);

  // Initial verification on load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setStatus('offline');
        setIsPairingModalOpen(true);
        return;
      }

      try {
        const verifyRes = await api.verifyToken();
        if (verifyRes.success && verifyRes.data?.device) {
          setPairedDevice(verifyRes.data.device);
          setToken(storedToken);
          wsService.connect();
          transportManager.startPolling();
          refreshSystemInfo();
        } else {
          clearStoredAuth();
          setToken(null);
          setIsPairingModalOpen(true);
        }
      } catch (e) {
        console.warn('Initial verify failed', e);
        setIsPairingModalOpen(true);
      }
    };

    initAuth();

    return () => {
      wsService.disconnect();
      transportManager.stopPolling();
    };
  }, [refreshSystemInfo]);

  const pair = async (code: string, deviceName: string): Promise<boolean> => {
    try {
      const deviceId = 'rcpc-' + Math.random().toString(36).substring(2, 10);
      const res = await api.pairDevice(code, deviceId, deviceName || 'Mobile Client');
      if (res.success && res.data?.token) {
        setStoredToken(res.data.token);
        setToken(res.data.token);
        setPairedDevice(res.data.device);
        setIsPairingModalOpen(false);
        wsService.connect();
        transportManager.startPolling();
        refreshSystemInfo();
        showNotification('Connected and paired successfully');
        return true;
      }
      return false;
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to pair device';
      showNotification(msg);
      return false;
    }
  };

  const unpair = () => {
    if (pairedDevice) {
      api.revokeDevice(pairedDevice.device_id).catch(() => {});
    }
    clearStoredAuth();
    wsService.disconnect();
    setToken(null);
    setPairedDevice(null);
    setSystemInfo(null);
    setTelemetry(null);
    setStatus('offline');
    setIsPairingModalOpen(true);
  };

  const switchTransport = (t: TransportType) => {
    transportManager.switchTransport(t);
  };

  return (
    <AppContext.Provider
      value={{
        status,
        token,
        pairedDevice,
        systemInfo,
        telemetry,
        transportState,
        activeTab,
        setActiveTab,
        isPairingModalOpen,
        setIsPairingModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        activeTransport: transportState.activeTransport,
        switchTransport,
        pair,
        unpair,
        refreshSystemInfo,
        notifications,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
