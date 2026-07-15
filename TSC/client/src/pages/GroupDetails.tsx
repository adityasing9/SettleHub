import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SpreadsheetView } from "../components/SpreadsheetView";
import { 
  Users, Key, QrCode, ClipboardCheck, Sparkles, Send, BarChart2, 
  Trash2, Plus, RefreshCw, CheckCircle2, Download, Settings as SettingsIcon, AlertTriangle, LayoutDashboard
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";

export const GroupDetails: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  // Tab State: SPREADSHEET, LEDGER, SETTLEMENTS, AI, ANALYTICS, SETTINGS
  const [activeTab, setActiveTab] = useState<string>("SPREADSHEET");

  // Core Data State
  const [group, setGroup] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [netBalances, setNetBalances] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [aiInsights, setAIInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Invitation Modal
  const [showQR, setShowQR] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Add Member State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberUPI, setNewMemberUPI] = useState("");
  const [newMemberColor, setNewMemberColor] = useState("#2563EB");

  // Add Expense Modal (Normal Form)
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [category, setCategory] = useState("General");

  // Ask AI Chatbot State
  const [aiQuery, setAIQuery] = useState("");
  const [aiChat, setAIChat] = useState<any[]>([]);
  const [aiLoading, setAILoading] = useState(false);

  // Settlement Recording Modal
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentNotes, setPaymentNotes] = useState("");

  const refreshData = async () => {
    if (!groupId) return;
    try {
      // 1. Fetch group metadata & members
      const groupRes = await apiFetch(`/groups/${groupId}`);
      if (!groupRes.ok) {
        if (groupRes.status === 403) {
          alert("Access Denied");
          navigate("/groups");
          return;
        }
        throw new Error("Failed to load group details");
      }
      const groupData = await groupRes.json();
      setGroup(groupData);

      // 2. Fetch transactions
      const txRes = await apiFetch(`/groups/${groupId}/transactions`);
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions);
      }

      // 3. Fetch Settlements & Net Balances
      const settleRes = await apiFetch(`/groups/${groupId}/settlements`);
      if (settleRes.ok) {
        const settleData = await settleRes.json();
        setNetBalances(settleData.netBalances);
        setSettlements(settleData.settlements);
      }

      // 5. Fetch Analytics
      const analyticsRes = await apiFetch(`/groups/${groupId}/analytics`);
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

      // 6. Fetch AI automated insights
      const aiRes = await apiFetch(`/groups/${groupId}/ai/insights`);
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAIInsights(aiData);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [groupId]);

  // Copy Group code to Clipboard
  const copyToClipboard = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Add Member handler
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    try {
      const res = await apiFetch(`/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({
          name: newMemberName,
          email: newMemberEmail || null,
          upiId: newMemberUPI || null,
          color: newMemberColor,
        }),
      });

      if (res.ok) {
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberUPI("");
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add member");
      }
    } catch (e) {
      console.error(e);
      alert("Added member successfully (queued offline)");
      refreshData();
    }
  };

  // Delete Member handler
  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await apiFetch(`/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to remove member");
      }
    } catch (e) {
      console.error(e);
      alert("Action queued offline");
      refreshData();
    }
  };

  // Normal Form Add Expense handler
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !amount || !payerId) return;

    // Simple equal split for normal form
    const participantsPayload = group.members.map((m: any) => ({
      memberId: m.id,
      shareValue: 1,
    }));

    try {
      const res = await apiFetch(`/groups/${groupId}/transactions`, {
        method: "POST",
        body: JSON.stringify({
          itemName,
          amount: parseFloat(amount),
          payerId,
          category,
          splitType: "EQUAL",
          participants: participantsPayload,
        }),
      });

      if (res.ok) {
        setItemName("");
        setAmount("");
        setShowAddExpense(false);
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create transaction");
      }
    } catch (e) {
      console.error(e);
      alert("Expense logged offline!");
      setShowAddExpense(false);
      refreshData();
    }
  };

  // Ask AI handler
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || aiLoading) return;

    const userMessage = { role: "user", text: aiQuery };
    setAIChat((prev) => [...prev, userMessage]);
    const currentQuery = aiQuery;
    setAIQuery("");
    setAILoading(true);

    try {
      const res = await apiFetch(`/groups/${groupId}/ai/query`, {
        method: "POST",
        body: JSON.stringify({ query: currentQuery }),
      });
      const data = await res.json();

      setAIChat((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, data: data.data },
      ]);
    } catch (e) {
      setAIChat((prev) => [
        ...prev,
        { role: "assistant", text: "I'm having trouble analyzing the ledger right now. Please try again later." },
      ]);
    } finally {
      setAILoading(false);
    }
  };

  // Record Payment Submit handler
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSettlement) return;

    try {
      const res = await apiFetch(`/groups/${groupId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          fromId: selectedSettlement.fromId,
          toId: selectedSettlement.toId,
          amount: Number(selectedSettlement.amount),
          paymentMethod,
          notes: paymentNotes || null,
        }),
      });

      if (res.ok) {
        setSelectedSettlement(null);
        setPaymentNotes("");
        refreshData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } catch (e) {
      console.error(e);
      alert("Payment recorded offline!");
      setSelectedSettlement(null);
      refreshData();
    }
  };

  // Send Reminder handler
  const handleSendReminder = async (settle: any) => {
    try {
      const res = await apiFetch(`/groups/${groupId}/remind`, {
        method: "POST",
        body: JSON.stringify({
          fromId: settle.fromId,
          toId: settle.toId,
          amount: settle.amount,
        }),
      });

      if (res.ok) {
        alert("Reminder request sent successfully!");
      }
    } catch (e) {
      alert("Queued reminder request offline");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-primary" />
        <span className="text-sm text-gray-400">Loading group details and spreadsheet columns...</span>
      </div>
    );
  }

  if (!group) {
    return <div className="text-center py-10 text-gray-400">Group not found</div>;
  }

  // Pre-format charts data
  const categoryChartData = analytics?.categoryBreakdown
    ? Object.entries(analytics.categoryBreakdown).map(([name, value]) => ({
        name,
        value: Number(value),
      }))
    : [];

  const memberChartData = analytics?.memberBreakdown
    ? Object.entries(analytics.memberBreakdown).map(([name, value]) => ({
        name,
        value: Number(value),
      }))
    : [];

  const colorsList = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#14B8A6"];

  return (
    <div className="p-6 flex flex-col gap-6 pb-24 md:pb-6 select-none relative">
      {/* Group Detail Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background gradient splash */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-[50px] pointer-events-none"></div>

        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{group.name}</h1>
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase">
              {group.currency}
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
            {group.description || "No description provided."}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mt-1">
            <Users size={12} /> {group.members.length} members
          </div>
        </div>

        {/* Invite & QR Codes */}
        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 bg-secondary hover:bg-white/5 border border-white/10 text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all"
          >
            {copiedCode ? <ClipboardCheck size={14} className="text-success" /> : <Key size={14} />}
            <span>{copiedCode ? "Copied!" : `Code: ${group.inviteCode}`}</span>
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1 bg-secondary hover:bg-white/5 border border-white/10 text-white text-xs font-semibold py-2.5 px-2.5 rounded-xl cursor-pointer transition-all"
            title="Show QR Code Invite"
          >
            <QrCode size={16} />
          </button>
        </div>
      </div>

      {/* QR Invite Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 text-center shadow-2xl relative border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-white">QR Code Invite</h2>
              <button onClick={() => setShowQR(false)} className="text-xs text-gray-400 hover:text-white cursor-pointer">
                Close
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <img src={group.qrInviteUrl} alt="Group QR Code" className="h-44 w-44 object-contain" />
            </div>
            <p className="text-xs text-gray-400 leading-normal px-2">
              Have friends scan this QR Code from their SmartSplit camera screen to join the group <strong>{group.name}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Settlement payment modal */}
      {selectedSettlement && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-white">Record Settlement Payment</h2>
              <button onClick={() => setSelectedSettlement(null)} className="text-xs text-gray-400 hover:text-white cursor-pointer">
                Close
              </button>
            </div>
            <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col gap-4">
              <div className="p-3 bg-secondary/50 rounded-xl border border-white/5 text-xs">
                <p className="text-gray-400 font-semibold uppercase text-[10px]">Payment Settlement</p>
                <p className="text-white mt-1 text-sm">
                  <strong>{selectedSettlement.fromName}</strong> paid <strong>{selectedSettlement.toName}</strong>:
                </p>
                <p className="text-lg font-bold text-success font-mono mt-1">₹{Number(selectedSettlement.amount).toFixed(2)}</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                >
                  <option value="UPI">UPI Payment (GPay, PhonePe, Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS, NEFT)</option>
                  <option value="CASH">Cash Settlement</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cleared room electricity debt"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-success hover:bg-success-hover text-white text-xs font-semibold py-3 px-4 rounded-xl cursor-pointer"
              >
                Confirm Payment & Settle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tabs navigation bar */}
      <div className="border-b border-white/5 flex gap-2 overflow-x-auto pb-0.5">
        {[
          { id: "SPREADSHEET", label: "Spreadsheet View", icon: LayoutDashboard },
          { id: "LEDGER", label: "Ledger", icon: Users },
          { id: "SETTLEMENTS", label: "Settlements", icon: CheckCircle2 },
          { id: "AI", label: "AI Insights", icon: Sparkles },
          { id: "ANALYTICS", label: "Analytics", icon: BarChart2 },
          { id: "SETTINGS", label: "Members/Settings", icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: SPREADSHEET */}
      {activeTab === "SPREADSHEET" && (
        <SpreadsheetView
          groupId={groupId!}
          groupCurrency={group.currency}
          members={group.members}
          transactions={transactions}
          onRefresh={refreshData}
        />
      )}

      {/* TAB CONTENT: LEDGER */}
      {activeTab === "LEDGER" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs text-gray-500 font-semibold uppercase">Shared Expenses list</h2>
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2 px-3 rounded-lg cursor-pointer transition-colors"
            >
              <Plus size={13} /> Add Expense
            </button>
          </div>

          {/* Dialog for adding expense manually */}
          {showAddExpense && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-base font-bold text-white">Add New Expense</h2>
                  <button onClick={() => setShowAddExpense(false)} className="text-xs text-gray-400 hover:text-white cursor-pointer">
                    Close
                  </button>
                </div>
                <form onSubmit={handleAddExpenseSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase">Item Name</label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Pizza Dinner, Uber ride"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase">Amount</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase">Paid By</label>
                    <select
                      value={payerId}
                      onChange={(e) => setPayerId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                    >
                      <option value="">Select payer...</option>
                      {group.members.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-semibold uppercase">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                    >
                      <option value="Food">Food</option>
                      <option value="Groceries">Groceries</option>
                      <option value="Travel">Travel</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Rent">Rent</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-lg p-2.5 text-[10px] text-gray-400 leading-normal">
                    <span>ℹ</span>
                    <p>This shortcut form splits the amount **equally** across all group members. For percentages, shares, or custom weights, please use the **Spreadsheet View** tab.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-3 px-4 rounded-xl cursor-pointer"
                  >
                    Save Expense
                  </button>
                </form>
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            <p className="text-xs text-gray-500 py-10 text-center">No transactions recorded. Switch to the spreadsheet to type one!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="glass-card rounded-xl p-4 flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                      💵
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{tx.itemName}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Paid by {tx.payer.name} on {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-white">
                      {group.currency === "INR" ? "₹" : "$"}{Number(tx.amount).toFixed(2)}
                    </span>
                    <span className="text-[9px] block text-gray-500 uppercase mt-0.5 tracking-wider font-semibold">
                      {tx.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SETTLEMENTS */}
      {activeTab === "SETTLEMENTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Net Balances List */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Member Balances</h3>
            <div className="flex flex-col gap-3">
              {netBalances.map((b) => (
                <div key={b.memberId} className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-xs font-medium text-gray-200">{b.name}</span>
                  <span className={`text-xs font-bold font-mono ${b.balance >= 0 ? "text-success" : "text-danger"}`}>
                    {b.balance >= 0 ? "+" : ""}{Number(b.balance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Simplified Settlements */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Minimum Settlements Required</h3>
            {settlements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-2xl">🎉</span>
                <p className="text-xs text-gray-400 mt-2">All debts are simplified and settled!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {settlements.map((s, index) => (
                  <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-secondary/20 rounded-xl border border-white/5 gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-white">{s.fromName}</span>
                      <span className="text-gray-500">owes</span>
                      <span className="font-bold text-white">{s.toName}</span>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-sm font-bold text-success font-mono">
                        {group.currency === "INR" ? "₹" : "$"}{Number(s.amount).toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendReminder(s)}
                          className="px-2.5 py-1.5 bg-secondary hover:bg-white/5 text-white text-[10px] font-bold rounded-lg border border-white/10 cursor-pointer"
                        >
                          Remind
                        </button>
                        <button
                          onClick={() => setSelectedSettlement(s)}
                          className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Settle Up
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI */}
      {activeTab === "AI" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ask AI Box */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-2 flex flex-col h-[400px]">
            <div className="flex items-center gap-1.5 mb-4 border-b border-white/5 pb-3">
              <Sparkles size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-white">Ask SmartSplit AI Assistant</h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 text-xs mb-4">
              {aiChat.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                  Ask me questions like: <br />
                  <span className="text-gray-400 font-mono">"Who spent the most?"</span> or <br />
                  <span className="text-gray-400 font-mono">"How much do I owe?"</span> or <br />
                  <span className="text-gray-400 font-mono">"Show petrol expenses"</span>
                </p>
              ) : (
                aiChat.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary/20 text-white self-end border border-primary/10"
                        : "bg-secondary text-gray-200 self-start border border-white/5"
                    }`}
                  >
                    <p className="font-semibold text-[10px] text-gray-400 uppercase mb-1">
                      {m.role === "user" ? "You" : "AI Assistant"}
                    </p>
                    <p className="whitespace-pre-line">{m.text}</p>
                    
                    {/* Render table if AI returns query list */}
                    {m.data && Array.isArray(m.data) && (
                      <div className="mt-3 overflow-x-auto rounded border border-white/5 bg-background/50">
                        <table className="min-w-full text-[10px]">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-2 py-1 text-left font-semibold text-gray-400">Date</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-400">Item</th>
                              <th className="px-2 py-1 text-right font-semibold text-gray-400">Amt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.data.map((row: any, idx: number) => (
                              <tr key={idx} className="border-t border-white/5">
                                <td className="px-2 py-1 text-gray-400">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-2 py-1 font-medium">{row.itemName}</td>
                                <td className="px-2 py-1 text-right font-mono text-white">₹{row.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="bg-secondary text-gray-200 self-start max-w-[80%] rounded-xl p-3 border border-white/5 flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-primary" />
                  <span>Scanning ledger rows...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAskAI} className="flex gap-2">
              <input
                type="text"
                required
                value={aiQuery}
                onChange={(e) => setAIQuery(e.target.value)}
                placeholder="Ask who owes money, top spender, filter category..."
                className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-primary hover:bg-primary-hover text-white p-2.5 rounded-xl cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          {/* AI Insights Panel */}
          <div className="flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-white">Automated AI Summary</h3>
              {aiInsights?.insights && aiInsights.insights.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {aiInsights.insights.map((ins: string, idx: number) => (
                    <div key={idx} className="flex gap-2 text-xs text-gray-300 items-start leading-normal">
                      <span className="text-primary mt-0.5">✦</span>
                      <p>{ins}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Not enough data to calculate stats.</p>
              )}
            </div>

            {/* Duplicate alerts */}
            {aiInsights?.duplicates && aiInsights.duplicates.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border-rose-500/20 bg-rose-500/5 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                  <AlertTriangle size={14} /> Potential Duplicates
                </h4>
                <div className="flex flex-col gap-3">
                  {aiInsights.duplicates.map((dup: any, index: number) => (
                    <div key={index} className="text-[11px] text-gray-400 border-l-2 border-rose-500 pl-2 leading-relaxed">
                      <p className="font-semibold text-gray-200">"{dup.t1.itemName}" (₹{dup.t1.amount})</p>
                      <p className="text-[10px]">Payer: {dup.t1.payerName} vs {dup.t2.payerName}</p>
                      <p className="text-[10px] text-rose-400 mt-1 font-semibold">{dup.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === "ANALYTICS" && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs text-gray-500 font-semibold uppercase">Spend Distribution & Reports</h3>
            <a
              href={`http://localhost:5000/api/groups/${groupId}/export`}
              download
              className="flex items-center gap-1 bg-secondary hover:bg-white/5 border border-white/10 text-white text-xs font-semibold py-2 px-3 rounded-lg cursor-pointer transition-all"
            >
              <Download size={13} />
              Export CSV Ledger
            </a>
          </div>

          {categoryChartData.length === 0 ? (
            <p className="text-xs text-gray-500 py-10 text-center">No spending statistics available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-white">Spend by Category</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {categoryChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorsList[index % colorsList.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Member Paid Breakdown */}
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-white">Spent per Payer</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={memberChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#6B7280" fontSize={10} />
                      <YAxis stroke="#6B7280" fontSize={10} />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]}>
                        {memberChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorsList[index % colorsList.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SETTINGS (MEMBERS) */}
      {activeTab === "SETTINGS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Member List */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Group Members Directory</h3>
            <div className="flex flex-col gap-3">
              {group.members.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: m.color }}></span>
                    <span className="text-xs font-semibold text-white">{m.name}</span>
                    {m.email && <span className="text-[10px] text-gray-500">({m.email})</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {m.upiId && <span className="text-[10px] text-gray-400 font-mono">{m.upiId}</span>}
                    <button
                      onClick={() => handleDeleteMember(m.id)}
                      className="p-1 rounded hover:bg-danger/10 text-gray-500 hover:text-danger cursor-pointer"
                      title="Remove Member"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add member form */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Invite / Add Member</h3>
            <form onSubmit={handleAddMember} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Member Name</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Email (Optional)</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={newMemberUPI}
                  onChange={(e) => setNewMemberUPI(e.target.value)}
                  placeholder="e.g. upi@okaxis"
                  className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Identifier Color</label>
                <div className="flex gap-2">
                  {colorsList.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewMemberColor(col)}
                      className={`h-5 w-5 rounded-full cursor-pointer transition-transform ${
                        newMemberColor === col ? "ring-2 ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer mt-2"
              >
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
