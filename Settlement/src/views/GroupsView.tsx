import React, { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, Calendar, FileText, CreditCard, ChevronRight, Image, Upload, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Group } from '../context/AppContext';
import { Modal } from '../components/Modal';
import { calculateBalances, simplifyDebts } from '../utils/settlementEngine';
import type { SplitType } from '../utils/settlementEngine';

interface GroupsViewProps {
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  triggerAction: string | null;
  clearTriggerAction: () => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  selectedGroupId,
  setSelectedGroupId,
  triggerAction,
  clearTriggerAction,
}) => {
  const {
    groups,
    members,
    createGroup,
    addExpense,
    deleteExpense,
    addSettlement,
    uploadFile,
    addMemberToGroup,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements' | 'members' | 'files'>('expenses');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals visibility
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);

  // Create Group Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCat, setNewGroupCat] = useState<Group['category']>('trip');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>(['u-1']); // default Aadi

  // Create Expense Form states
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expPaidBy, setExpPaidBy] = useState('u-1');
  const [expCategory, setExpCategory] = useState('Food');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');
  const [expSplitType, setExpSplitType] = useState<SplitType>('equal');
  const [expParticipants, setExpParticipants] = useState<string[]>([]);
  const [expSplits, setExpSplits] = useState<Record<string, number>>({});

  // Settle Up Form states
  const [settleFromId, setSettleFromId] = useState('');
  const [settleToId, setSettleToId] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleNotes, setSettleNotes] = useState('Settle up transaction');

  // Member search
  const [memberSearch, setMemberSearch] = useState('');

  // File Upload state
  const [uploadFileName, setUploadFileName] = useState('');

  // Handle Command Palette and Header direct triggers
  useEffect(() => {
    if (triggerAction === 'create-group') {
      setIsCreateGroupOpen(true);
      clearTriggerAction();
    } else if (triggerAction === 'create-expense') {
      if (selectedGroupId) {
        // Pre-fill participants to all group members
        const group = groups.find(g => g.id === selectedGroupId);
        if (group) {
          setExpParticipants(group.members.map(m => m.id));
        }
        setIsAddExpenseOpen(true);
      } else {
        alert('Please select a group first to add an expense.');
      }
      clearTriggerAction();
    } else if (triggerAction === 'open-settlements-tab') {
      setActiveTab('settlements');
      clearTriggerAction();
    } else if (triggerAction?.startsWith('select-group-')) {
      const gId = triggerAction.replace('select-group-', '');
      setSelectedGroupId(gId);
      clearTriggerAction();
    }
  }, [triggerAction, selectedGroupId, groups]);

  // Current Active Group
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Pre-fill participants when opening expense modal
  useEffect(() => {
    if (activeGroup && isAddExpenseOpen) {
      setExpParticipants(activeGroup.members.map(m => m.id));
      const initialSplits: Record<string, number> = {};
      activeGroup.members.forEach(m => {
        initialSplits[m.id] = 0;
      });
      setExpSplits(initialSplits);
    }
  }, [activeGroup, isAddExpenseOpen]);

  // Calculations for current group balances
  const balances = useMemo(() => {
    if (!activeGroup) return {};
    return calculateBalances(activeGroup.members, activeGroup.expenses, activeGroup.settlements);
  }, [activeGroup]);

  // Simplified settlements
  const simplifiedTransactions = useMemo(() => {
    return simplifyDebts(balances);
  }, [balances]);

  // Filter groups search
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const group = createGroup(newGroupName, newGroupCat, newGroupDesc, newGroupMembers);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupMembers(['u-1']);
    setIsCreateGroupOpen(false);
    setSelectedGroupId(group.id);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || expAmount <= 0 || expParticipants.length === 0) return;

    // Split validation
    if (expSplitType === 'custom') {
      const sum = Object.values(expSplits).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - expAmount) > 0.02) {
        alert(`Sum of custom splits ($${sum.toFixed(2)}) must equal total amount ($${expAmount.toFixed(2)})`);
        return;
      }
    } else if (expSplitType === 'percentage') {
      const sum = Object.values(expSplits).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.1) {
        alert(`Sum of percentages (${sum.toFixed(1)}%) must equal 100%`);
        return;
      }
    }

    addExpense(activeGroup.id, {
      title: expTitle,
      amount: expAmount,
      paidById: expPaidBy,
      participants: expParticipants,
      splitType: expSplitType,
      splits: expSplits,
      category: expCategory,
      date: expDate,
      notes: expNotes,
    });

    setExpTitle('');
    setExpAmount(0);
    setExpPaidBy('u-1');
    setExpNotes('');
    setExpSplitType('equal');
    setIsAddExpenseOpen(false);
  };

  const handleSettleUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || settleAmount <= 0) return;

    addSettlement(activeGroup.id, {
      fromId: settleFromId,
      toId: settleToId,
      amount: settleAmount,
      date: new Date().toISOString().split('T')[0],
      notes: settleNotes,
      isCompleted: true,
    });

    setSettleAmount(0);
    setSettleNotes('Settle up transaction');
    setIsSettleUpOpen(false);
  };

  const triggerSettleModal = (from: string, to: string, amount: number) => {
    setSettleFromId(from);
    setSettleToId(to);
    setSettleAmount(amount);
    setIsSettleUpOpen(true);
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !uploadFileName.trim()) return;
    uploadFile(activeGroup.id, uploadFileName, '1.4 MB', '#');
    setUploadFileName('');
  };

  const getMemberName = (id: string) => {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  const handleToggleMember = (mId: string) => {
    if (newGroupMembers.includes(mId)) {
      if (mId === 'u-1') return; // Cannot remove yourself from group creation
      setNewGroupMembers((prev) => prev.filter((id) => id !== mId));
    } else {
      setNewGroupMembers((prev) => [...prev, mId]);
    }
  };

  const handleToggleParticipant = (mId: string) => {
    if (expParticipants.includes(mId)) {
      setExpParticipants((prev) => prev.filter((id) => id !== mId));
      const copy = { ...expSplits };
      delete copy[mId];
      setExpSplits(copy);
    } else {
      setExpParticipants((prev) => [...prev, mId]);
      setExpSplits((prev) => ({ ...prev, [mId]: 0 }));
    }
  };

  const handleSplitValueChange = (mId: string, val: number) => {
    setExpSplits((prev) => ({ ...prev, [mId]: val }));
  };

  // Group Details View
  if (activeGroup) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Block */}
        <div className="card glass flex-between" style={{ padding: '20px 24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setSelectedGroupId(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Groups <ChevronRight size={14} />
              </button>
              <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>
                {activeGroup.category}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', marginTop: '4px' }}>
              {activeGroup.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
              {activeGroup.description || 'No description provided.'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setActiveTab('settlements')}>
              Balances
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddExpenseOpen(true)}>
              Add Expense
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            gap: '24px',
            padding: '0 8px',
          }}
        >
          {(['expenses', 'settlements', 'members', 'files'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 'none',
                background: 'none',
                padding: '12px 4px',
                color: activeTab === tab ? 'var(--color-blue)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--color-blue)' : '2px solid transparent',
                fontSize: '0.9rem',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab View Contents */}
        <div className="animate-fade-in">
          
          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeGroup.expenses.length === 0 ? (
                <div className="card glass flex-center" style={{ padding: '60px 20px', flexDirection: 'column', gap: '12px' }}>
                  <CreditCard size={40} style={{ color: 'var(--text-tertiary)', strokeWidth: 1.2 }} />
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ fontWeight: 600 }}>No Expenses Logged</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Log group travel fares, rents, or dinners to begin split calculations.
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAddExpenseOpen(true)}>
                    Add First Expense
                  </button>
                </div>
              ) : (
                activeGroup.expenses.slice().reverse().map((expense) => (
                  <div key={expense.id} className="card glass flex-between" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {expense.category === 'Food' ? '🍔' : expense.category === 'Rent' ? '🏠' : expense.category === 'Transport' ? '🚗' : '💸'}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{expense.title}</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>Paid by <b>{getMemberName(expense.paidById)}</b></span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {expense.date}
                          </span>
                          <span>•</span>
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px', textTransform: 'uppercase' }}>
                            {expense.splitType} split
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>${expense.amount.toFixed(2)}</span>
                        {/* Calculate your share */}
                        {(() => {
                          const isInvolved = expense.participants.includes('u-1');
                          if (!isInvolved) return <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Not involved</span>;
                          
                          let share = 0;
                          if (expense.splitType === 'equal') {
                            share = expense.amount / expense.participants.length;
                          } else if (expense.splitType === 'custom') {
                            share = expense.splits['u-1'] || 0;
                          } else if (expense.splitType === 'percentage') {
                            share = ((expense.splits['u-1'] || 0) / 100) * expense.amount;
                          } else if (expense.splitType === 'shares') {
                            const total = expense.participants.reduce((s, id) => s + (expense.splits[id] || 0), 0);
                            share = total > 0 ? ((expense.splits['u-1'] || 0) / total) * expense.amount : 0;
                          }

                          const isPayer = expense.paidById === 'u-1';
                          const netVal = isPayer ? expense.amount - share : -share;

                          return (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: netVal >= 0 ? 'var(--color-blue)' : 'var(--color-red)' }}>
                              {netVal >= 0 ? `You lent $${netVal.toFixed(2)}` : `You owe $${Math.abs(netVal).toFixed(2)}`}
                            </span>
                          );
                        })()}
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px', color: 'var(--color-red)' }}
                        onClick={() => {
                          if (confirm('Delete this expense?')) deleteExpense(activeGroup.id, expense.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settlements Tab */}
          {activeTab === 'settlements' && (
            <div className="grid-2">
              {/* Member Net Balances */}
              <div className="card glass">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
                  Balances
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeGroup.members.map((member) => {
                    const bal = balances[member.id] || 0;
                    return (
                      <div
                        key={member.id}
                        className="flex-between"
                        style={{
                          padding: '12px 14px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                            {member.name.charAt(0)}
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: member.id === 'u-1' ? 600 : 400 }}>
                            {member.name} {member.id === 'u-1' ? '(You)' : ''}
                          </span>
                        </div>
                        
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: bal > 0.01 ? 'var(--color-blue)' : bal < -0.01 ? 'var(--color-red)' : 'var(--text-tertiary)' }}>
                          {bal > 0.01 ? `+$${bal.toFixed(2)}` : bal < -0.01 ? `-$${Math.abs(bal).toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simplified Debt Transactions */}
              <div className="card glass">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
                  Settle Up Plan
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {simplifiedTransactions.length === 0 ? (
                    <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={32} style={{ color: 'var(--color-blue)', marginBottom: '8px' }} />
                      <div>Group balances are completely settled!</div>
                    </div>
                  ) : (
                    simplifiedTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex-between"
                        style={{
                          padding: '12px 14px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          <span>
                            <b>{getMemberName(tx.fromId)}</b> pays <b>{getMemberName(tx.toId)}</b>
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            Minimizing total transactions
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            ${tx.amount.toFixed(2)}
                          </span>
                          
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '6px 12px' }}
                            onClick={() => triggerSettleModal(tx.fromId, tx.toId, tx.amount)}
                          >
                            Record Pay
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="grid-2">
              <div className="card glass">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
                  Members ({activeGroup.members.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex-between"
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                          {member.name.charAt(0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{member.email || 'No email registered'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Member Card */}
              <div className="card glass">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
                  Add Contact to Group
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Search and add contacts to split bills with.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 12px', backgroundColor: 'var(--bg-primary)' }}>
                    <Search size={16} style={{ color: 'var(--text-secondary)', alignSelf: 'center' }} />
                    <input
                      type="text"
                      placeholder="Type name to search contacts..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      style={{ border: 'none', padding: 0 }}
                    />
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {members
                      .filter((m) => !activeGroup.members.some((am) => am.id === m.id))
                      .filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                      .map((member) => (
                        <div
                          key={member.id}
                          className="flex-between"
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span style={{ fontSize: '0.85rem' }}>{member.name}</span>
                          <button
                            onClick={() => {
                              addMemberToGroup(activeGroup.id, member.id);
                              setMemberSearch('');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px' }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Files / Receipts Tab */}
          {activeTab === 'files' && (
            <div className="grid-2">
              <div className="card glass">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
                  Group Files & Bills
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeGroup.files.length === 0 ? (
                    <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                      <Image size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                      <div>No files attached. Upload receipt invoices below!</div>
                    </div>
                  ) : (
                    activeGroup.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex-between"
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} style={{ color: 'var(--color-blue)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{file.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                              Uploaded by {file.uploadedBy} on {file.date}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{file.size}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upload Mock Card */}
              <div className="card glass">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
                  Upload Attachment
                </h3>
                <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label>File / Receipt Name</label>
                    <input
                      type="text"
                      placeholder="e.g. food_bill_invoice.jpg"
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Upload size={16} /> Mock Upload File
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add Expense */}
        <Modal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          title="Log Expense"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsAddExpenseOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddExpenseSubmit}>
                Add Expense
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2">
              <div>
                <label>Title</label>
                <input
                  type="text"
                  placeholder="e.g. Airbnb, Dinner"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label>Paid By</label>
                <select value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)}>
                  {activeGroup.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name === 'Aadi (You)' ? 'Aadi (You)' : m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label>Category</label>
                <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                  <option value="Food">Food</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Transport">Transport</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Rent">Rent</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label>Split Type</label>
                <select
                  value={expSplitType}
                  onChange={(e) => {
                    setExpSplitType(e.target.value as SplitType);
                    setExpSplits({});
                  }}
                >
                  <option value="equal">Equal Split</option>
                  <option value="custom">Custom Split ($)</option>
                  <option value="percentage">Percentage Split (%)</option>
                  <option value="shares">Shares Split</option>
                </select>
              </div>
            </div>

            {/* Split Type Render Fields */}
            <div>
              <label>Participants / Split Details</label>
              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {activeGroup.members.map((member) => {
                  const isChecked = expParticipants.includes(member.id);
                  return (
                    <div key={member.id} className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleParticipant(member.id)}
                          style={{ width: 'auto', cursor: 'pointer' }}
                        />
                        <span>{member.name}</span>
                      </div>

                      {isChecked && expSplitType !== 'equal' && (
                        <div style={{ width: '100px' }}>
                          <input
                            type="number"
                            step={expSplitType === 'custom' ? '0.01' : '1'}
                            style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}
                            placeholder={
                              expSplitType === 'custom' ? '$0' : expSplitType === 'percentage' ? '0%' : '1 share'
                            }
                            value={expSplits[member.id] || ''}
                            onChange={(e) =>
                              handleSplitValueChange(member.id, parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Split Indicators */}
              {expSplitType === 'custom' && (
                <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  Sum of splits: ${Object.values(expSplits).reduce((a, b) => a + b, 0).toFixed(2)} / ${expAmount.toFixed(2)}
                </div>
              )}
              {expSplitType === 'percentage' && (
                <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  Sum of percentages: {Object.values(expSplits).reduce((a, b) => a + b, 0).toFixed(1)}% / 100%
                </div>
              )}
            </div>

            <div>
              <label>Notes</label>
              <textarea
                rows={2}
                placeholder="Details of expense..."
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
              />
            </div>
          </div>
        </Modal>

        {/* Modal: Settle Up (Record payment) */}
        <Modal
          isOpen={isSettleUpOpen}
          onClose={() => setIsSettleUpOpen(false)}
          title="Record Settlement Payment"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsSettleUpOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSettleUpSubmit}>
                Complete Settlement
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2">
              <div>
                <label>From Debtor</label>
                <select value={settleFromId} onChange={(e) => setSettleFromId(e.target.value)} disabled>
                  {activeGroup.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>To Creditor</label>
                <select value={settleToId} onChange={(e) => setSettleToId(e.target.value)} disabled>
                  {activeGroup.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label>Settlement Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <label>Notes / Receipt Reference</label>
              <input
                type="text"
                placeholder="e.g. Paid via GPay, Cash, Bank Transfer"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Groups Directory View (Default when selectedGroupId === null)
  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="flex-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
            Groups
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Organize trips, family bills, flats, and office team lunch splits.
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={() => setIsCreateGroupOpen(true)}>
          Create Group
        </button>
      </div>

      {/* Search & Stats Filter */}
      <div className="card glass flex-between" style={{ padding: '12px 16px', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 12px', backgroundColor: 'var(--bg-primary)', flexGrow: 1 }}>
          <Search size={16} style={{ color: 'var(--text-secondary)', alignSelf: 'center' }} />
          <input
            type="text"
            placeholder="Search group name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', padding: 0 }}
          />
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid-3">
        {filteredGroups.length === 0 ? (
          <div style={{ gridColumn: 'span 3', padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No groups match your search filter. Click "Create Group" to add a new project.
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.id}
              className="card glass hover-card animate-fade-in"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => setSelectedGroupId(group.id)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <div className="flex-between">
                <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>
                  {group.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {group.createdAt}
                </span>
              </div>

              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem' }}>
                  {group.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {group.description || 'No description added yet.'}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px',
                  marginTop: 'auto',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>{group.members.length} members</span>
                <span>{group.expenses.length} expenses</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create Group */}
      <Modal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        title="Create New Group"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsCreateGroupOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateGroup}>
              Create Group
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label>Group Name</label>
            <input
              type="text"
              placeholder="e.g. Goa Trip, Roommates, Office Coffee"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
          </div>

          <div className="grid-2">
            <div>
              <label>Category</label>
              <select
                value={newGroupCat}
                onChange={(e) => setNewGroupCat(e.target.value as Group['category'])}
              >
                <option value="trip">Trip</option>
                <option value="home">Home / Flatmates</option>
                <option value="office">Office Team</option>
                <option value="family">Family</option>
                <option value="college">College Friends</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label>Description</label>
              <input
                type="text"
                placeholder="Brief purpose description"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label>Select Members</label>
            <div
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
                backgroundColor: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {members.map((member) => (
                <div key={member.id} className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={newGroupMembers.includes(member.id)}
                      onChange={() => handleToggleMember(member.id)}
                      disabled={member.id === 'u-1'} // cannot remove yourself
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <span>{member.name} {member.id === 'u-1' ? '(You)' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
