import React from 'react';
import { Cpu, Server, Battery, BatteryCharging, HardDrive, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SystemMetrics: React.FC = () => {
  const { telemetry } = useApp();

  if (!telemetry) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-dark-900/60 border border-dark-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const { cpu, memory, battery, disks, gpu } = telemetry;
  const primaryDisk = disks && disks.length > 0 ? disks[0] : null;

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* CPU Card */}
        <div className="rounded-3xl bg-dark-900 border border-dark-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              CPU
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-brand-primary">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">{cpu.percent}%</span>
            {cpu.frequency_mhz && (
              <span className="text-[11px] text-slate-500 font-mono">
                {(cpu.frequency_mhz / 1000).toFixed(1)} GHz
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                cpu.percent > 85 ? 'bg-red-500' : cpu.percent > 60 ? 'bg-amber-500' : 'bg-brand-primary'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, cpu.percent))}%` }}
            />
          </div>
        </div>

        {/* RAM Card */}
        <div className="rounded-3xl bg-dark-900 border border-dark-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              RAM
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-brand-accent">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">{memory.percent}%</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {formatBytes(memory.used)} / {formatBytes(memory.total)}
            </span>
          </div>
          <div className="mt-3 w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                memory.percent > 85 ? 'bg-red-500' : memory.percent > 65 ? 'bg-amber-500' : 'bg-brand-accent'
              }`}
              style={{ width: `${memory.percent}%` }}
            />
          </div>
        </div>

        {/* Storage Card */}
        <div className="rounded-3xl bg-dark-900 border border-dark-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Storage {primaryDisk ? `(${primaryDisk.mountpoint})` : ''}
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              {primaryDisk ? `${primaryDisk.percent}%` : 'N/A'}
            </span>
            {primaryDisk && (
              <span className="text-[11px] text-slate-500 font-mono">
                {formatBytes(primaryDisk.free_bytes)} free
              </span>
            )}
          </div>
          <div className="mt-3 w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: primaryDisk ? `${primaryDisk.percent}%` : '0%' }}
            />
          </div>
        </div>

        {/* Battery Card */}
        <div className="rounded-3xl bg-dark-900 border border-dark-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Battery
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-brand-warning">
              {battery?.power_plugged ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <Battery className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              {battery ? `${Math.round(battery.percent)}%` : 'AC Power'}
            </span>
            {battery?.power_plugged && (
              <span className="text-[11px] text-emerald-400 font-mono">Charging</span>
            )}
          </div>
          <div className="mt-3 w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                battery && battery.percent < 20 ? 'bg-red-500' : 'bg-brand-warning'
              }`}
              style={{ width: battery ? `${battery.percent}%` : '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Optional GPU Card */}
      {gpu && (
        <div className="rounded-3xl bg-dark-900 border border-dark-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase font-mono">{gpu.name}</span>
              <div className="text-xs text-slate-400">
                Temp: {gpu.temperature_c}°C • VRAM: {gpu.memory_used_mb}MB / {gpu.memory_total_mb}MB
              </div>
            </div>
          </div>
          <span className="text-xl font-black font-mono text-brand-primary">{gpu.load_percent}%</span>
        </div>
      )}
    </div>
  );
};
