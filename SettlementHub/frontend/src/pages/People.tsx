import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Archive, Trash2, Mail, Phone, Eye } from 'lucide-react';

interface Person {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  total_borrowed: number;
  total_lent: number;
  current_balance: number;
}

export const People: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const res = await api.get('/people/summary');
      setPeople(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/people/', {
        name,
        email: email || undefined,
        phone: phone || undefined
      });
      setName('');
      setEmail('');
      setPhone('');
      setShowAddForm(false);
      fetchPeople();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create person');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await api.post(`/people/${id}/archive`);
      fetchPeople();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/people/${id}`);
      fetchPeople();
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
          <h1 className="text-3xl font-extrabold tracking-tight">People</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage contacts and view individual balance summaries.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all duration-200"
        >
          <Plus size={16} />
          Add Person
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddPerson} className="glass-panel p-6 rounded-3xl space-y-4 max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-sm">Add New Contact</h3>
          {error && <div className="p-3 bg-red-950/20 text-red-200 border border-red-500/30 text-xs rounded-xl">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg"
            >
              Save Person
            </button>
          </div>
        </form>
      )}

      {/* PEOPLE LIST TABLE */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Total Lent</th>
                <th className="px-6 py-4">Total Borrowed</th>
                <th className="px-6 py-4">Net Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-xs">
              {people.map((p) => (
                <tr key={p.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400">
                      {p.email && <span className="flex items-center gap-1"><Mail size={10} /> {p.email}</span>}
                      {p.phone && <span className="flex items-center gap-1"><Phone size={10} /> {p.phone}</span>}
                      {!p.email && !p.phone && <span>--</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-semibold">₹{p.total_lent.toFixed(2)}</td>
                  <td className="px-6 py-4 text-red-500 font-semibold">₹{p.total_borrowed.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-black ${p.current_balance > 0 ? 'text-emerald-500' : p.current_balance < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {p.current_balance > 0 ? `+₹${p.current_balance.toFixed(2)}` : p.current_balance < 0 ? `-₹${Math.abs(p.current_balance).toFixed(2)}` : 'Settled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/ledger?personId=${p.id}`)}
                        className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                        title="View Ledger"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(p.id)}
                        className={`p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all ${p.status === 'archived' ? 'text-amber-500' : 'text-slate-400'}`}
                        title={p.status === 'archived' ? 'Activate Contact' : 'Archive Contact'}
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition-all"
                        title="Delete Contact"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No contacts added yet. Click "Add Person" to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
