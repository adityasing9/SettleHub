import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash2, ShieldAlert, FolderHeart } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
}

interface Budget {
  id: number;
  name: string;
  amount: number;
  currency: string;
  budget_type: string;
  category_id?: number;
  category_name?: string;
  group_id?: number;
  group_name?: string;
  spent_amount: number;
  created_at: string;
}

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('INR');
  const [budgetType, setBudgetType] = useState('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [groupId, setGroupId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const bRes = await api.get('/budgets/');
      setBudgets(bRes.data);

      const cRes = await api.get('/expenses/categories');
      setCategories(cRes.data);

      const gRes = await api.get('/groups/');
      setGroups(gRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || amount <= 0) return;
    try {
      await api.post('/budgets/', {
        name,
        amount,
        currency,
        budget_type: budgetType,
        category_id: budgetType === 'category' ? parseInt(categoryId) : undefined,
        group_id: budgetType === 'group' ? parseInt(groupId) : undefined
      });
      alert('Budget target saved successfully!');
      setName('');
      setAmount(0);
      setBudgetType('monthly');
      setCategoryId('');
      setGroupId('');
      setShowAddForm(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert('Failed to save budget');
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!window.confirm('Delete this budget target?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchInitialData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Budgets & Limits</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Set monthly and category spending limits and monitor threshold warning levels.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all duration-200"
        >
          <Plus size={16} />
          Create Budget
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSaveBudget} className="glass-panel p-6 rounded-3xl space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-sm">Add New Spending Limit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Budget Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Monthly Food Limit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Limit (Amount)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Frequency/Scope</label>
                <select
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                >
                  <option value="weekly">Weekly Limit</option>
                  <option value="monthly">Monthly Limit</option>
                  <option value="yearly">Yearly Limit</option>
                  <option value="category">Category-Specific Limit</option>
                  <option value="group">Group-Specific Limit</option>
                </select>
              </div>

              {budgetType === 'category' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {budgetType === 'group' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Group</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Group --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end text-xs font-bold pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">Cancel</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-lg">Save Target</button>
          </div>
        </form>
      )}

      {/* BUDGET CARDS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((b) => {
          const percent = Math.min((b.spent_amount / b.amount) * 100, 200);
          const isBreached = percent >= 100;
          const isWarning = percent >= 75 && percent < 100;

          let ringColor = 'bg-emerald-500';
          let textColor = 'text-emerald-500';
          if (isBreached) {
            ringColor = 'bg-red-500';
            textColor = 'text-red-500';
          } else if (isWarning) {
            ringColor = 'bg-amber-500';
            textColor = 'text-amber-500';
          }

          return (
            <div key={b.id} className="glass-panel p-6 rounded-3xl space-y-4 hover:scale-[1.01] transition-transform duration-300 relative group overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">{b.name}</h3>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                    {b.budget_type} limit {b.category_name ? `• ${b.category_name}` : b.group_name ? `• ${b.group_name}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteBudget(b.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progress Bar Layout */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Progress</span>
                  <span className={textColor}>{percent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${ringColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold border-t border-slate-200 dark:border-slate-800 pt-3">
                <div>
                  <span className="text-slate-400 block text-[9px]">LIMIT</span>
                  <span className="text-slate-800 dark:text-slate-200">₹{b.amount.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px]">SPENT</span>
                  <span className="text-slate-800 dark:text-slate-200">₹{b.spent_amount.toLocaleString()}</span>
                </div>
              </div>

              {isBreached && (
                <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold">
                  <ShieldAlert size={12} />
                  Budget limit breached! Please reduce categories expenditure.
                </div>
              )}
            </div>
          );
        })}
        {budgets.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs glass-panel rounded-3xl">
            <FolderHeart size={36} className="mx-auto text-indigo-500/20 mb-3" />
            No budget limits defined yet. Create one to stay on track.
          </div>
        )}
      </div>
    </div>
  );
};
