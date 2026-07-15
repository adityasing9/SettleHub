import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ArrowUpRight, ArrowDownLeft, Wallet, RefreshCcw, Sparkles,
  ShieldAlert, Settings, Check, X, ArrowRight, Activity, TrendingUp
} from 'lucide-react';

interface SummaryData {
  id: number;
  name: string;
  total_borrowed: number;
  total_lent: number;
  current_balance: number;
  status: string;
  email?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  from_person_name: string;
  to_person_name: string;
  transaction_type: string;
  status: string;
  undo_of_transaction_id?: number;
}

interface SuggestedPayment {
  id: number;
  from_person_id: number;
  from_person_name: string;
  to_person_id: number;
  to_person_name: string;
  amount: number;
  currency: string;
  status: string;
  explanation: string;
}

interface FraudLog {
  id: number;
  entity_type: string;
  entity_id: number;
  fraud_score: number;
  reasons_json: string;
}

interface PredictionData {
  predicted_monthly: number;
  predicted_yearly: number;
  confidence_percentage: number;
  currency: string;
  category_predictions: Record<string, number>;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#eab308', '#22c55e', '#3b82f6'];

export const Dashboard: React.FC = () => {
  const [peopleSummaries, setPeopleSummaries] = useState<SummaryData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('₹');

  // Metrics
  const [totalLent, setTotalLent] = useState(0);
  const [totalBorrowed, setTotalBorrowed] = useState(0);

  // Suggestions & Fraud logs
  const [suggestions, setSuggestions] = useState<SuggestedPayment[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([]);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);

  // Modals & Panels Toggles
  const [showConfig, setShowConfig] = useState(false);
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [flowData, setFlowData] = useState<any | null>(null);
  const [flowLoading, setFlowLoading] = useState(false);

  // AI Summary Panel
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Widget visibility layout configs
  const [widgets, setWidgets] = useState<string[]>(['stats', 'cashflow', 'categories', 'predictions', 'suggestions', 'outstanding', 'recent']);

  useEffect(() => {
    // Load local widget layout configuration if present
    const saved = localStorage.getItem('sh_dashboard_widgets');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch {}
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Summaries
      const peopleRes = await api.get('/people/summary');
      setPeopleSummaries(peopleRes.data);

      let lent = 0;
      let borrowed = 0;
      peopleRes.data.forEach((p: SummaryData) => {
        if (p.current_balance > 0) {
          lent += p.current_balance;
        } else {
          borrowed += Math.abs(p.current_balance);
        }
      });
      setTotalLent(lent);
      setTotalBorrowed(borrowed);

      // 2. Recent activities
      const txRes = await api.get('/transactions');
      const sortedTxs = txRes.data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(sortedTxs.slice(0, 5));

      // 3. Suggestions
      const suggestionsRes = await api.get('/settlements/suggestions');
      setSuggestions(suggestionsRes.data);

      // 4. Fraud alerts
      const fraudRes = await api.get('/transactions/fraud/logs');
      setFraudLogs(fraudRes.data);

      // 5. Predictions
      const predRes = await api.get('/ai/predict');
      setPredictions(predRes.data);

      // Currency
      const settingsRes = await api.get('/settings/preferences');
      if (settingsRes.data.default_currency === 'USD') setCurrency('$');
      else if (settingsRes.data.default_currency === 'EUR') setCurrency('€');
      else if (settingsRes.data.default_currency === 'GBP') setCurrency('£');
      else setCurrency('₹');

    } catch (err) {
      console.error('Error loading dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await api.get('/ai/summary');
      setAiSummary(res.data.summary);
    } catch (err) {
      console.error(err);
      setAiSummary('Failed to generate AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUndo = async (activityId: string) => {
    const id = activityId.split('_')[1] || activityId;
    try {
      await api.post(`/transactions/${id}/undo`);
      alert('Transaction reversed successfully!');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to undo transaction');
    }
  };

  const handleSuggestionAction = async (id: number, action: 'accept' | 'reject') => {
    try {
      await api.post(`/settlements/suggestions/${id}/action?action=${action}`);
      alert(`Suggestion ${action}ed successfully!`);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert('Action failed');
    }
  };

  const handleDismissFraud = async (id: number) => {
    try {
      await api.post(`/transactions/fraud/logs/${id}/dismiss`);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const loadDetailedFlow = async () => {
    setFlowLoading(true);
    setFlowModalOpen(true);
    try {
      const res = await api.get('/settlements/calculate-flow');
      setFlowData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFlowLoading(false);
    }
  };

  const toggleWidget = (name: string) => {
    const next = widgets.includes(name) ? widgets.filter(w => w !== name) : [...widgets, name];
    setWidgets(next);
    localStorage.setItem('sh_dashboard_widgets', JSON.stringify(next));
  };

  const moveWidgetUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...widgets];
    const temp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = temp;
    setWidgets(next);
    localStorage.setItem('sh_dashboard_widgets', JSON.stringify(next));
  };

  const monthlyTrendData = [
    { name: 'Jan', Spent: 2400, Received: 1400 },
    { name: 'Feb', Spent: 1398, Received: 2210 },
    { name: 'Mar', Spent: 9800, Received: 2290 },
    { name: 'Apr', Spent: 3908, Received: 2000 },
    { name: 'May', Spent: 4800, Received: 2181 },
    { name: 'Jun', Spent: 3800, Received: 2500 },
    { name: 'Jul', Spent: 4300, Received: 2100 },
  ];

  const categoryDistributionData = [
    { name: 'Food', value: 400 },
    { name: 'Travel', value: 300 },
    { name: 'Fuel', value: 150 },
    { name: 'Bills', value: 600 },
    { name: 'Entertainment', value: 200 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FRAUD ALERTS NOTIFIER */}
      {fraudLogs.length > 0 && (
        <div className="space-y-2">
          {fraudLogs.map((log) => {
            const reasons: string[] = JSON.parse(log.reasons_json);
            return (
              <div key={log.id} className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-red-500 shrink-0" size={16} />
                  <div>
                    <span className="font-bold">Fraud Alert: Score {log.fraud_score.toFixed(0)}%</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{reasons.join(', ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissFraud(log.id)}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-lg text-[10px] font-bold"
                >
                  Dismiss
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time overview of your lending and borrowing metrics.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2.5 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900"
            title="Configure Dashboard Widgets"
          >
            <Settings size={16} />
          </button>
          
          <button
            onClick={loadDetailedFlow}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 text-xs font-bold"
          >
            <Activity size={14} />
            Settle Flow Chart
          </button>

          <button
            onClick={handleGenerateAiSummary}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all duration-200"
          >
            <Sparkles size={14} />
            {aiLoading ? 'Asking AI...' : 'Ask AI summary'}
          </button>
        </div>
      </div>

      {/* WIDGET REARRANGEMENT PANEL */}
      {showConfig && (
        <div className="glass-panel p-5 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-xs">Rearrange / Toggle Widgets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'stats', label: 'Stats Counters' },
              { id: 'cashflow', label: 'Cash Flow Chart' },
              { id: 'categories', label: 'Expense Distribution' },
              { id: 'predictions', label: 'AI Spend Predictions' },
              { id: 'suggestions', label: 'Settlement Suggestions' },
              { id: 'outstanding', label: 'Outstanding Balances' },
              { id: 'recent', label: 'Recent Ledger Logs' }
            ].map((w) => (
              <div key={w.id} className="flex items-center justify-between p-2.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-xl text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={widgets.includes(w.id)}
                    onChange={() => toggleWidget(w.id)}
                    className="rounded text-indigo-600"
                  />
                  {w.label}
                </label>
                {widgets.includes(w.id) && (
                  <button
                    onClick={() => moveWidgetUp(widgets.indexOf(w.id))}
                    className="text-[10px] text-indigo-500 font-bold hover:underline"
                  >
                    Up
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI SUMMARY PANEL */}
      {aiSummary && (
        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/10 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles size={16} />
            AI Monthly Insights
          </div>
          <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
            {aiSummary}
          </div>
        </div>
      )}

      {/* DYNAMIC WIDGETS DISPLAY IN LAYOUT ORDER */}
      {widgets.map((widgetId) => {
        if (widgetId === 'stats') {
          return (
            <div key="stats" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-xs font-semibold">Total Lent (People owe you)</span>
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{currency}{totalLent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              </div>

              <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-xs font-semibold">Total Borrowed (You owe people)</span>
                  <div className="h-9 w-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <ArrowDownLeft size={18} />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-red-500 dark:text-red-400">{currency}{totalBorrowed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              </div>

              <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-xs font-semibold">Net Balance</span>
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                </div>
                <h2 className={`text-3xl font-black ${(totalLent - totalBorrowed) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {currency}{(totalLent - totalBorrowed).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
          );
        }

        if (widgetId === 'cashflow') {
          return (
            <div key="cashflow" className="glass-panel p-6 rounded-3xl">
              <h3 className="font-bold text-sm mb-4">Lending / Borrowing Cash Flow</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData}>
                    <defs>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Spent" stroke="#818cf8" fillOpacity={1} fill="url(#colorSpent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Received" stroke="#34d399" fillOpacity={1} fill="url(#colorReceived)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        }

        if (widgetId === 'categories') {
          return (
            <div key="categories" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category Pie Chart */}
              <div className="md:col-span-2 glass-panel p-6 rounded-3xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm mb-4">Expense Categories</h3>
                  <div className="h-60 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center">
                      <span className="text-2xl font-black">₹1,450</span>
                      <p className="text-[10px] text-slate-400 font-bold">Total Expenses</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  {categoryDistributionData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-slate-500">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictions Card */}
              {predictions && (
                <div className="glass-panel p-6 rounded-3xl space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-indigo-600" />
                    AI Spending Predictions
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold">PROJECTED NEXT MONTH EXPENSE</span>
                      <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {predictions.currency} {predictions.predicted_monthly.toLocaleString()}
                      </h4>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold">PROJECTED YEARLY TOTAL</span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {predictions.currency} {predictions.predicted_yearly.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>CONFIDENCE RATE</span>
                        <span>{predictions.confidence_percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${predictions.confidence_percentage}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (widgetId === 'suggestions') {
          return (
            <div key="suggestions" className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="font-bold text-sm">Actionable Settlement Suggestions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.filter(s => s.status === 'pending').map((s) => (
                  <div key={s.id} className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl flex flex-col justify-between gap-3 group">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-red-500">{s.from_person_name}</span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="text-xs font-bold text-emerald-500">{s.to_person_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">{s.explanation}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                      <span className="font-black text-xs">₹{s.amount.toFixed(2)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSuggestionAction(s.id, 'reject')}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Reject Suggestion"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(s.id, 'accept')}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-md shadow-indigo-600/10"
                        >
                          <Check size={10} />
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {suggestions.filter(s => s.status === 'pending').length === 0 && (
                  <div className="col-span-full text-center py-6 text-slate-400 text-xs">No pending settlement suggestions.</div>
                )}
              </div>
            </div>
          );
        }

        if (widgetId === 'outstanding') {
          return (
            <div key="outstanding" className="glass-panel p-6 rounded-3xl">
              <h3 className="font-bold text-sm mb-4">Outstanding Balances</h3>
              <div className="space-y-4">
                {peopleSummaries
                  .filter((p) => p.current_balance !== 0)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                          {p.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs">{p.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{p.email || 'No email'}</span>
                        </div>
                      </div>
                      <span className={`font-black text-xs ${p.current_balance > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {p.current_balance > 0 ? `+${currency}${p.current_balance.toFixed(2)}` : `-${currency}${Math.abs(p.current_balance).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                {peopleSummaries.filter((p) => p.current_balance !== 0).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">All clear! No outstanding balances.</div>
                )}
              </div>
            </div>
          );
        }

        if (widgetId === 'recent') {
          return (
            <div key="recent" className="glass-panel p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Recent Ledger Activities</h3>
                <button onClick={fetchDashboardData} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 rounded-xl transition-all">
                  <RefreshCcw size={14} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/20 dark:border-slate-800/20 group hover:scale-[1.005] transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${act.transaction_type === 'settlement' ? 'bg-indigo-600/10 text-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                        {act.transaction_type === 'settlement' ? 'S' : 'TX'}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">{act.description}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {act.from_person_name} → {act.to_person_name} • {new Date(act.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-xs ${act.transaction_type === 'settlement' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        ₹{act.amount}
                      </span>
                      {act.status !== 'undone' && !act.undo_of_transaction_id && (
                        <button
                          onClick={() => handleUndo(act.id)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] bg-red-600 text-white font-bold px-2.5 py-1 rounded-lg shadow-md hover:bg-red-700 active:scale-95 transition-all duration-200"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">No transactions recorded yet.</div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* SETTLEMENT OPTIMIZATION FLOW CHART MODAL */}
      {flowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFlowModalOpen(false)} />
          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 flex flex-col space-y-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity size={20} className="text-indigo-500" />
                Smart Settlement Optimization Flow
              </h2>
              <button onClick={() => setFlowModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            {flowLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
              </div>
            ) : flowData ? (
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-xs font-semibold">
                
                {/* 1. DEBT MATRIX GRID */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pairwise Direct Debt Matrix</h3>
                  <div className="overflow-x-auto border border-slate-850 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-850 text-[10px] text-slate-400">
                          <th className="px-4 py-3">Ower \ Owes To</th>
                          {flowData.nodes.map((n: any) => (
                            <th key={n.id} className="px-4 py-3">{n.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {flowData.debt_matrix.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-950/20">
                            <td className="px-4 py-3 font-bold text-slate-300 bg-slate-950/20">{row.person_name}</td>
                            {flowData.nodes.map((n: any) => {
                              const val = row[n.name] || 0;
                              return (
                                <td key={n.id} className={`px-4 py-3 ${val > 0 ? 'text-red-400 font-bold bg-red-500/5' : 'text-slate-500'}`}>
                                  {val > 0 ? `₹${val.toFixed(2)}` : '0.00'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. CIRCULAR CYCLES IN REVOLVING LOANS */}
                {flowData.cycles.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <h4 className="font-bold text-xs text-amber-500 flex items-center gap-1">
                      <ShieldAlert size={14} />
                      Revolving Circular Borrowing Cycles Detected & Optimized Out
                    </h4>
                    <p className="text-[10px] text-slate-400">The following debt loops were detected in the direct transaction graph and have been completely simplified out to minimize transfers:</p>
                    <div className="space-y-1">
                      {flowData.cycles.map((c: any, idx: number) => (
                        <div key={idx} className="text-[10px] font-mono text-amber-200">
                          Cycle {idx + 1}: {c.join(' ➔ ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ORIGINAL DIRECT RELATIONSHIPS */}
                  <div className="glass-panel p-5 rounded-2xl space-y-3">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Original Direct Transfers Graph</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {flowData.original_edges.map((e: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/20 border border-slate-850 rounded-xl">
                          <span>{e.from_person_name} owes {e.to_person_name}</span>
                          <span className="font-black text-red-400">₹{e.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FINAL SUGGESTIONS */}
                  <div className="glass-panel p-5 rounded-2xl space-y-3">
                    <h4 className="font-bold text-xs text-indigo-400 uppercase tracking-wider">Final Minimized Transfers Graph</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {flowData.optimized_payments.map((e: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                          <span>{e.from_person_name} pays {e.to_person_name}</span>
                          <span className="font-black text-emerald-400">₹{e.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. STEP BY STEP EXPLANATION */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optimization Steps Explanation</h3>
                  <div className="space-y-3">
                    {flowData.steps.map((step: any) => (
                      <div key={step.step} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-1.5">
                        <div className="font-bold text-indigo-400 text-xs">{step.description}</div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{step.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">Failed to load detailed optimization flow.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
