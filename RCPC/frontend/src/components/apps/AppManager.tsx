import React, { useState, useEffect } from 'react';
import { Play, Search, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import type { AllowlistedApp, ProcessEntry } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

export const AppManager: React.FC = () => {
  const [apps, setApps] = useState<AllowlistedApp[]>([]);
  const [processes, setProcesses] = useState<ProcessEntry[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [killTarget, setKillTarget] = useState<ProcessEntry | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appList, procList] = await Promise.all([
        api.getAllowlistedApps(),
        api.getProcesses()
      ]);
      setApps(appList);
      setProcesses(procList);
    } catch (e) {
      console.error('Failed to load apps & processes', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (appName: string) => {
    try {
      await api.launchApp(appName);
      setTimeout(() => loadData(), 1000);
    } catch (e) {
      console.error('Launch failed', e);
    }
  };

  const handleTerminate = async () => {
    if (!killTarget) return;
    try {
      await api.terminateProcess(killTarget.pid);
      setKillTarget(null);
      loadData();
    } catch (e) {
      console.error('Terminate failed', e);
    }
  };

  const filteredProcesses = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.pid.toString().includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Authorized Applications Launcher */}
      <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Authorized Application Launcher
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {apps.map((app) => (
            <button
              key={app.name}
              onClick={() => handleLaunch(app.name)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-dark-950 hover:bg-dark-800 border border-dark-800 text-slate-200 hover:text-white transition-all active:scale-95 group text-left"
            >
              <div className="truncate">
                <span className="text-xs font-bold block truncate">{app.name}</span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {app.command}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary group-hover:text-dark-950 transition-colors shrink-0 ml-2">
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Running Processes Table */}
      <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Processes ({filteredProcesses.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or PID..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white border border-dark-800"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[450px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-950 text-slate-500 font-mono uppercase text-[10px] sticky top-0">
              <tr>
                <th className="px-3 py-2 rounded-l-lg">Process</th>
                <th className="px-3 py-2">PID</th>
                <th className="px-3 py-2">CPU</th>
                <th className="px-3 py-2">Memory</th>
                <th className="px-3 py-2 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/50">
              {filteredProcesses.map((proc) => (
                <tr key={proc.pid} className="hover:bg-dark-950/60 font-mono">
                  <td className="px-3 py-2 text-slate-200 font-medium truncate max-w-[150px]">
                    {proc.name}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{proc.pid}</td>
                  <td className="px-3 py-2 text-slate-400">{proc.cpu_percent}%</td>
                  <td className="px-3 py-2 text-slate-400">{proc.memory_percent}%</td>
                  <td className="px-3 py-2 text-right">
                    {!proc.is_protected ? (
                      <button
                        onClick={() => setKillTarget(proc)}
                        className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] transition-colors"
                      >
                        End
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kill Process Confirmation Modal */}
      <ConfirmModal
        isOpen={killTarget !== null}
        title="Terminate Process?"
        message={`Are you sure you want to end process "${killTarget?.name}" (PID: ${killTarget?.pid})?`}
        confirmLabel="Terminate"
        isDangerous={true}
        onConfirm={handleTerminate}
        onCancel={() => setKillTarget(null)}
      />
    </div>
  );
};
