import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, ArrowRight, Wallet, Users, FolderOpen } from 'lucide-react';

interface Person {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  group_type: string;
  members: Person[];
}

interface GroupExpense {
  id: number;
  amount: number;
  currency: string;
  description: string;
  category_name: string;
  created_at: string;
}

interface SettlementSuggestion {
  from_person_id: number;
  from_person_name: string;
  to_person_id: number;
  to_person_name: string;
  amount: number;
  currency: string;
}

export const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  // Group Creation Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupType, setGroupType] = useState('trip');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Selected Group Details
  const [groupExpenses, setGroupExpenses] = useState<GroupExpense[]>([]);
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [groupBalances, setGroupBalances] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups/');
      setGroups(res.data);

      const peopleRes = await api.get('/people/');
      setPeople(peopleRes.data);
      
      if (res.data.length > 0) {
        handleSelectGroup(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (group: Group) => {
    setSelectedGroup(group);
    try {
      // 1. Fetch expenses for group
      const expRes = await api.get('/expenses/');
      const filtered = expRes.data.filter((e: any) => e.group_id === group.id);
      setGroupExpenses(filtered);

      // 2. Fetch group settlements calculation
      const settleRes = await api.get(`/settlements/calculate?group_id=${group.id}`);
      setSuggestions(settleRes.data.suggested_payments);
      setGroupBalances(settleRes.data.balances);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName) return;
    try {
      await api.post('/groups/', {
        name: groupName,
        description: groupDesc || undefined,
        group_type: groupType,
        member_ids: selectedMemberIds
      });
      setGroupName('');
      setGroupDesc('');
      setSelectedMemberIds([]);
      setShowAddForm(false);
      
      // Refresh groups list
      const groupsRes = await api.get('/groups/');
      setGroups(groupsRes.data);
      // Select the new group
      const newGroup = groupsRes.data.find((g: any) => g.name === groupName);
      if (newGroup) handleSelectGroup(newGroup);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMemberSelection = (id: number) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
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
          <h1 className="text-3xl font-extrabold tracking-tight">Groups</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Split expenses across trips, roommate arrangements, and offices.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all duration-200"
        >
          <Plus size={16} />
          Create Group
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateGroup} className="glass-panel p-6 rounded-3xl space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-sm">Create New Group</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input
                type="text"
                required
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <input
                type="text"
                placeholder="Description"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <select
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="trip">Trip</option>
                <option value="office">Office</option>
                <option value="roommates">Roommates / Rent</option>
                <option value="friends">Friends</option>
                <option value="family">Family</option>
                <option value="event">Event</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400">Select Members:</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-1.5 bg-slate-50 dark:bg-slate-900">
                {people.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs font-semibold select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(p.id)}
                      onChange={() => toggleMemberSelection(p.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end text-xs font-bold">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">Cancel</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-lg">Save Group</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* GROUPS SIDEBAR */}
        <div className="space-y-3">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider pl-2">Active Groups</h3>
          <div className="space-y-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  selectedGroup?.id === g.id
                    ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-600/20'
                    : 'glass-panel border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-200/20 dark:hover:bg-slate-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold ${selectedGroup?.id === g.id ? 'bg-white/20' : 'bg-indigo-500/10 text-indigo-500'}`}>
                    {g.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-none">{g.name}</h4>
                    <span className={`text-[9px] font-bold ${selectedGroup?.id === g.id ? 'text-indigo-200' : 'text-slate-400'} uppercase tracking-wider block mt-1`}>
                      {g.group_type}
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
            {groups.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">No groups created yet.</div>
            )}
          </div>
        </div>

        {/* SELECTED GROUP DETAIL PANEL */}
        {selectedGroup && (
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="text-indigo-600" size={16} />
                <span className="text-[10px] uppercase font-bold text-slate-400">{selectedGroup.group_type} group</span>
              </div>
              <h2 className="text-2xl font-black">{selectedGroup.name}</h2>
              {selectedGroup.description && <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{selectedGroup.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GROUP BALANCES & SETTLEMENTS */}
              <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Wallet size={16} className="text-indigo-600" />
                  Group Balance Standing
                </h3>
                
                <div className="space-y-3">
                  {groupBalances.map(gb => (
                    <div key={gb.person_id} className="flex justify-between items-center text-xs p-2.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/10 dark:border-slate-800/10">
                      <span className="font-semibold">{gb.person_name}</span>
                      <span className={`font-black ${gb.net_balance > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {gb.net_balance > 0 ? `Owed ₹${gb.net_balance.toFixed(2)}` : `Owes ₹${Math.abs(gb.net_balance).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  {groupBalances.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">No balances within group.</div>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mb-2">Suggested Settle Payments</h4>
                  <div className="space-y-2.5">
                    {suggestions.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-red-500">{s.from_person_name}</span>
                        <span className="text-[10px] font-bold text-slate-400">pays</span>
                        <span className="font-bold text-emerald-500">{s.to_person_name}</span>
                        <span className="font-black ml-auto">₹{s.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {suggestions.length === 0 && (
                      <div className="text-[10px] text-slate-400">All set! No payments required.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* GROUP EXPENSES */}
              <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Users size={16} className="text-indigo-600" />
                  Group Expenses List
                </h3>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {groupExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                      <div>
                        <h4 className="font-bold text-xs">{e.description}</h4>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mt-0.5">{e.category_name}</span>
                      </div>
                      <span className="font-black text-xs">₹{e.amount}</span>
                    </div>
                  ))}
                  {groupExpenses.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">No expenses logged for this group.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
