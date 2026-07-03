import React, { useState, useMemo } from 'react';
import { Calendar, ShieldAlert, ArrowUpRight, ArrowDownLeft, Trash } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/Modal';

interface BorrowLendViewProps {
  triggerAction: string | null;
  clearTriggerAction: () => void;
}

export const BorrowLendView: React.FC<BorrowLendViewProps> = ({ triggerAction, clearTriggerAction }) => {
  const {
    borrowLends,
    members,
    addBorrowLend,
    toggleBorrowLendStatus,
    deleteBorrowLend,
    addMember,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [type, setType] = useState<'lend' | 'borrow'>('lend');
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Inline member creation state
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');

  // Handle direct trigger from command palette
  React.useEffect(() => {
    if (triggerAction === 'create-borrowlend') {
      setIsAddOpen(true);
      clearTriggerAction();
    }
  }, [triggerAction]);

  // Aggregate stats
  const totals = useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    borrowLends.forEach((bl) => {
      if (!bl.isCompleted) {
        if (bl.type === 'lend') lent += bl.amount;
        else borrowed += bl.amount;
      }
    });
    return { lent, borrowed };
  }, [borrowLends]);

  // Filter based on active or historical
  const filteredList = useMemo(() => {
    return borrowLends.filter((bl) => (activeTab === 'active' ? !bl.isCompleted : bl.isCompleted));
  }, [borrowLends, activeTab]);

  const handleAddNewPerson = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const newM = addMember(newPersonName, newPersonEmail || undefined);
    setPersonId(newM.id);
    setIsAddingNewPerson(false);
    setNewPersonName('');
    setNewPersonEmail('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || amount <= 0 || !description.trim()) return;

    addBorrowLend({
      type,
      personId,
      amount,
      description,
      date,
      dueDate: dueDate || undefined,
      isCompleted: false,
      notes: notes || undefined,
    });

    // Reset
    setPersonId('');
    setAmount(0);
    setDescription('');
    setDueDate('');
    setNotes('');
    setIsAddOpen(false);
  };

  const getPersonName = (id: string) => {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="flex-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
            Borrow & Lend
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Track personal loans with friends and family separately from group splits.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          Record Loan
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid-2">
        <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--color-blue)' }}>
          <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--color-blue-light)', color: 'var(--color-blue)' }}>
            <ArrowUpRight size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Money Lent</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, marginTop: '2px' }}>
              ${totals.lent.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--color-red)' }}>
          <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--color-red-light)', color: 'var(--color-red)' }}>
            <ArrowDownLeft size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Money Borrowed</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, marginTop: '2px' }}>
              ${totals.borrowed.toFixed(2)}
            </h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          gap: '24px',
          padding: '0 8px',
        }}
      >
        <button
          onClick={() => setActiveTab('active')}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 4px',
            color: activeTab === 'active' ? 'var(--color-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'active' ? '2px solid var(--color-blue)' : '2px solid transparent',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'active' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          Active Debts ({borrowLends.filter((bl) => !bl.isCompleted).length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 4px',
            color: activeTab === 'history' ? 'var(--color-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'history' ? '2px solid var(--color-blue)' : '2px solid transparent',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'history' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          Completed History
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
        {filteredList.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '60px 20px', flexDirection: 'column', gap: '12px' }}>
            <ShieldAlert size={36} style={{ color: 'var(--text-tertiary)', strokeWidth: 1.2 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {activeTab === 'active' ? 'No active peer-to-peer loans logged.' : 'No completed history.'}
            </span>
          </div>
        ) : (
          filteredList.map((bl) => {
            const isLend = bl.type === 'lend';
            const personName = getPersonName(bl.personId);
            return (
              <div key={bl.id} className="card glass flex-between" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isLend ? 'var(--color-blue-light)' : 'var(--color-red-light)',
                      color: isLend ? 'var(--color-blue)' : 'var(--color-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    {personName.charAt(0)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{bl.description}</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>
                        {isLend ? `Lent to ${personName}` : `Borrowed from ${personName}`}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {bl.date}
                      </span>
                      {bl.dueDate && !bl.isCompleted && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--color-orange)', fontWeight: 500 }}>
                            Due by {bl.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isLend ? 'var(--color-blue)' : 'var(--color-red)' }}>
                    {isLend ? '+' : '-'}${bl.amount.toFixed(2)}
                  </span>
                  
                  {activeTab === 'active' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px' }}
                      onClick={() => toggleBorrowLendStatus(bl.id)}
                    >
                      Settle
                    </button>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px', color: 'var(--color-red)' }}
                    onClick={() => {
                      if (confirm('Delete this record?')) deleteBorrowLend(bl.id);
                    }}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Borrow/Lend Record */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Personal Loan"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Log Record
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label>Transaction Type</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn"
                style={{
                  flexGrow: 1,
                  backgroundColor: type === 'lend' ? 'var(--color-blue)' : 'var(--bg-tertiary)',
                  color: type === 'lend' ? 'white' : 'var(--text-primary)',
                  borderColor: type === 'lend' ? 'transparent' : 'var(--border-color)',
                }}
                onClick={() => setType('lend')}
              >
                I Lent Money (They owe me)
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flexGrow: 1,
                  backgroundColor: type === 'borrow' ? 'var(--color-red)' : 'var(--bg-tertiary)',
                  color: type === 'borrow' ? 'white' : 'var(--text-primary)',
                  borderColor: type === 'borrow' ? 'transparent' : 'var(--border-color)',
                }}
                onClick={() => setType('borrow')}
              >
                I Borrowed Money (I owe them)
              </button>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Person / Contact</label>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-blue)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  marginBottom: '6px',
                }}
                onClick={() => setIsAddingNewPerson(!isAddingNewPerson)}
              >
                {isAddingNewPerson ? 'Select Existing' : 'Add New Contact'}
              </button>
            </div>

            {isAddingNewPerson ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                }}
              >
                <input
                  type="text"
                  placeholder="Person Name (Required)"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                />
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddNewPerson}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Create Contact
                </button>
              </div>
            ) : (
              <select value={personId} onChange={(e) => setPersonId(e.target.value)} required>
                <option value="">Select Person...</option>
                {members
                  .filter((m) => m.id !== 'u-1')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="grid-2">
            <div>
              <label>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <label>Description</label>
              <input
                type="text"
                placeholder="e.g. Lunch, Concert tickets"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label>Due Date (Optional)</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label>Notes</label>
            <textarea
              rows={2}
              placeholder="Additional comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
