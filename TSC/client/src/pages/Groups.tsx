import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Plus, Users, Layout, Key, ArrowRight, Loader, Info, RefreshCw } from "lucide-react";

export const Groups: React.FC = () => {
  const { apiFetch } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog / form states
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [inviteCode, setInviteCode] = useState("");

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/groups", {
        method: "POST",
        body: JSON.stringify({ name, description, currency }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      setName("");
      setDescription("");
      setCurrency("INR");
      setShowCreate(false);
      loadGroups();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      setInviteCode("");
      setShowJoin(false);
      loadGroups();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-24 md:pb-6 select-none relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            My Expense Groups
          </h1>
          <p className="text-xs text-gray-400 mt-1">Manage, share, and settle bills across different cohorts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
              setError(null);
            }}
            className="flex items-center gap-1.5 bg-secondary hover:bg-white/5 border border-white/10 text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all"
          >
            <Key size={14} />
            Join Code
          </button>
          <button
            onClick={() => {
              setShowCreate(true);
              setShowJoin(false);
              setError(null);
            }}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-lg shadow-primary/10 transition-all"
          >
            <Plus size={14} />
            Create Group
          </button>
        </div>
      </div>

      {/* Floating Dialog / Popup Forms */}
      {(showCreate || showJoin) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl animate-pulse-once border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">
                {showCreate ? "Create New Shared Group" : "Join Existing Group"}
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setShowJoin(false);
                  setError(null);
                }}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
                {error}
              </div>
            )}

            {showCreate ? (
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase">Group Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hostel Roommates, Goa Trip"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe group sharing rules or details..."
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm h-20 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase">Default Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm cursor-pointer"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - United States Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="AED">AED (د.إ) - United Arab Emirates Dirham</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : "Create Group"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinGroup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase">Invite Code</label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. SPLIT-AH3J8P"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-center font-bold tracking-wider uppercase"
                  />
                </div>
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-lg p-2.5">
                  <Info size={14} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Enter the Alphanumeric code shared by the group administrator to join.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors"
                >
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : "Join Group"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Grid of Groups */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <RefreshCw size={24} className="animate-spin text-primary" />
          <span className="text-sm text-gray-400">Syncing expense cohorts...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl min-h-[300px] p-6 text-center">
          <Users size={48} className="text-gray-600 mb-4" />
          <h3 className="text-base font-bold text-white">No Groups Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6">
            You are not member of any sharing group. Create one or enter an invite code to join one!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoin(true)}
              className="px-4 py-2.5 bg-secondary hover:bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              Enter Join Code
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              Create a Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[170px] glass-card-hover text-left"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-white font-sans truncate pr-4">{group.name}</h3>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                    {group.currency}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed min-h-[32px]">
                  {group.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4 text-[11px] text-gray-500">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {group._count.members} Members
                  </span>
                  <span className="flex items-center gap-1">
                    <Layout size={12} /> {group._count.transactions} Expenses
                  </span>
                </div>
                <span className="text-primary hover:underline font-semibold flex items-center gap-0.5">
                  Open Ledger <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
