import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
  members: { id: number; name: string }[];
}

interface Expense {
  id: number;
  amount: number;
  currency: string;
  description: string;
  category_name: string;
  merchant?: string;
  location?: string;
  payment_method: string;
  notes?: string;
  receipt_id?: number;
  created_at: string;
}

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('INR');
  const [categoryId, setCategoryId] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [location, setLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [payerId, setPayerId] = useState<string>(''); // Who paid the bill
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'custom'>('equal');

  // Receipt File State
  const [uploadedReceiptId, setUploadedReceiptId] = useState<number | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  // Split values per member: maps member_id -> share_amount or share_percent
  const [splits, setSplits] = useState<Record<number, number>>({});
  const [activeMembers, setActiveMembers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // If group is selected, set members list to group members
    if (selectedGroupId) {
      const group = groups.find(g => g.id.toString() === selectedGroupId);
      if (group) {
        setActiveMembers(group.members);
        // Default payer to "You" (assuming "You" has id = 1 or is first, let's search for "You" or default to first member)
        const self = group.members.find(m => m.name === 'You');
        if (self) setPayerId(self.id.toString());
        else if (group.members.length > 0) setPayerId(group.members[0].id.toString());
      }
    } else {
      // Default members is all people
      setActiveMembers(people);
      const self = people.find(p => p.name === 'You');
      if (self) setPayerId(self.id.toString());
      else if (people.length > 0) setPayerId(people[0].id.toString());
    }
  }, [selectedGroupId, people, groups]);

  // Set default split amounts when amount or activeMembers change
  useEffect(() => {
    if (splitType === 'equal') {
      const count = activeMembers.length;
      if (count > 0) {
        const equalShare = amount / count;
        const newSplits: Record<number, number> = {};
        activeMembers.forEach(m => {
          newSplits[m.id] = equalShare;
        });
        setSplits(newSplits);
      }
    }
  }, [amount, activeMembers, splitType]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const expRes = await api.get('/expenses/');
      setExpenses(expRes.data);

      const catRes = await api.get('/expenses/categories');
      setCategories(catRes.data);
      if (catRes.data.length > 0) setCategoryId(catRes.data[0].id.toString());

      const groupsRes = await api.get('/groups/');
      setGroups(groupsRes.data);

      const peopleRes = await api.get('/people/');
      setPeople(peopleRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setReceiptUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await api.post('/expenses/upload-receipt', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setUploadedReceiptId(res.data.id);
        alert('Receipt uploaded successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to upload receipt');
      } finally {
        setReceiptUploading(false);
      }
    }
  };

  const handleSplitValueChange = (id: number, val: number) => {
    setSplits(prev => ({ ...prev, [id]: val }));
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || amount <= 0 || !payerId) return;

    // Calculate final Pydantic splits structure
    // owe_amount = share_amount - paid_amount
    // paid_amount = amount if member_id == payerId else 0
    const finalSplits = activeMembers.map(m => {
      let share = 0;
      let percent = 0;
      
      if (splitType === 'equal') {
        share = splits[m.id] || 0;
        percent = (share / amount) * 100;
      } else if (splitType === 'percentage') {
        const pct = splits[m.id] || 0;
        share = (pct / 100) * amount;
        percent = pct;
      } else {
        share = splits[m.id] || 0;
        percent = (share / amount) * 100;
      }
      
      const paid = m.id.toString() === payerId ? amount : 0;
      const owe = share - paid;
      
      return {
        person_id: m.id,
        share_amount: share,
        share_percent: percent,
        owe_amount: owe
      };
    });

    // Validate splits sum
    const totalShareSum = finalSplits.reduce((acc, curr) => acc + curr.share_amount, 0);
    if (Math.abs(totalShareSum - amount) > 0.05) {
      alert('Total shares must sum up to the total expense amount');
      return;
    }

    try {
      await api.post('/expenses/', {
        description,
        amount,
        currency,
        category_id: parseInt(categoryId),
        merchant: merchant || undefined,
        location: location || undefined,
        payment_method: paymentMethod,
        notes: notes || undefined,
        group_id: selectedGroupId ? parseInt(selectedGroupId) : undefined,
        splits: finalSplits,
        receipt_id: uploadedReceiptId || undefined
      });

      alert('Expense logged successfully!');
      setShowAddForm(false);
      setDescription('');
      setAmount(0);
      setSplits({});
      setUploadedReceiptId(null);
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to log expense');
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
          <h1 className="text-3xl font-extrabold tracking-tight">Expense Tracker</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Log expenses, attach digital receipts, and split balances with members.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all duration-200"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSaveExpense} className="glass-panel p-6 rounded-3xl space-y-6 max-w-4xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-sm">Log New Shared Expense</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grocery Bill, Dinner out"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Merchant</label>
                  <input
                    type="text"
                    placeholder="Merchant Name"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Notes/Remarks"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Group (optional)</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Personal (No Group)</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Receipt Upload</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600/10 file:text-indigo-600 hover:file:bg-indigo-600/20"
                />
                {receiptUploading && <span className="text-[10px] text-indigo-500 animate-pulse block mt-1">Uploading file...</span>}
              </div>
            </div>

            {/* SPLITS SETTINGS */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <h4 className="font-bold text-xs">Splits Configuration</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Who Paid?</label>
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Split Type</label>
                  <select
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="equal">Split Equally</option>
                    <option value="percentage">Split by Percentage</option>
                    <option value="custom">Split custom</option>
                  </select>
                </div>
              </div>

              {/* Members input list */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {activeMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs font-semibold gap-3">
                    <span>{m.name}</span>
                    <div className="flex items-center gap-1.5 w-32">
                      <input
                        type="number"
                        disabled={splitType === 'equal'}
                        value={splits[m.id] !== undefined ? splits[m.id] : ''}
                        onChange={(e) => handleSplitValueChange(m.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-right text-xs"
                      />
                      <span className="text-[10px] text-slate-400 font-bold w-4">
                        {splitType === 'percentage' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end text-xs font-bold border-t border-slate-200 dark:border-slate-800 pt-4">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">Cancel</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">Save Expense</button>
          </div>
        </form>
      )}

      {/* EXPENSES LOG LIST */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Expense Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Merchant & Location</th>
                <th className="px-6 py-4">Receipt</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-xs">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-semibold">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{e.description}</h4>
                      {e.notes && <span className="text-[10px] text-slate-400 italic block mt-0.5">{e.notes}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 uppercase tracking-wider text-[9px] font-bold"><span className="px-2.5 py-1 rounded-full bg-indigo-600/10 text-indigo-600">{e.category_name}</span></td>
                  <td className="px-6 py-4 uppercase text-[9px] font-semibold">{e.payment_method}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-[10px] text-slate-400 font-semibold">
                      {e.merchant && <span>Store: {e.merchant}</span>}
                      {e.location && <span>Loc: {e.location}</span>}
                      {!e.merchant && !e.location && <span>--</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {e.receipt_id ? (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold hover:underline cursor-pointer">
                        <ImageIcon size={10} /> View file
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-slate-200">₹{e.amount.toFixed(2)}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">No expenses logged yet. Click "Add Expense" to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
