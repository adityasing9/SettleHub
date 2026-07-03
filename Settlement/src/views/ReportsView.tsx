import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Printer, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateBalances, simplifyDebts } from '../utils/settlementEngine';

export const ReportsView: React.FC = () => {
  const { groups, members } = useApp();
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Find active group
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Balances calculation for printing
  const groupBalances = useMemo(() => {
    if (!activeGroup) return {};
    return calculateBalances(activeGroup.members, activeGroup.expenses, activeGroup.settlements);
  }, [activeGroup]);

  // Simplified debts for printing
  const groupSettlementsPlan = useMemo(() => {
    return simplifyDebts(groupBalances);
  }, [groupBalances]);

  // Pre-select first group if available
  React.useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const handleExportCSV = () => {
    if (!activeGroup) return;

    // Build CSV Content
    let csv = `SettleHub Audit Export - ${activeGroup.name}\n`;
    csv += `Category,${activeGroup.category}\n`;
    csv += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

    // 1. Members Net Positions
    csv += `MEMBERS SUMMARY\n`;
    csv += `Name,Email,Net Position\n`;
    activeGroup.members.forEach((m) => {
      const bal = groupBalances[m.id] || 0;
      const status = bal > 0.01 ? `Owed $${bal.toFixed(2)}` : bal < -0.01 ? `Owes $${Math.abs(bal).toFixed(2)}` : 'Settled';
      csv += `"${m.name}","${m.email || 'N/A'}","${status}"\n`;
    });
    csv += `\n`;

    // 2. Settlement Plan
    csv += `PROPOSED SETTLEMENT PATHWAYS\n`;
    csv += `From Debtor,To Creditor,Amount\n`;
    groupSettlementsPlan.forEach((s) => {
      const fromName = members.find((m) => m.id === s.fromId)?.name || 'Unknown';
      const toName = members.find((m) => m.id === s.toId)?.name || 'Unknown';
      csv += `"${fromName}","${toName}",$${s.amount.toFixed(2)}\n`;
    });
    csv += `\n`;

    // 3. Expenses List
    csv += `DETAILED EXPENSE SHEET\n`;
    csv += `Date,Title,Paid By,Split Type,Total Amount\n`;
    activeGroup.expenses.forEach((e) => {
      const payerName = members.find((m) => m.id === e.paidById)?.name || 'Unknown';
      csv += `"${e.date}","${e.title}","${payerName}","${e.splitType}",$${e.amount.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SettleHub_${activeGroup.name.replace(/\s+/g, '_')}_Audit.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const getMemberName = (id: string) => {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
      <div className="flex-between header-no-print">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
            Reports
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Generate and export CSV logs, print group bill checklists, and audit ledger balances.
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card glass flex-center header-no-print" style={{ padding: '80px 20px', flexDirection: 'column', gap: '12px' }}>
          <FileText size={48} style={{ color: 'var(--text-tertiary)', strokeWidth: 1.2 }} />
          <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Groups to Report</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: '280px', textAlign: 'center' }}>
            Create a group and add expenses to compile summaries and audit files.
          </p>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div className="card glass grid-3 header-no-print" style={{ padding: '16px 20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ margin: 0 }}>Select Active Group</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                style={{ width: '100%' }}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-outline" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={16} /> Export Excel CSV
              </button>
              <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} /> Print PDF Report
              </button>
            </div>
          </div>

          {/* Printable Report Preview */}
          {activeGroup && (
            <div className="card glass print-area animate-fade-in" style={{ padding: '40px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              
              {/* Report Title Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '24px', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    <span>🤝</span> SettleHub Report Statement
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>
                    Automated debt calculation audit statement.
                  </p>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <h3>Group: {activeGroup.name}</h3>
                  <span style={{ display: 'block', marginTop: '4px' }}>Category: {activeGroup.category}</span>
                  <span style={{ display: 'block', marginTop: '2px' }}>Date Generated: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Members Ledger balances */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Members Net Balances
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {activeGroup.members.map((member) => {
                    const bal = groupBalances[member.id] || 0;
                    return (
                      <div
                        key={member.id}
                        style={{
                          padding: '12px',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-primary)',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {member.name}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            marginTop: '4px',
                            color: bal > 0.01 ? 'var(--color-blue)' : bal < -0.01 ? 'var(--color-red)' : 'var(--text-tertiary)'
                          }}
                        >
                          {bal > 0.01 ? `+$${bal.toFixed(2)}` : bal < -0.01 ? `-$${Math.abs(bal).toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Settle Pathways */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Proposed Settlements
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupSettlementsPlan.length === 0 ? (
                    <div style={{ padding: '12px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                      Group balances are completely settled. No payments required.
                    </div>
                  ) : (
                    groupSettlementsPlan.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span>
                          <b>{getMemberName(s.fromId)}</b> pays <b>{getMemberName(s.toId)}</b>
                        </span>
                        <span style={{ fontWeight: 700 }}>${s.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Detailed Expense log */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Detailed Expense log
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '10px', fontWeight: 600 }}>Expense Title</th>
                      <th style={{ padding: '10px', fontWeight: 600 }}>Paid By</th>
                      <th style={{ padding: '10px', fontWeight: 600 }}>Split Type</th>
                      <th style={{ padding: '10px', fontWeight: 600, textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          No expenses logged in this group.
                        </td>
                      </tr>
                    ) : (
                      activeGroup.expenses.map((e) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{e.date}</td>
                          <td style={{ padding: '10px', fontWeight: 500 }}>{e.title}</td>
                          <td style={{ padding: '10px' }}>{getMemberName(e.paidById)}</td>
                          <td style={{ padding: '10px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{e.splitType}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>${e.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Report Footer */}
              <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                Generated automatically by SettleHub debt resolution engine. Safe, accurate, and offline-secure.
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @media print {
          .header-no-print {
            display: none !important;
          }
          .print-area {
            border: none !important;
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          body {
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
};
