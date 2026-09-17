import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Filter, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import type { AuditEntry } from '../../types';

export const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const entries = await api.getActivityLogs(100);
      setLogs(entries);
    } catch (e) {
      console.error('Failed to load logs', e);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> OK
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> BLOCKED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> ERR
          </span>
        );
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(filter.toLowerCase()) ||
      l.device_name.toLowerCase().includes(filter.toLowerCase()) ||
      (l.transport && l.transport.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="rounded-3xl bg-dark-900 border border-dark-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Security & Command Audit Trail
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
            />
          </div>
          <button
            onClick={loadLogs}
            className="p-2 rounded-xl bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white border border-dark-800"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[550px] overflow-y-auto">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((entry, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-dark-950 border border-dark-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-200 font-bold">{entry.action}</span>
                  {getResultBadge(entry.result)}
                  <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-dark-900 border border-dark-800">
                    {entry.transport || 'local'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Device: {entry.device_name} ({entry.device_id.substring(0, 10)})
                  {entry.error && (
                    <span className="text-red-400 ml-2 block sm:inline">Error: {entry.error}</span>
                  )}
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString()} •{' '}
                {new Date(entry.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No audit log entries found
          </div>
        )}
      </div>
    </div>
  );
};
