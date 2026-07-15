import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Download, ShieldAlert, PlusCircle, History, X, Undo2 } from 'lucide-react';

interface Person {
  id: number;
  name: string;
  status: string;
}

interface LedgerEntry {
  id: string;
  type: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  converted_amount: number;
  from_person_id: number;
  to_person_id: number;
  transaction_type: string;
  running_balance: number;
  notes?: string;
  status: string;
}

interface VersionRecord {
  id: number;
  version_number: number;
  amount: number;
  currency: string;
  description: string;
  change_reason: string;
  created_at: string;
}

export const Ledger: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPersonId = searchParams.get('personId');

  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(initialPersonId || '');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [runningBalance, setRunningBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Replay Slider State
  const [replayIndex, setReplayIndex] = useState<number>(0);

  // Versions Modal State
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Settlement Form State
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleMethod, setSettleMethod] = useState('cash');

  useEffect(() => {
    fetchPeople();
  }, []);

  useEffect(() => {
    if (selectedPersonId) {
      fetchLedger(selectedPersonId);
      setSearchParams({ personId: selectedPersonId });
    }
  }, [selectedPersonId]);

  const fetchPeople = async () => {
    try {
      const res = await api.get('/people/');
      const filtered = res.data.filter((p: any) => p.name !== 'You');
      setPeople(filtered);
      if (filtered.length > 0 && !selectedPersonId) {
        setSelectedPersonId(filtered[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async (personId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/people/${personId}/ledger`);
      // Sort oldest to newest for chronological replay slider
      const sorted = res.data.ledger.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setLedgerEntries(sorted);
      setReplayIndex(sorted.length); // default to show all
      setRunningBalance(res.data.running_balance);
      setSettleAmount(Math.abs(res.data.running_balance));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || settleAmount <= 0) return;
    try {
      const isWeOweThem = runningBalance < 0;
      
      const peopleRes = await api.get('/people/');
      const selfPerson = peopleRes.data.find((p: any) => p.name === 'You');
      if (!selfPerson) return;
      
      const fromId = isWeOweThem ? selfPerson.id : parseInt(selectedPersonId);
      const toId = isWeOweThem ? parseInt(selectedPersonId) : selfPerson.id;

      await api.post('/settlements/', {
        from_person_id: fromId,
        to_person_id: toId,
        amount: settleAmount,
        currency: 'INR',
        payment_method: settleMethod
      });

      alert('Settlement recorded successfully!');
      setShowSettleForm(false);
      fetchLedger(selectedPersonId);
    } catch (err) {
      console.error(err);
      alert('Failed to record settlement');
    }
  };

  const handleExport = (format: string) => {
    if (!selectedPersonId) return;
    const downloadUrl = `${api.defaults.baseURL}/reports/ledger/${selectedPersonId}/export?format=${format}`;
    
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
      a.download = `ledger_${selectedPersonId}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => console.error('Export failed', err));
  };

  const handleOpenVersions = async (activityId: string) => {
    const numericId = parseInt(activityId.split('_')[1] || activityId);
    if (isNaN(numericId)) return;
    
    setSelectedTxId(numericId);
    setVersionsModalOpen(true);
    setVersionsLoading(true);
    try {
      const res = await api.get(`/transactions/${numericId}/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestoreVersion = async (versionNum: number) => {
    if (!selectedTxId) return;
    if (!window.confirm(`Restore transaction to version ${versionNum}?`)) return;
    try {
      await api.post(`/transactions/${selectedTxId}/versions/${versionNum}/restore`);
      alert('Transaction state restored successfully!');
      setVersionsModalOpen(false);
      fetchLedger(selectedPersonId);
    } catch (err) {
      console.error(err);
      alert('Failed to restore version');
    }
  };

  // Replay calculation: filter entries up to replay slider index
  const visibleEntries = ledgerEntries.slice(0, replayIndex);
  
  // Recalculate balance on the fly based on slider
  const replayedBalance = visibleEntries.reduce((acc, curr) => {
    const isCredit = curr.from_person_id === 1; // "You" lent them -> positive running balance
    return acc + (isCredit ? curr.converted_amount : -curr.converted_amount);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pair Ledger</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track mutual debts and running balances with specific contacts.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400">Select Contact:</label>
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {people.length === 0 && <option value="">No contacts available</option>}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
        </div>
      ) : selectedPersonId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TIMELINE LIST */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Running Balance Card */}
            <div className="glass-panel p-6 rounded-3xl flex justify-between items-center bg-indigo-600/5 border-indigo-600/10">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  {replayIndex < ledgerEntries.length ? 'Historical Replay Balance' : 'Current Debt Status'}
                </span>
                <h3 className="text-2xl font-black mt-1">
                  {replayedBalance < -0.01 ? (
                    <span className="text-red-500 font-black">You owe them ₹{Math.abs(replayedBalance).toFixed(2)}</span>
                  ) : replayedBalance > 0.01 ? (
                    <span className="text-emerald-500 font-black">They owe you ₹{replayedBalance.toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-400">You are completely settled up!</span>
                  )}
                </h3>
              </div>
              {replayedBalance !== 0 && replayIndex === ledgerEntries.length && (
                <button
                  onClick={() => setShowSettleForm(!showSettleForm)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg active:scale-95"
                >
                  <PlusCircle size={14} />
                  Record Settlement
                </button>
              )}
            </div>

            {/* REPLAY SLIDER WIDGET */}
            {ledgerEntries.length > 1 && (
              <div className="glass-panel p-5 rounded-3xl space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Ledger History Replay Slider</span>
                  <span className="px-2 py-0.5 bg-indigo-600/10 text-indigo-600 rounded-full text-[10px]">
                    Showing {replayIndex} of {ledgerEntries.length} transactions
                  </span>
                </div>
                
                <input
                  type="range"
                  min={1}
                  max={ledgerEntries.length}
                  value={replayIndex}
                  onChange={(e) => setReplayIndex(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                
                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                  <span>First entry ({new Date(ledgerEntries[0].date).toLocaleDateString()})</span>
                  <span>Latest entry ({new Date(ledgerEntries[ledgerEntries.length - 1].date).toLocaleDateString()})</span>
                </div>
              </div>
            )}

            {showSettleForm && (
              <form onSubmit={handleRecordSettlement} className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="font-bold text-xs">Record Settlement Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(parseFloat(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Payment Method</label>
                    <select
                      value={settleMethod}
                      onChange={(e) => setSettleMethod(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / Netbanking</option>
                      <option value="card">Card Payment</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs">
                  <button type="button" onClick={() => setShowSettleForm(false)} className="px-3 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md shadow-indigo-600/20">Submit Payment</button>
                </div>
              </form>
            )}

            {/* TIMELINE LIST */}
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="font-bold text-sm mb-6">Running Transaction History</h3>
              <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
                {visibleEntries.map((entry) => (
                  <div key={entry.id} className="relative group">
                    <div className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full bg-white dark:bg-slate-950 border-2 border-indigo-600 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(entry.date).toLocaleDateString()} • {entry.type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">{entry.description}</h4>
                        {entry.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">{entry.notes}</p>}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 md:mt-0 text-right">
                        <div>
                          <div className="font-black text-xs">
                            {entry.from_person_id === 1 ? (
                              <span className="text-emerald-500">+₹{entry.converted_amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-red-500">-₹{entry.converted_amount.toFixed(2)}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Balance: ₹{entry.running_balance.toFixed(2)}</span>
                        </div>
                        
                        {/* Edit History Version Action */}
                        <button
                          onClick={() => handleOpenVersions(entry.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                          title="View Edit Version Control logs"
                        >
                          <History size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleEntries.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs pl-0 border-none">No transaction history between you.</div>
                )}
              </div>
            </div>
          </div>

          {/* EXPORTS & SETTINGS PANEL */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="font-bold text-sm mb-4">Export Ledger Reports</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">Download structured PDF invoices, detailed Excel spreadsheets, or clean CSV dumps of this contact's history.</p>
              
              <div className="space-y-2.5">
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex w-full items-center justify-between px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all font-semibold text-xs text-left"
                >
                  Download PDF Report
                  <Download size={14} />
                </button>
                
                <button
                  onClick={() => handleExport('excel')}
                  className="flex w-full items-center justify-between px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all font-semibold text-xs text-left"
                >
                  Download Excel Sheet
                  <Download size={14} />
                </button>

                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center justify-between px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all font-semibold text-xs text-left"
                >
                  Download CSV Log
                  <Download size={14} />
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl bg-indigo-600/5 border-indigo-600/10">
              <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                <ShieldAlert size={16} />
                Security Audit
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-relaxed">This ledger has soft delete checks, historical record hashing, double entry verification, and cannot be modified without reversing logs.</p>
            </div>
          </div>
        </div>
      )}

      {/* VERSION CONTROL DETAIL MODAL */}
      {versionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVersionsModalOpen(false)} />
          <div className="relative w-full max-w-2xl h-[70vh] bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 flex flex-col space-y-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-xs font-semibold">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History size={18} className="text-indigo-500" />
                Transaction Version Audit Trail
              </h2>
              <button onClick={() => setVersionsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {versionsLoading ? (
              <div className="flex-grow flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {versions.map((ver) => (
                  <div key={ver.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-600/10 text-indigo-500 font-bold rounded-full text-[9px]">
                          V{ver.version_number}
                        </span>
                        <h4 className="font-bold text-xs text-slate-200">{ver.description}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Amount: {ver.currency} {ver.amount.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Reason: {ver.change_reason || 'Not specified'} • {new Date(ver.created_at).toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => handleRestoreVersion(ver.version_number)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-md"
                    >
                      <Undo2 size={12} />
                      Restore
                    </button>
                  </div>
                ))}
                {versions.length === 0 && (
                  <div className="text-center py-12 text-slate-400">This transaction has not been updated yet (showing version 1).</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
