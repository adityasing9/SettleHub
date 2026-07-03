import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Mail, FileDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateBalances, simplifyDebts } from '../utils/settlementEngine';

interface LedgerViewProps {
  triggerAction: string | null;
  clearTriggerAction: () => void;
}

interface LedgerLine {
  id: string;
  date: string;
  description: string;
  source: 'group' | 'personal' | 'settlement';
  sourceName: string;
  debit: number;  // increases what they owe you (you paid / lent)
  credit: number; // decreases what they owe you (they paid / settled)
}

export const LedgerView: React.FC<LedgerViewProps> = ({ triggerAction, clearTriggerAction }) => {
  const { members, groups, borrowLends } = useApp();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Handle trigger from sidebar/command palette
  useEffect(() => {
    if (triggerAction?.startsWith('select-member-')) {
      const mId = triggerAction.replace('select-member-', '');
      setSelectedPersonId(mId);
      clearTriggerAction();
    }
  }, [triggerAction]);

  // 1. Calculate net balance with every member across all activities
  const memberBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Initialize all to 0
    members.forEach((m) => {
      if (m.id !== 'u-1') balances[m.id] = 0;
    });

    // Extract from Group settlements and expenses
    groups.forEach((g) => {
      const grpBalances = calculateBalances(g.members, g.expenses, g.settlements);
      const simplified = simplifyDebts(grpBalances);
      
      simplified.forEach((tx) => {
        if (tx.fromId === 'u-1' && balances[tx.toId] !== undefined) {
          // You owe them (negative balance)
          balances[tx.toId] -= tx.amount;
        } else if (tx.toId === 'u-1' && balances[tx.fromId] !== undefined) {
          // They owe you (positive balance)
          balances[tx.fromId] += tx.amount;
        }
      });
    });

    // Extract from personal borrow/lends
    borrowLends.forEach((bl) => {
      if (!bl.isCompleted && balances[bl.personId] !== undefined) {
        if (bl.type === 'lend') {
          balances[bl.personId] += bl.amount;
        } else {
          balances[bl.personId] -= bl.amount;
        }
      }
    });

    return balances;
  }, [members, groups, borrowLends]);

  // 2. Generate detailed statement lines for the selected person
  const ledgerStatement = useMemo(() => {
    if (!selectedPersonId) return [];

    const lines: LedgerLine[] = [];

    // A. Parse Group Expenses
    groups.forEach((g) => {
      // Check if both current user and selected user are members of this group
      const hasMe = g.members.some((m) => m.id === 'u-1');
      const hasThem = g.members.some((m) => m.id === selectedPersonId);
      if (!hasMe || !hasThem) return;

      g.expenses.forEach((e) => {
        // Did you pay for their share?
        const theyInvolved = e.participants.includes(selectedPersonId);
        const meInvolved = e.participants.includes('u-1');
        
        let theirShare = 0;
        let myShare = 0;

        if (e.splitType === 'equal') {
          theirShare = theyInvolved ? e.amount / e.participants.length : 0;
          myShare = meInvolved ? e.amount / e.participants.length : 0;
        } else {
          theirShare = theyInvolved ? (e.splits[selectedPersonId] || 0) : 0;
          myShare = meInvolved ? (e.splits['u-1'] || 0) : 0;
          
          if (e.splitType === 'percentage') {
            theirShare = (theirShare / 100) * e.amount;
            myShare = (myShare / 100) * e.amount;
          } else if (e.splitType === 'shares') {
            const totalShares = e.participants.reduce((sum, pid) => sum + (e.splits[pid] || 0), 0);
            theirShare = totalShares > 0 ? (theirShare / totalShares) * e.amount : 0;
            myShare = totalShares > 0 ? (myShare / totalShares) * e.amount : 0;
          }
        }

        // Case 1: You paid and they participated
        if (e.paidById === 'u-1' && theyInvolved && selectedPersonId !== 'u-1') {
          lines.push({
            id: `e-${e.id}`,
            date: e.date,
            description: `${e.title} (Their share)`,
            source: 'group',
            sourceName: g.name,
            debit: theirShare,
            credit: 0,
          });
        }
        // Case 2: They paid and you participated
        else if (e.paidById === selectedPersonId && meInvolved) {
          lines.push({
            id: `e-${e.id}`,
            date: e.date,
            description: `${e.title} (Your share)`,
            source: 'group',
            sourceName: g.name,
            debit: 0,
            credit: myShare,
          });
        }
      });

      // B. Parse Group Settlements
      g.settlements.forEach((s) => {
        if (!s.isCompleted) return;
        // Case 1: You paid them
        if (s.fromId === 'u-1' && s.toId === selectedPersonId) {
          lines.push({
            id: `s-${s.id}`,
            date: s.date,
            description: s.notes || 'Settlement Payment',
            source: 'settlement',
            sourceName: g.name,
            debit: s.amount,
            credit: 0,
          });
        }
        // Case 2: They paid you
        else if (s.fromId === selectedPersonId && s.toId === 'u-1') {
          lines.push({
            id: `s-${s.id}`,
            date: s.date,
            description: s.notes || 'Received Payment',
            source: 'settlement',
            sourceName: g.name,
            debit: 0,
            credit: s.amount,
          });
        }
      });
    });

    // C. Parse Personal Borrow & Lends
    borrowLends.forEach((bl) => {
      if (bl.personId !== selectedPersonId) return;

      const isLend = bl.type === 'lend';
      if (bl.isCompleted) {
        // Completed loans have two lines: the loan and the settlement
        lines.push({
          id: `pl-${bl.id}`,
          date: bl.date,
          description: bl.description,
          source: 'personal',
          sourceName: 'Personal Ledger',
          debit: isLend ? bl.amount : 0,
          credit: isLend ? 0 : bl.amount,
        });
        lines.push({
          id: `pl-settle-${bl.id}`,
          date: bl.date, // settled date mock
          description: `Settled: ${bl.description}`,
          source: 'settlement',
          sourceName: 'Personal Ledger',
          debit: isLend ? 0 : bl.amount,
          credit: isLend ? bl.amount : 0,
        });
      } else {
        // Active loans
        lines.push({
          id: `pl-${bl.id}`,
          date: bl.date,
          description: bl.description,
          source: 'personal',
          sourceName: 'Personal Ledger',
          debit: isLend ? bl.amount : 0,
          credit: isLend ? 0 : bl.amount,
        });
      }
    });

    // Sort chronologically
    return lines.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedPersonId, groups, borrowLends]);

  // Cumulative balances calculation
  const statementWithRunningBalance = useMemo(() => {
    let running = 0;
    return ledgerStatement.map((line) => {
      running += line.debit - line.credit;
      return {
        ...line,
        runningBalance: running,
      };
    });
  }, [ledgerStatement]);

  const selectedPerson = useMemo(() => {
    return members.find((m) => m.id === selectedPersonId) || null;
  }, [members, selectedPersonId]);

  const handleExportStatement = () => {
    if (!selectedPerson) return;
    const headers = 'Date,Description,Source,Debit (+),Credit (-),Balance\n';
    const csvContent = statementWithRunningBalance
      .map(
        (l) =>
          `"${l.date}","${l.description}","${l.sourceName}",${l.debit.toFixed(2)},${l.credit.toFixed(2)},${l.runningBalance.toFixed(2)}`
      )
      .join('\n');
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPerson.name.replace(/\s+/g, '_')}_ledger_statement.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Ledger detail view
  if (selectedPersonId && selectedPerson) {
    const netTotal = memberBalances[selectedPersonId] || 0;
    
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header toolbar */}
        <div className="flex-between">
          <button
            onClick={() => setSelectedPersonId(null)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to Contacts
          </button>
          
          <button
            onClick={handleExportStatement}
            className="btn btn-outline btn-sm"
            disabled={statementWithRunningBalance.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileDown size={16} /> Export Statement CSV
          </button>
        </div>

        {/* Profile Card & Aggregated balance */}
        <div className="card glass grid-2" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-blue-light)',
                color: 'var(--color-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
              }}
            >
              {selectedPerson.name.charAt(0)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
                {selectedPerson.name}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={12} /> {selectedPerson.email || 'No email registered'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: '24px',
            }}
            className="ledger-balance-block"
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Net Position</span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: netTotal > 0.01 ? 'var(--color-blue)' : netTotal < -0.01 ? 'var(--color-red)' : 'var(--text-tertiary)',
                marginTop: '4px',
              }}
            >
              {netTotal > 0.01 ? `They owe you $${netTotal.toFixed(2)}` : netTotal < -0.01 ? `You owe them $${Math.abs(netTotal).toFixed(2)}` : '$0.00'}
            </h1>
          </div>
        </div>

        {/* Double-entry statement ledger table */}
        <div className="card glass" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>Account Statement</h3>
            <span className="badge badge-blue">Double-Entry Ledger</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Source Group</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Debit (+)</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Credit (-)</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {statementWithRunningBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No transactions recorded between you and {selectedPerson.name} yet.
                    </td>
                  </tr>
                ) : (
                  statementWithRunningBalance.map((line, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{line.date}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 500 }}>{line.description}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{line.sourceName}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', color: line.debit > 0 ? 'var(--color-blue)' : 'var(--text-tertiary)' }}>
                        {line.debit > 0 ? `+$${line.debit.toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', color: line.credit > 0 ? 'var(--color-red)' : 'var(--text-tertiary)' }}>
                        {line.credit > 0 ? `-$${line.credit.toFixed(2)}` : '-'}
                      </td>
                      <td
                        style={{
                          padding: '12px 20px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: line.runningBalance > 0.01 ? 'var(--color-blue)' : line.runningBalance < -0.01 ? 'var(--color-red)' : 'var(--text-tertiary)'
                        }}
                      >
                        ${line.runningBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <style>{`
          @media (max-width: 600px) {
            .ledger-balance-block {
              border-left: none !important;
              padding-left: 0 !important;
              align-items: flex-start !important;
              margin-top: 16px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Grid list of contacts
  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
          Personal Ledger Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Select a contact to view a full double-entry bank-style statement of all shared expenses and loans.
        </p>
      </div>

      <div className="grid-3">
        {members
          .filter((m) => m.id !== 'u-1')
          .map((member) => {
            const bal = memberBalances[member.id] || 0;
            return (
              <div
                key={member.id}
                className="card glass animate-fade-in"
                onClick={() => setSelectedPersonId(member.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-blue)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--color-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{member.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{member.email || 'No email registered'}</span>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Net Status:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: bal > 0.01 ? 'var(--color-blue)' : bal < -0.01 ? 'var(--color-red)' : 'var(--text-tertiary)'
                    }}
                  >
                    {bal > 0.01 ? `Owes you $${bal.toFixed(0)}` : bal < -0.01 ? `You owe $${Math.abs(bal).toFixed(0)}` : 'Settled'}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
