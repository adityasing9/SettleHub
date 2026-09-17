import React, { useState, useEffect } from 'react';
import { X, Laptop, LogOut, Trash2, ArrowUp, ArrowDown, RefreshCw, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, getDefaultServerUrl } from '../../services/api';
import { transportManager } from '../../services/transportManager';
import type { PairedDevice, TransportType } from '../../types';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    pairedDevice,
    systemInfo,
    unpair,
    refreshSystemInfo
  } = useApp();

  const [serverUrl, setServerUrl] = useState<string>(getDefaultServerUrl());
  const [deviceList, setDeviceList] = useState<PairedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);
  const [transportPriority, setTransportPriority] = useState<TransportType[]>(
    transportManager.getState().priority
  );

  useEffect(() => {
    if (isSettingsModalOpen && pairedDevice) {
      loadDevices();
    }
  }, [isSettingsModalOpen, pairedDevice]);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const devices = await api.getDevices();
      setDeviceList(devices);
    } catch (e) {
      console.error('Failed to load devices', e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    try {
      await api.revokeDevice(deviceId);
      loadDevices();
    } catch (e) {
      console.error('Revoke failed', e);
    }
  };

  const movePriority = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= transportPriority.length) return;
    const copy = [...transportPriority];
    const temp = copy[idx];
    copy[idx] = copy[nextIdx];
    copy[nextIdx] = temp;
    setTransportPriority(copy);
    transportManager.setPriority(copy);
  };

  const handleSaveUrl = () => {
    api.updateBaseUrl(serverUrl);
    refreshSystemInfo();
  };

  if (!isSettingsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-dark-900 border border-dark-700 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">RCPC Settings</h2>
              <p className="text-xs text-slate-400">Device configuration & connectivity</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Host Endpoint */}
          <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Agent Host Endpoint
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-dark-900 border border-dark-700 text-slate-200 focus:outline-none focus:border-brand-primary"
              />
              <button
                onClick={handleSaveUrl}
                className="px-3 py-2 text-xs font-medium rounded-xl bg-brand-primary text-dark-950 font-semibold hover:bg-cyan-400 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* System Details */}
          {systemInfo && (
            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>OS:</span>
                <span className="text-slate-200">{systemInfo.os_name} {systemInfo.os_release} ({systemInfo.architecture})</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Processor:</span>
                <span className="text-slate-200 truncate max-w-[200px]">{systemInfo.processor}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Uptime:</span>
                <span className="text-slate-200">{systemInfo.uptime_formatted}</span>
              </div>
            </div>
          )}

          {/* Transport Priority Order */}
          <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Automatic Transport Priority
            </h3>
            <div className="space-y-2">
              {transportPriority.map((t, idx) => (
                <div
                  key={t}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-900 border border-dark-800 text-xs"
                >
                  <span className="font-mono text-slate-300 capitalize flex items-center gap-2">
                    <span className="w-4 text-slate-500 font-bold">{idx + 1}.</span>
                    {t}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePriority(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePriority(idx, 1)}
                      disabled={idx === transportPriority.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paired Devices Management */}
          {pairedDevice && (
            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Trusted Paired Devices
                </h3>
                <button
                  onClick={loadDevices}
                  className="text-slate-400 hover:text-white p-1"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {deviceList.map((d) => (
                  <div
                    key={d.device_id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-900 border border-dark-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 text-brand-primary shrink-0" />
                      <div>
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          {d.device_name}
                          {d.device_id === pairedDevice.device_id && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">This Device</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {d.device_id.substring(0, 10)}...
                        </div>
                      </div>
                    </div>
                    {d.device_id !== pairedDevice.device_id && (
                      <button
                        onClick={() => handleRevoke(d.device_id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Revoke device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone: Unpair */}
          {pairedDevice && (
            <div className="pt-2">
              <button
                onClick={() => {
                  unpair();
                  setIsSettingsModalOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Unpair & Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
