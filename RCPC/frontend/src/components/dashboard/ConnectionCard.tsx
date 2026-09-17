import React from 'react';
import { Wifi, Radio, Shield, Usb, Bluetooth, RefreshCw, Laptop, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TransportType } from '../../types';

export const ConnectionCard: React.FC = () => {
  const {
    status,
    systemInfo,
    activeTransport,
    transportState,
    switchTransport,
    refreshSystemInfo
  } = useApp();

  const getTransportIcon = (type: TransportType) => {
    switch (type) {
      case 'wifi':
        return <Wifi className="w-4 h-4" />;
      case 'hotspot':
        return <Radio className="w-4 h-4" />;
      case 'tailscale':
        return <Shield className="w-4 h-4" />;
      case 'usb':
        return <Usb className="w-4 h-4" />;
      case 'bluetooth':
        return <Bluetooth className="w-4 h-4" />;
    }
  };

  const statusBadge = {
    connected: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', text: 'CONNECTED' },
    connecting: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-pulse', text: 'CONNECTING' },
    offline: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500', text: 'DISCONNECTED' },
  }[status];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-dark-900 border border-dark-700/80 p-5 shadow-xl">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-brand-primary/5 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-dark-800 border border-dark-700 text-brand-primary shadow-inner">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider border ${statusBadge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                {statusBadge.text}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1">
              {systemInfo?.hostname || 'Windows Laptop'}
            </h2>
          </div>
        </div>

        <button
          onClick={() => refreshSystemInfo()}
          className="p-2 rounded-xl bg-dark-800/80 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-all active:scale-95"
          title="Refresh connection status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Active Transport */}
        <div className="p-3 rounded-2xl bg-dark-950/70 border border-dark-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Transport
          </span>
          <div className="flex items-center gap-2 text-sm font-semibold text-white capitalize">
            <span className="text-brand-primary">{getTransportIcon(activeTransport)}</span>
            {activeTransport}
          </div>
        </div>

        {/* Latency */}
        <div className="p-3 rounded-2xl bg-dark-950/70 border border-dark-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Latency
          </span>
          <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
            <Activity className="w-4 h-4 text-emerald-400" />
            {transportState.latencyMs > 0 ? `${transportState.latencyMs} ms` : '< 5 ms'}
          </div>
        </div>

        {/* Operating System */}
        <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-dark-950/70 border border-dark-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Platform
          </span>
          <div className="text-sm font-semibold text-white truncate">
            {systemInfo ? `${systemInfo.os_name} ${systemInfo.os_release}` : 'Windows'}
          </div>
        </div>
      </div>

      {/* Transport Selection Pills */}
      {transportState.availableTransports && (
        <div className="mt-4 pt-4 border-t border-dark-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Available Transports
          </span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(transportState.availableTransports) as TransportType[]).map((t) => {
              const details = transportState.availableTransports![t];
              const isSelected = activeTransport === t;
              return (
                <button
                  key={t}
                  onClick={() => details.available && switchTransport(t)}
                  disabled={!details.available}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-primary text-dark-950 font-bold shadow-md shadow-brand-primary/20'
                      : details.available
                      ? 'bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700'
                      : 'bg-dark-950 text-slate-600 border border-dark-800 cursor-not-allowed'
                  }`}
                >
                  {getTransportIcon(t)}
                  <span className="capitalize">{details.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
