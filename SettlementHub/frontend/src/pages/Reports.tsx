import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Download, FileText, CheckCircle } from 'lucide-react';

interface Person {
  id: number;
  name: string;
}

export const Reports: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const res = await api.get('/people/');
      const filtered = res.data.filter((p: any) => p.name !== 'You');
      setPeople(filtered);
      if (filtered.length > 0) {
        setSelectedPersonId(filtered[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerExport = (personId: string, format: string) => {
    if (!personId) return;
    const downloadUrl = `${api.defaults.baseURL}/reports/ledger/${personId}/export?format=${format}`;
    fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sh_token')}`
      }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger_report_${personId}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => console.error('Export failed', err));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Reports & Exports</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Export transaction logs and generate PDF ledger invoices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEDGER EXPORT CARD */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Contact Balance Ledger Report</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Download complete transaction timeline and running balance histories with a selected person.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Contact</label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
              >
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {people.length === 0 && <option value="">No contacts available</option>}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => triggerExport(selectedPersonId, 'pdf')}
                disabled={!selectedPersonId}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/10 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                <Download size={12} />
                Download PDF
              </button>
              <button
                onClick={() => triggerExport(selectedPersonId, 'excel')}
                disabled={!selectedPersonId}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-bold text-xs disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                <Download size={12} />
                Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* SECURITY & DATA PRESERVATION */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
            <h3 className="font-bold text-sm">Data Integrity Guarantee</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Every ledger entry undergoes automatic exchange rate validation based on historical data. Soft delete operations are logged under the audit system, and database state backups can be restored by the administrator at any time.
            </p>
          </div>
          
          <div className="text-[10px] text-slate-400 font-bold mt-4">
            Auditing compliant with double-entry ledgers.
          </div>
        </div>
      </div>
    </div>
  );
};
