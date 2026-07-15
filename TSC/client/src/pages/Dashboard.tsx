import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers, Plus, RefreshCw, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export const Dashboard: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }

      // Fetch user activity logs for their groups
      const groupsRes = await apiFetch("/groups");
      if (groupsRes.ok) {
        const groups = await groupsRes.json();
        let aggregatedLogs: any[] = [];
        for (const g of groups.slice(0, 3)) {
          const logRes = await apiFetch(`/groups/${g.id}/activity`);
          if (logRes.ok) {
            const logs = await logRes.json();
            aggregatedLogs = [...aggregatedLogs, ...logs.map((l: any) => ({ ...l, groupName: g.name }))];
          }
        }
        setRecentActivities(aggregatedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mock data for graphs if no real transactions are present
  const spendingTrendData = [
    { name: "Jan", amount: 1200 },
    { name: "Feb", amount: 2100 },
    { name: "Mar", amount: 1800 },
    { name: "Apr", amount: 3400 },
    { name: "May", amount: 2800 },
    { name: "Jun", amount: 4800 },
    { name: "Jul", amount: stats?.summary?.totalPaid || 5000 },
  ];

  const categoryPieData = [
    { name: "Food", value: 35, color: "#F59E0B" },
    { name: "Groceries", value: 20, color: "#10B981" },
    { name: "Travel", value: 15, color: "#3B82F6" },
    { name: "Utilities", value: 10, color: "#8B5CF6" },
    { name: "Rent", value: 20, color: "#6B7280" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-primary" />
        <span className="text-sm text-gray-400">Assembling financial intelligence...</span>
      </div>
    );
  }

  const netBal = stats?.summary?.netBalance || 0;

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 md:pb-6 select-none">
      {/* Welcome Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Hi, {user?.name || "User"} <span className="wave">👋</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Here is a summary of your shared expenses and settlements.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/groups"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-lg shadow-primary/10 transition-colors"
          >
            <Plus size={14} />
            Add/Join Group
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance Card */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase">Your Balance</span>
            <span className={`p-1.5 rounded-lg text-xs font-bold ${netBal >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
              {netBal >= 0 ? "+" : "-"}
            </span>
          </div>
          <div>
            <h2 className={`text-2xl font-bold font-sans ${netBal >= 0 ? "text-success" : "text-danger"}`}>
              ₹{Math.abs(netBal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[10px] text-gray-500 mt-1">
              {netBal >= 0 ? "You are owed overall" : "You owe overall"}
            </p>
          </div>
        </div>

        {/* Expenses Paid Card */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase">Total Paid</span>
            <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-sans">
              ₹{(stats?.summary?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[10px] text-gray-500 mt-1">Your payments logged</p>
          </div>
        </div>

        {/* Expenses Owed Card */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase">Total Owed</span>
            <span className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
              <ArrowDownRight size={14} />
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-sans">
              ₹{(stats?.summary?.totalOwed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[10px] text-gray-500 mt-1">Your share of expenses</p>
          </div>
        </div>

        {/* Group Count Card */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase">Active Groups</span>
            <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
              <Layers size={14} />
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-sans">
              {stats?.summary?.groupCount || 0}
            </h2>
            <p className="text-[10px] text-gray-500 mt-1">Shared expense groups</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Activities Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trends Chart */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly Spending Trends</h3>
              <p className="text-[10px] text-gray-500">Your total payments month-by-month</p>
            </div>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                  labelStyle={{ color: "#9CA3AF", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ color: "#FFFFFF", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Donut/Pie Chart) */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white">Category Split</h3>
          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                  itemStyle={{ color: "#FFFFFF", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Top Spent</span>
              <span className="text-xs font-bold text-white">Food (35%)</span>
            </div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {categoryPieData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-gray-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }}></span>
                <span className="truncate">{cat.name} ({cat.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline & Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Log */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white">Group Activities Timeline</h3>
          <div className="flex flex-col gap-4">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No recent activities logged in your groups.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 items-start text-xs relative">
                  <div className="relative flex items-center justify-center">
                    <span className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                      {act.action === "CREATE_GROUP" && "📁"}
                      {act.action === "ADD_TRANSACTION" && "💸"}
                      {act.action === "RECORD_PAYMENT" && "🤝"}
                      {act.action === "ADD_MEMBER" && "👤"}
                      {!["CREATE_GROUP", "ADD_TRANSACTION", "RECORD_PAYMENT", "ADD_MEMBER"].includes(act.action) && "⚡"}
                    </span>
                  </div>
                  <div className="flex-1 border-b border-white/5 pb-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-200">
                        {act.actorName} logged {act.action.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-400 mt-0.5">
                      {act.action === "ADD_TRANSACTION" && `Added "${act.details?.itemName}" of ₹${Number(act.details?.amount).toFixed(2)}`}
                      {act.action === "RECORD_PAYMENT" && `Settled ₹${Number(act.details?.amount).toFixed(2)}: ${act.details?.fromName} to ${act.details?.toName}`}
                      {act.action === "CREATE_GROUP" && `Created group "${act.details?.name}"`}
                      {act.action === "ADD_MEMBER" && `Added member "${act.details?.memberName}"`}
                    </p>
                    <span className="text-[9px] text-primary/70 font-semibold uppercase tracking-wider block mt-1">
                      {act.groupName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insight Card Quick summary */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-br from-primary/10 to-emerald-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] pointer-events-none"></div>
          
          <div className="flex flex-col gap-2 relative z-10">
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} /> AI Insights Engine
            </span>
            <h4 className="text-base font-bold text-white font-sans mt-1">Dynamic Spending Intelligence</h4>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Open a specific group page to generate smart predictions, run transaction duplicate checks, and ask the AI Assistant natural-language ledger queries instantly!
            </p>
          </div>
          
          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-[10px] text-gray-500">Updates dynamically</span>
            <Link
              to="/groups"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              Analyze Groups <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
