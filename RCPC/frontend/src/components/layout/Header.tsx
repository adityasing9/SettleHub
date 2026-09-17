import React from 'react';
import { Wifi, Radio, Shield, Usb, Bluetooth, Settings as SettingsIcon, Link2, Laptop } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TransportType } from '../../types';

export const Header: React.FC = () => {
  const {
    status,
    systemInfo,
    activeTransport,
    transportState,
    setIsSettingsModalOpen,
    setIsPairingModalOpen,
    pairedDevice
  } = useApp();

  const getTransportIcon = (type: TransportType) => {
    switch (type) {
      case 'wifi':
        return <Wifi className="w-3.5 h-3.5" />;
      case 'hotspot':
        return <Radio className="w-3.5 h-3.5" />;
      case 'tailscale':
        return <Shield className="w-3.5 h-3.5" />;
      case 'usb':
        return <Usb className="w-3.5 h-3.5" />;
      case 'bluetooth':
        return <Bluetooth className="w-3.5 h-3.5" />;
    }
  };

  const statusColors = {
    connected: 'bg-emerald-500 shadow-emerald-500/50',
    connecting: 'bg-amber-500 shadow-amber-500/50 animate-pulse',
    offline: 'bg-rose-500 shadow-rose-500/50',
  };

  const statusLabels = {
    connected: 'Online',
    connecting: 'Connecting...',
    offline: 'Offline',
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-dark-950/80 backdrop-blur-md border-b border-dark-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Laptop Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-dark-900 border border-dark-700 shadow-inner">
            <Laptop className="w-5 h-5 text-brand-primary" />
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-dark-950 shadow-sm ${statusColors[status]}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                RCPC
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  v1.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
              {systemInfo?.hostname ? systemInfo.hostname : 'Windows PC'}
              <span className="text-slate-600">•</span>
              <span className={status === 'connected' ? 'text-emerald-400' : 'text-slate-400'}>
                {statusLabels[status]}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Transport Badge & Actions */}
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-dark-900 border border-dark-700 text-xs font-mono text-slate-300">
              <span className="text-brand-primary flex items-center gap-1">
                {getTransportIcon(activeTransport)}
                <span className="capitalize">{activeTransport}</span>
              </span>
              {transportState.latencyMs > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400">{transportState.latencyMs}ms</span>
                </>
              )}
            </div>
          )}

          {!pairedDevice && (
            <button
              onClick={() => setIsPairingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-dark-950 text-xs font-semibold hover:bg-cyan-400 transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
            >
              <Link2 className="w-3.5 h-3.5" />
              Pair PC
            </button>
          )}

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-slate-300 hover:text-white transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
