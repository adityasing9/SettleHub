import React, { useState, useEffect } from 'react';
import { Radio, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import type { NetworkInterface, HotspotStatus } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

export const NetworkManager: React.FC = () => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [hotspot, setHotspot] = useState<HotspotStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [toggleWarningModal, setToggleWarningModal] = useState<boolean>(false);

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const [ifaces, hs] = await Promise.all([
        api.getInterfaces(),
        api.getHotspotStatus()
      ]);
      setInterfaces(ifaces);
      setHotspot(hs);
    } catch (e) {
      console.error('Failed to load network data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHotspot = async (confirmCarrierDisconnect: boolean = false) => {
    if (!hotspot) return;
    const targetState = !hotspot.is_enabled;

    if (!targetState && hotspot.is_client_connected_via_hotspot && !confirmCarrierDisconnect) {
      setToggleWarningModal(true);
      return;
    }

    try {
      const res = await api.toggleHotspot(targetState, confirmCarrierDisconnect);
      if (res.error_code === 'CARRIER_DISCONNECT_WARNING') {
        setToggleWarningModal(true);
        return;
      }
      loadNetworkData();
    } catch (e) {
      console.error('Failed to toggle hotspot', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile Hotspot Control Card */}
      <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${hotspot?.is_enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-dark-950 text-slate-500 border-dark-800'}`}>
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Windows Mobile Hotspot</h3>
              <p className="text-xs text-slate-400">Share PC internet and direct tethering</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleHotspot(false)}
              disabled={loading || !hotspot?.supported}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                hotspot?.is_enabled
                  ? 'bg-emerald-500 text-dark-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-dark-800 text-slate-300 hover:bg-dark-700 border border-dark-700'
              }`}
            >
              {hotspot?.is_enabled ? 'Turn OFF' : 'Turn ON'}
            </button>
          </div>
        </div>

        {hotspot && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                State
              </span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {hotspot.is_enabled ? '🟢 Active (Broadcasting)' : '⚪ Inactive'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-dark-950 border border-dark-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Connected Clients
              </span>
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-primary" />
                {hotspot.client_count} devices
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-dark-950 border border-dark-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Carrier Interface
              </span>
              <span className="text-xs font-mono text-slate-200">
                {hotspot.is_client_connected_via_hotspot ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> This Phone is on Hotspot
                  </span>
                ) : (
                  'Separate Network'
                )}
              </span>
            </div>
          </div>
        )}

        {hotspot?.is_client_connected_via_hotspot && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your phone is currently connected to this PC via its Hotspot. Disabling it will terminate your active RCPC session.
            </span>
          </div>
        )}
      </div>

      {/* Network Adapters List */}
      <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Network Adapters & IP Addresses
          </h3>
          <button
            onClick={loadNetworkData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {interfaces.map((iface) => (
            <div
              key={iface.name}
              className="p-4 rounded-2xl bg-dark-950 border border-dark-800/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${iface.is_up ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="text-xs font-bold text-white">{iface.name}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-dark-900 text-slate-400 border border-dark-800">
                    {iface.type}
                  </span>
                </div>
                {iface.speed_mbps > 0 && (
                  <span className="text-xs text-slate-400 font-mono">
                    {iface.speed_mbps} Mbps
                  </span>
                )}
              </div>

              {/* Wi-Fi Details */}
              {iface.wifi_details && (
                <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-300 pt-1">
                  {iface.wifi_details.ssid && (
                    <div>SSID: <span className="text-brand-primary font-bold">{iface.wifi_details.ssid}</span></div>
                  )}
                  {iface.wifi_details.signal && (
                    <div>Signal: <span className="text-emerald-400 font-bold">{iface.wifi_details.signal}</span></div>
                  )}
                  {iface.wifi_details.radio_type && (
                    <div className="text-slate-500">{iface.wifi_details.radio_type}</div>
                  )}
                </div>
              )}

              {/* IPv4 List */}
              {iface.ipv4.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {iface.ipv4.map((ip) => (
                    <span
                      key={ip}
                      className="text-xs font-mono px-2 py-0.5 rounded-lg bg-dark-900 border border-dark-700 text-slate-200"
                    >
                      IPv4: {ip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Warning Confirmation Modal */}
      <ConfirmModal
        isOpen={toggleWarningModal}
        title="Warning: Disconnecting Active Hotspot"
        message="Your phone is communicating with this laptop through the Hotspot you are trying to turn off. If you proceed, the connection will drop immediately."
        confirmLabel="Turn Off Anyway"
        isDangerous={true}
        onConfirm={() => {
          setToggleWarningModal(false);
          handleToggleHotspot(true);
        }}
        onCancel={() => setToggleWarningModal(false)}
      />
    </div>
  );
};
